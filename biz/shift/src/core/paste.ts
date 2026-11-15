// Excel からの貼り付けで、希望を読み取る。
// 行がスタッフ、列が日の表を受け取り、「休」「×」「希」などのマスを休み希望として読む。
// 読み取った結果（PastePreview）を画面で見せてから、applyWishPaste で取り込む（いきなり取り込まない）。
import { daysInMonth } from './dates'
import type { ShiftPlan, Wish } from './types'

/** 休み希望として読む文字（全角・半角、大文字・小文字は、そろえてから比べる） */
export const OFF_MARKS = ['休', '休み', '希', '希休', '希望', '希望休', '休希望', '休み希望', '×', '✕', '✖', '✗', 'x', 'バツ', '公', '公休', '有', '有休', '有給', '年休', 'off', 'ng', '不可']

/** 日として読めるマスがこの数以上あるのに、左から右へ増えていかない行は、「日付の並びがちがう表」とみなして断る */
const UNORDERED_DAYS = 10

/** 希望ではないものとして、だまって読み飛ばす文字（「出られる」の印や、線）。勤務の名前・記号と同じなら、勤務のほうを取る */
const IGNORE_MARKS = ['○', '◯', '〇', '◎', '出', '可', '-', 'ー', '―', '‐', '・']

export type PasteRow = {
  /** 貼り付けた表の、上から何行めか（1から） */
  line: number
  /** 読み取った名前。名前の列がない表なら空 */
  name: string
  /** 当てはまったスタッフの id。当てはまる人がいなければ null */
  staffId: string | null
  /** 読み取った希望 */
  wishes: Array<{ day: number; wish: Wish; text: string }>
  /** 読めなかったマス（取り込まない） */
  unknown: Array<{ day: number; text: string }>
}

/** 貼り付けた表の1行。line は上から何行めか（1から）。empty は、マスがすべて空の行 */
type SourceRow = { line: number; cells: string[]; empty: boolean }

export type PastePreview = {
  /** 取り込めるものが1つでもあるか */
  ok: boolean
  rows: PasteRow[]
  /** どう読んだかの説明（画面にそのまま出す） */
  notes: string[]
  /** 気をつけること（名前が当てはまらない行、読めなかったマス など） */
  problems: string[]
  /** 取り込む休み希望の数（スタッフが当てはまった行だけ） */
  offCount: number
  /** 取り込む「この勤務に入りたい」の数 */
  shiftCount: number
}

/** 全角と半角、前後の空白、大文字と小文字をそろえる */
function norm(text: string): string {
  return text.normalize('NFKC').trim().toLowerCase()
}
/** 名前を比べるための形（空白をすべて取る） */
function normName(text: string): string {
  return norm(text).replace(/\s+/g, '')
}

/**
 * 貼り付けた文字を、行とマスに分ける。空の行も、そのまま残す（行の番号と、行の並びを変えないため）。
 * Excel は、改行の入ったマスを "…" で囲んで渡してくる。
 */
function splitRows(text: string): string[][] {
  const src = text.replace(/\r\n?/g, '\n')
  const delimiter = src.includes('\t') ? '\t' : src.includes(',') ? ',' : null
  const rows: string[][] = []
  if (delimiter === null) {
    // 区切りがなければ、空白で分ける（メモ帳などから貼ったとき）
    for (const line of src.split('\n')) rows.push(line.split(/[ 　]+/).filter((c, i, a) => c !== '' || a.length === 1))
  } else {
    let row: string[] = []
    let cell = ''
    let quoted = false
    for (let i = 0; i < src.length; i++) {
      const ch = src[i]
      if (quoted) {
        if (ch === '"' && src[i + 1] === '"') {
          cell += '"'
          i++
        } else if (ch === '"') quoted = false
        else cell += ch
      } else if (ch === '"' && cell === '') quoted = true
      else if (ch === delimiter) {
        row.push(cell)
        cell = ''
      } else if (ch === '\n') {
        row.push(cell)
        rows.push(row)
        row = []
        cell = ''
      } else cell += ch
    }
    row.push(cell)
    rows.push(row)
  }
  return rows.map((r) => r.map((c) => c.trim()))
}

/** 貼り付けた文字を、行とマスに分ける。マスがすべて空の行は捨てる */
export function splitTable(text: string): string[][] {
  return splitRows(text).filter((r) => r.some((c) => c !== ''))
}

/** マスを日として読む。「1」「1日」「12/1」「12月1日」「2026/12/1」「1(火)」を受け付ける */
function readDay(cell: string): { day: number; month: number | null } | null {
  const t = norm(cell).replace(/\s+/g, '')
  // 曜日は、かっこ付きのときだけ読む（「12月」を「12日の月曜」と読みまちがえないため）
  let m = /^(\d{1,2})日?(?:[(（][日月火水木金土][)）])?$/.exec(t)
  if (m) {
    const day = Number(m[1])
    return day >= 1 && day <= 31 ? { day, month: null } : null
  }
  m = /^(?:\d{4}[/\-年])?(\d{1,2})[/\-月](\d{1,2})日?(?:[(（][日月火水木金土][)）])?$/.exec(t)
  if (m) {
    const month = Number(m[1])
    const day = Number(m[2])
    return month >= 1 && month <= 12 && day >= 1 && day <= 31 ? { day, month } : null
  }
  return null
}

function isWeekdayRow(row: string[]): boolean {
  const cells = row.map(norm).filter((c) => c !== '')
  if (cells.length < 3) return false
  return cells.filter((c) => /^[日月火水木金土](曜日?)?$/.test(c)).length >= cells.length * 0.6
}

/**
 * 貼り付けた文字を読んで、取り込む前の見本を作る。plan は書き換えない。
 */
export function parseWishPaste(text: string, plan: ShiftPlan): PastePreview {
  const total = daysInMonth(plan.year, plan.month)
  // 行の番号は、貼り付けた表の中の番号で持つ（空の行を捨てたあとの番号にすると、画面の「2行め」が、もとの表とずれる）
  const allRows: SourceRow[] = splitRows(text).map((cells, i) => ({ line: i + 1, cells, empty: cells.every((c) => c === '') }))
  // 日付の行と名前の列は、中身のある行だけでさがす
  const table = allRows.filter((r) => !r.empty)
  const notes: string[] = []
  const problems: string[] = []
  const empty: PastePreview = { ok: false, rows: [], notes, problems, offCount: 0, shiftCount: 0 }
  if (table.length === 0) {
    problems.push('貼り付けた内容が空です。Excel で、名前の列と日の列をふくむ範囲をコピーして、貼り付けてください。')
    return empty
  }

  // 同じ名前のスタッフが2人以上いるときは、どちらのことか決められない。勝手に片方へ入れず、画面で選んでもらう
  const idsByName = new Map<string, string[]>()
  for (const s of plan.staff) {
    const n = normName(s.name)
    if (n === '') continue
    const list = idsByName.get(n)
    if (list) list.push(s.id)
    else idsByName.set(n, [s.id])
  }
  const matchStaff = (name: string): string | null => {
    const n = normName(name)
    if (n === '') return null
    const exact = idsByName.get(n)
    if (exact) return exact.length === 1 ? exact[0] : null
    // 「青木」と「青木 花子」のように、片方がもう片方の頭に当たる人が1人だけなら、その人とみなす
    const near = plan.staff.filter((s) => {
      const sn = normName(s.name)
      return sn !== '' && (sn.startsWith(n) || n.startsWith(sn))
    })
    return near.length === 1 ? near[0].id : null
  }
  const shiftByMark = new Map<string, string>()
  for (const s of plan.shiftTypes) {
    if (s.name) shiftByMark.set(norm(s.name), s.id)
    if (s.symbol) shiftByMark.set(norm(s.symbol), s.id)
  }
  const offMarks = new Set(OFF_MARKS.map(norm))
  const ignoreMarks = new Set(IGNORE_MARKS.map(norm))

  // 日付の行をさがす（上の5行のうち、日として読めるマスが3つ以上、左から右へ増えていく行）
  let header: SourceRow | null = null
  let dayOfColumn = new Map<number, number>()
  let headerMonth: number | null = null
  /** 日付がたくさん並んでいるのに、左から右へ増えていかない行（16日はじまりの表など） */
  let unordered: { row: SourceRow; days: number[] } | null = null
  for (let r = 0; r < Math.min(5, table.length); r++) {
    const map = new Map<number, number>()
    let last = 0
    let month: number | null = null
    let increasing = true
    table[r].cells.forEach((cell, c) => {
      const d = readDay(cell)
      if (!d) return
      if (d.day <= last) increasing = false
      last = d.day
      map.set(c, d.day)
      if (d.month !== null) month = d.month
    })
    if (map.size >= 3 && increasing) {
      header = table[r]
      dayOfColumn = map
      headerMonth = month
      break
    }
    // 勤務の記号が数字の店では、数字のマスは希望かもしれないので、日付には数えない
    const dayLike = [...map.entries()].filter(([c]) => !shiftByMark.has(norm(table[r].cells[c])))
    if (!unordered && !increasing && dayLike.length >= UNORDERED_DAYS) unordered = { row: table[r], days: dayLike.map(([, d]) => d) }
  }
  if (!header && unordered) {
    // この道具は、1日〜末日の1か月を単位にしている。日付の並びがちがう表を「名前の右の列が1日」と読むと、
    // ちがう日に休み希望が入ってしまう。読まずに断る
    problems.push(
      `${unordered.row.line}行めに日付が並んでいますが、1日から順に並んでいません（${unordered.days.slice(0, 3).join('、')} … ${unordered.days[unordered.days.length - 1]}）。このままでは、どの列が何日かを決められないので、読み取りませんでした。列を1日〜末日の順に並べてから、貼り付けてください。`,
    )
    return empty
  }

  let nameColumn: number | null
  let dataRows: SourceRow[]
  if (header) {
    const headerLine = header.line
    const firstDayColumn = Math.min(...dayOfColumn.keys())
    dataRows = allRows.filter((r) => r.line > headerLine)
    // 名前の列は、日の列より左で、スタッフの名前にいちばん多く当たる列。どれも当たらなければ、いちばん左
    nameColumn = null
    if (firstDayColumn > 0) {
      let bestHits = -1
      for (let c = 0; c < firstDayColumn; c++) {
        const hits = dataRows.filter((r) => matchStaff(r.cells[c] ?? '') !== null).length
        if (hits > bestHits) {
          bestHits = hits
          nameColumn = c
        }
      }
    }
    notes.push(`${headerLine}行めを、日付の行として読みました（${Math.min(...dayOfColumn.values())}日〜${Math.max(...dayOfColumn.values())}日）。`)
    if (headerMonth !== null && headerMonth !== plan.month) {
      problems.push(`貼り付けた表は${headerMonth}月のものに見えます。いま開いているのは${plan.month}月です。月が合っているか、確かめてください。`)
    }
  } else {
    dataRows = allRows
    // 日付の行がないとき。いちばん左の列が名前かどうかは、スタッフの名前に当たるか、印でない文字が入っているかで決める
    const firstCells = table.map((r) => r.cells[0] ?? '')
    const looksLikeName = firstCells.some((c) => matchStaff(c) !== null) || firstCells.filter((c) => c !== '' && !offMarks.has(norm(c)) && !ignoreMarks.has(norm(c)) && !shiftByMark.has(norm(c))).length > firstCells.length / 2
    nameColumn = looksLikeName ? 0 : null
    const width = Math.max(...dataRows.map((r) => r.cells.length))
    const offset = nameColumn === null ? 0 : 1
    for (let c = offset; c < width; c++) dayOfColumn.set(c, c - offset + 1)
    notes.push(
      nameColumn === null
        ? '日付の行が見つからなかったので、いちばん左の列を1日として読みました。'
        : '日付の行が見つからなかったので、名前のすぐ右の列を1日として読みました。',
    )
  }
  if (nameColumn === null) {
    notes.push('名前の列が見つからなかったので、上の行から順に、スタッフの並びに当てはめました。')
    // 名前の列がないときは、行の並びだけが「だれの行か」の手がかりになる。
    // 希望が1つもない人の行（マスがすべて空の行）を捨てると、それより下の人の希望が、1人ずつ上の人にずれて入ってしまう。
    // だから、空の行も1人ぶんとして数える。数えないのは、前後にある「何も書いていない行」（改行だけの行）だけ
    // （Excel は最後に改行を1つ足して渡してくる。その行を1人ぶんに数えない）。
    const wide = table.some((r) => r.cells.length > 1)
    const blankLine = (r: SourceRow) => r.empty && (!wide || r.cells.length === 1)
    let from = 0
    let to = dataRows.length
    while (from < to && blankLine(dataRows[from])) from++
    while (to > from && blankLine(dataRows[to - 1])) to--
    dataRows = dataRows.slice(from, to)
  }

  const skippedDays = [...new Set([...dayOfColumn.values()].filter((d) => d > total))]
  if (skippedDays.length > 0) problems.push(`${plan.month}月は${total}日までなので、${skippedDays.join('日・')}日の列は読み飛ばしました。`)

  const rows: PasteRow[] = []
  /** 名前の列がない表で、希望のない1人ぶんとして数えた、空の行 */
  const emptyRows = new Set<PasteRow>()
  let staffCursor = 0
  for (const { line, cells, empty: emptyRow } of dataRows) {
    if (isWeekdayRow(cells)) continue
    const name = nameColumn === null ? '' : (cells[nameColumn] ?? '')
    let staffId: string | null
    if (nameColumn === null) {
      staffId = plan.staff[staffCursor]?.id ?? null
      staffCursor++
    } else {
      // 名前が空の行（合計の行、空の行など）は読まない
      if (name === '') continue
      staffId = matchStaff(name)
    }
    const row: PasteRow = { line, name, staffId, wishes: [], unknown: [] }
    for (const [c, day] of dayOfColumn) {
      if (day > total) continue
      const raw = cells[c] ?? ''
      const mark = norm(raw)
      if (mark === '') continue
      // 勤務の名前・記号を先に調べる（記号が「出」「○」の勤務を、読み飛ばす印とまちがえないため）
      const shiftId = shiftByMark.get(mark)
      if (shiftId) row.wishes.push({ day, wish: { kind: 'shift', shiftId }, text: raw })
      else if (offMarks.has(mark)) row.wishes.push({ day, wish: { kind: 'off' }, text: raw })
      else if (!ignoreMarks.has(mark)) row.unknown.push({ day, text: raw })
    }
    row.wishes.sort((a, b) => a.day - b.day)
    rows.push(row)
    if (nameColumn === null && emptyRow) emptyRows.add(row)
  }
  if (nameColumn === null) {
    // スタッフの人数より下にある空の行は、だれの行でもない（広めに選んでコピーしただけ）。だまって捨てる
    while (rows.length > 0 && rows[rows.length - 1].staffId === null && emptyRows.has(rows[rows.length - 1])) emptyRows.delete(rows.pop()!)
    const counted = rows.filter((r) => emptyRows.has(r) && r.staffId !== null)
    if (counted.length > 0) notes.push(`空の行（${counted.map((r) => r.line).join('・')}行め）は、希望のない人の行として数えました。`)
    if (rows.length > 0 && rows.length < plan.staff.length) {
      problems.push(`貼り付けた表は${rows.length}行で、スタッフは${plan.staff.length}人です。上から${rows.length}人に当てはめました。行と人がずれていないか、下の表で確かめてください。`)
    }
  }

  // 名前が当てはまらなかった行。同じ名前のスタッフが2人以上いて決められなかった行は、分けて知らせる
  const isSameName = (r: PasteRow) => nameColumn !== null && (idsByName.get(normName(r.name))?.length ?? 0) > 1
  const ambiguous = rows.filter((r) => r.staffId === null && isSameName(r))
  const unmatched = rows.filter((r) => r.staffId === null && !isSameName(r))
  if (ambiguous.length > 0) {
    problems.push(
      `同じ名前のスタッフが2人以上います（${[...new Set(ambiguous.map((r) => r.name))].join('、')}）。どの人のことか決められないので、下の表の「当てはめるスタッフ」で選んでください。選ばなければ、この行は取り込みません。`,
    )
  }
  if (unmatched.length > 0) {
    problems.push(
      nameColumn === null
        ? `スタッフの人数より行が多いので、下の${unmatched.length}行は取り込みません。`
        : `スタッフの名前に当てはまらない行が、${unmatched.length}行あります（${unmatched.map((r) => r.name).join('、')}）。この行は取り込みません。先に①でスタッフを足すか、名前をそろえてください。`,
    )
  }
  const seen = new Set<string>()
  for (const r of rows) {
    if (r.staffId === null) continue
    if (seen.has(r.staffId)) problems.push(`${r.name || `${r.line}行め`}が、同じスタッフに2回当てはまりました。両方の行の希望を取り込みます。`)
    seen.add(r.staffId)
  }
  const unknownCount = rows.reduce((n, r) => n + r.unknown.length, 0)
  if (unknownCount > 0) {
    const examples = [...new Set(rows.flatMap((r) => r.unknown.map((u) => u.text)))].slice(0, 5)
    problems.push(`読めなかったマスが、${unknownCount}個あります（例: ${examples.join('、')}）。このマスは取り込みません。`)
  }

  const matched = rows.filter((r) => r.staffId !== null)
  const offCount = matched.reduce((n, r) => n + r.wishes.filter((w) => w.wish.kind === 'off').length, 0)
  const shiftCount = matched.reduce((n, r) => n + r.wishes.filter((w) => w.wish.kind === 'shift').length, 0)
  if (offCount + shiftCount === 0) problems.push('取り込める希望が見つかりませんでした。休みの日のマスに「休」「×」「希」などが入っているか、確かめてください。')
  return { ok: offCount + shiftCount > 0, rows, notes, problems, offCount, shiftCount }
}

export type ApplyPasteOptions = {
  /**
   * merge = 貼り付けた日だけ書きかえる（ほかの日の希望は残す）。
   * replace = 貼り付けた表に出てきたスタッフの希望を、いったん全部消してから入れる。
   */
  mode?: 'merge' | 'replace'
  /** 名前が当てはまらなかった行を、画面で選んだスタッフに当てる。キーは行の番号（PasteRow.line）、値はスタッフの id */
  assign?: Record<number, string>
}

/** 読み取った希望を plan に取り込む。新しい plan を返す */
export function applyWishPaste(plan: ShiftPlan, preview: PastePreview, options: ApplyPasteOptions = {}): ShiftPlan {
  const mode = options.mode ?? 'merge'
  const staffIds = new Set(plan.staff.map((s) => s.id))
  const wishes: ShiftPlan['wishes'] = {}
  for (const [id, row] of Object.entries(plan.wishes)) wishes[id] = { ...row }
  const cleared = new Set<string>()
  for (const row of preview.rows) {
    const staffId = row.staffId ?? options.assign?.[row.line] ?? null
    if (staffId === null || !staffIds.has(staffId)) continue
    if (mode === 'replace' && !cleared.has(staffId)) {
      wishes[staffId] = {}
      cleared.add(staffId)
    }
    for (const w of row.wishes) (wishes[staffId] ??= {})[String(w.day)] = w.wish
  }
  for (const id of Object.keys(wishes)) if (Object.keys(wishes[id]).length === 0) delete wishes[id]
  return { ...plan, wishes }
}
