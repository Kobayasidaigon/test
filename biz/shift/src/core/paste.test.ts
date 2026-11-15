import { describe, expect, it } from 'vitest'
import { applyWishPaste, parseWishPaste, splitTable } from './paste'
import { tinyPlan } from './testkit'

const plan = tinyPlan() // 青木(st1)・石川(st2)・上田(st3)。2026年12月（31日）
const days = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => String(from + i)).join('\t')

describe('splitTable', () => {
  it('タブ区切りを、行とマスに分ける。Windows の改行（CRLF）でもよい', () => {
    expect(splitTable('a\tb\r\nc\td\r\n')).toEqual([['a', 'b'], ['c', 'd']])
  })
  it('空のマスを残す（列がずれないように）', () => {
    expect(splitTable('青木\t\t休\t')).toEqual([['青木', '', '休', '']])
  })
  it('引用符で囲まれた、改行やタブ入りのマスを1つのマスとして読む', () => {
    expect(splitTable('"青木\n花子"\t休\n石川\t"a""b"')).toEqual([['青木\n花子', '休'], ['石川', 'a"b']])
  })
  it('タブがなくカンマがあれば、カンマ区切りとして読む', () => {
    expect(splitTable('青木,休,\n石川,,×')).toEqual([['青木', '休', ''], ['石川', '', '×']])
  })
  it('空の行は捨てる', () => {
    expect(splitTable('\n\n青木\t休\n\t\t\n')).toEqual([['青木', '休']])
    expect(splitTable('')).toEqual([])
  })
})

describe('parseWishPaste: ふつうの表（1行めが日付、いちばん左が名前）', () => {
  const text = [`名前\t${days(1, 31)}`, '青木\t\t休\t\t×', '石川\t希\t\t\t\t\t休み', '上田'].join('\n')
  const preview = parseWishPaste(text, plan)

  it('スタッフの名前に当てはめて、休み希望を読む', () => {
    expect(preview.ok).toBe(true)
    expect(preview.rows.map((r) => [r.name, r.staffId, r.wishes.map((w) => w.day)])).toEqual([
      ['青木', 'st1', [2, 4]],
      ['石川', 'st2', [1, 6]],
      ['上田', 'st3', []],
    ])
    expect(preview.rows[0].wishes[0]).toEqual({ day: 2, wish: { kind: 'off' }, text: '休' })
    expect(preview.offCount).toBe(4)
    expect(preview.shiftCount).toBe(0)
    expect(preview.problems).toEqual([])
  })
  it('どう読んだかを説明する', () => {
    expect(preview.notes).toEqual(['1行めを、日付の行として読みました（1日〜31日）。'])
  })
})

describe('parseWishPaste: いろいろな書き方', () => {
  it('全角の数字・全角の×・前後の空白・大文字の X も読む', () => {
    const p = parseWishPaste('名前\t１\t２\t３\t４\n 青木 \tＸ\t ×\t✕\tＯＦＦ', plan)
    expect(p.rows[0].staffId).toBe('st1')
    expect(p.rows[0].wishes.map((w) => w.day)).toEqual([1, 2, 3, 4])
  })
  it('「1日」「12/1」「12月1日」「2026/12/1」「1(火)」の形の日付を読む', () => {
    for (const head of ['1日\t2日\t3日', '12/1\t12/2\t12/3', '12月1日\t12月2日\t12月3日', '2026/12/1\t2026/12/2\t2026/12/3', '1(火)\t2(水)\t3(木)', '1（火）\t2（水）\t3（木）']) {
      const p = parseWishPaste(`名前\t${head}\n青木\t\t\t休`, plan)
      expect(p.rows[0].wishes.map((w) => w.day)).toEqual([3])
    }
  })
  it('見出しの左上に「12月」と書いてあっても、日付の行だとわかる（「12日の月曜」と読みまちがえない）', () => {
    const p = parseWishPaste(`12月\t${days(1, 10)}\n青木\t休`, plan)
    expect(p.notes[0]).toContain('1日〜10日')
    expect(p.rows[0].wishes.map((w) => w.day)).toEqual([1])
  })
  it('日付の行の上に題名の行があっても、日付の行を見つける。曜日の行は読み飛ばす', () => {
    const text = ['12月 希望休\t\t\t', `名前\t${days(1, 5)}`, '\t火\t水\t木\t金\t土', '石川\t\t休'].join('\n')
    const p = parseWishPaste(text, plan)
    expect(p.notes[0]).toBe('2行めを、日付の行として読みました（1日〜5日）。')
    expect(p.rows).toHaveLength(1)
    expect(p.rows[0]).toMatchObject({ line: 4, staffId: 'st2' })
    expect(p.rows[0].wishes.map((w) => w.day)).toEqual([2])
  })
  it('日付が途中から始まる表（15日〜）でも、日がずれない', () => {
    const p = parseWishPaste(`名前\t${days(15, 20)}\n上田\t\t\t休`, plan)
    expect(p.rows[0].wishes.map((w) => w.day)).toEqual([17])
  })
  it('名前の左に番号の列があっても、名前の列を見つける', () => {
    const p = parseWishPaste(`No\t名前\t${days(1, 5)}\n1\t青木\t休\n2\t石川\t\t休`, plan)
    expect(p.rows.map((r) => [r.staffId, r.wishes.map((w) => w.day)])).toEqual([['st1', [1]], ['st2', [2]]])
  })
  it('名前のあいだの空白や、姓だけ・フルネームのちがいを吸収する', () => {
    const p2 = tinyPlan()
    p2.staff[0].name = '青木 花子'
    expect(parseWishPaste(`名前\t${days(1, 3)}\n青木花子\t休`, p2).rows[0].staffId).toBe('st1')
    expect(parseWishPaste(`名前\t${days(1, 3)}\n青木\t休`, p2).rows[0].staffId).toBe('st1')
    expect(parseWishPaste(`名前\t${days(1, 3)}\n青木　花子\t休`, p2).rows[0].staffId).toBe('st1')
  })
  it('頭の文字が同じ人が2人いるときは、決めつけない', () => {
    const p2 = tinyPlan()
    p2.staff[0].name = '青木 花子'
    p2.staff[1].name = '青木 太郎'
    const p = parseWishPaste(`名前\t${days(1, 3)}\n青木\t休`, p2)
    expect(p.rows[0].staffId).toBeNull()
    expect(p.ok).toBe(false)
  })
  it('勤務の記号や名前が入ったマスは、「この勤務に入りたい」として読む', () => {
    const p = parseWishPaste(`名前\t${days(1, 4)}\n青木\t早\t遅番\t休\t`, plan)
    expect(p.rows[0].wishes).toEqual([
      { day: 1, wish: { kind: 'shift', shiftId: 'sh1' }, text: '早' },
      { day: 2, wish: { kind: 'shift', shiftId: 'sh2' }, text: '遅番' },
      { day: 3, wish: { kind: 'off' }, text: '休' },
    ])
    expect(p.shiftCount).toBe(2)
    expect(p.offCount).toBe(1)
  })
  it('「○」や「出」のような、出られる印は、だまって読み飛ばす', () => {
    const p = parseWishPaste(`名前\t${days(1, 4)}\n青木\t○\t出\t-\t休`, plan)
    expect(p.rows[0].wishes.map((w) => w.day)).toEqual([4])
    expect(p.problems).toEqual([])
  })
})

describe('parseWishPaste: 日付の行や名前の列がないとき', () => {
  it('日付の行がなければ、名前のすぐ右を1日として読む', () => {
    const p = parseWishPaste('青木\t休\t\t×\n石川\t\t休', plan)
    expect(p.rows.map((r) => [r.staffId, r.wishes.map((w) => w.day)])).toEqual([['st1', [1, 3]], ['st2', [2]]])
    expect(p.notes).toEqual(['日付の行が見つからなかったので、名前のすぐ右の列を1日として読みました。'])
  })
  it('印だけの表（名前も日付もない）は、上から順にスタッフに当てはめる', () => {
    const p = parseWishPaste('休\t\t\n\t休\t\n\t\t×', plan)
    expect(p.rows.map((r) => [r.staffId, r.wishes.map((w) => w.day)])).toEqual([['st1', [1]], ['st2', [2]], ['st3', [3]]])
    expect(p.notes).toContain('名前の列が見つからなかったので、上の行から順に、スタッフの並びに当てはめました。')
  })
  it('印だけの表で、行がスタッフより多ければ、あまった行は取り込まない', () => {
    const p = parseWishPaste('休\t\n休\t\n休\t\n休\t', plan)
    expect(p.rows[3].staffId).toBeNull()
    expect(p.problems[0]).toContain('下の1行は取り込みません')
    expect(p.offCount).toBe(3)
  })
})

describe('parseWishPaste: 名前の列がない表で、希望のない人がいるとき', () => {
  // 青木 = 1日と4日、石川 = 希望なし、上田 = 2日と6日
  const text = '休\t\t\t休\t\t\n\t\t\t\t\t\n\t休\t\t\t\t休'

  it('空の行は、希望のない1人ぶんとして数える（下の人の希望が、上の人にずれない）', () => {
    const p = parseWishPaste(text, plan)
    expect(p.rows.map((r) => [r.line, r.staffId, r.wishes.map((w) => w.day)])).toEqual([
      [1, 'st1', [1, 4]],
      [2, 'st2', []],
      [3, 'st3', [2, 6]],
    ])
    expect(p.notes.join('')).toContain('空の行（2行め）は、希望のない人の行として数えました')
    expect(p.problems).toEqual([])
    const next = applyWishPaste(plan, p)
    expect(next.wishes).toEqual({ st1: { '1': { kind: 'off' }, '4': { kind: 'off' } }, st3: { '2': { kind: 'off' }, '6': { kind: 'off' } } })
  })
  it('日付の行があって名前の列がない表でも、同じ', () => {
    const p = parseWishPaste(`${days(1, 6)}\n${text}`, plan)
    expect(p.rows.map((r) => [r.line, r.staffId, r.wishes.map((w) => w.day)])).toEqual([
      [2, 'st1', [1, 4]],
      [3, 'st2', []],
      [4, 'st3', [2, 6]],
    ])
  })
  it('いちばん下の人に希望がなくても、行の数は合う（Excel は、最後に改行を1つ足して渡してくる）', () => {
    const p = parseWishPaste('休\t\t\r\n\t休\t\r\n\t\t\r\n', plan)
    expect(p.rows.map((r) => [r.staffId, r.wishes.map((w) => w.day)])).toEqual([['st1', [1]], ['st2', [2]], ['st3', []]])
    expect(p.problems).toEqual([])
  })
  it('スタッフの人数より下にある空の行は、だまって捨てる', () => {
    const p = parseWishPaste('休\t\t\n\t休\t\n\t\t×\n\t\t\n\t\t\n', plan)
    expect(p.rows).toHaveLength(3)
    expect(p.problems).toEqual([])
  })
  it('前後の、何も書いていない行（改行だけ）は、人として数えない', () => {
    const p = parseWishPaste('\n休\t\t\n\t休\t\n\n', plan)
    expect(p.rows.map((r) => [r.line, r.staffId, r.wishes.map((w) => w.day)])).toEqual([[2, 'st1', [1]], [3, 'st2', [2]]])
  })
  it('行の数がスタッフの人数より少ないときは、確かめるように言う', () => {
    const p = parseWishPaste('休\t\t\n\t休\t', plan)
    expect(p.problems.join('')).toContain('貼り付けた表は2行で、スタッフは3人です')
  })
  it('名前の列がある表では、空の行があっても、行の番号は貼り付けた表のままになる', () => {
    const p = parseWishPaste(`名前\t${days(1, 3)}\n青木\t休\n\t\t\t\n上田\t\t休`, plan)
    expect(p.rows.map((r) => [r.line, r.staffId])).toEqual([[2, 'st1'], [4, 'st3']])
  })
})

describe('parseWishPaste: 日付が1日から順に並んでいない表', () => {
  const head = ['名前', ...Array.from({ length: 16 }, (_, i) => String(16 + i)), ...Array.from({ length: 15 }, (_, i) => String(1 + i))].join('\t')
  it('16日はじまりの表は、断る（名前の右の列を1日と読んで、ちがう日に入れてしまわない）', () => {
    const p = parseWishPaste([head, '青木\t休', `石川${'\t'.repeat(31)}休`].join('\n'), plan)
    expect(p.ok).toBe(false)
    expect(p.rows).toEqual([])
    expect(p.offCount).toBe(0)
    expect(p.problems.join('')).toContain('1日から順に並んでいません')
  })
  it('月をまたぐ日付（12/16 〜 1/15）の表も、断る', () => {
    const cells = [...Array.from({ length: 16 }, (_, i) => `12/${16 + i}`), ...Array.from({ length: 15 }, (_, i) => `1/${1 + i}`)]
    const p = parseWishPaste([`名前\t${cells.join('\t')}`, '青木\t休'].join('\n'), plan)
    expect(p.ok).toBe(false)
    expect(p.problems.join('')).toContain('1日から順に並んでいません')
  })
})

describe('parseWishPaste: 勤務の記号が、読み飛ばす印と同じとき', () => {
  it('記号が「出」の勤務は、「出」のマスを「その勤務に入りたい」として読む', () => {
    const p2 = tinyPlan()
    p2.shiftTypes[0] = { ...p2.shiftTypes[0], name: '出勤', symbol: '出' }
    const p = parseWishPaste(`名前\t${days(1, 4)}\n青木\t出\t休\t出勤\t○`, p2)
    expect(p.rows[0].wishes).toEqual([
      { day: 1, wish: { kind: 'shift', shiftId: 'sh1' }, text: '出' },
      { day: 2, wish: { kind: 'off' }, text: '休' },
      { day: 3, wish: { kind: 'shift', shiftId: 'sh1' }, text: '出勤' },
    ])
    expect(p.problems).toEqual([])
  })
})

describe('parseWishPaste: タブでもカンマでもない貼り付け', () => {
  it('空白で区切られた文字も読む（メモ帳などから貼ったとき）', () => {
    const p = parseWishPaste('青木 休 休\n石川　×', plan)
    expect(p.rows.map((r) => [r.staffId, r.wishes.map((w) => w.day)])).toEqual([['st1', [1, 2]], ['st2', [1]]])
  })
  it('カンマ区切り（CSV をそのまま貼ったとき）も読む', () => {
    const p = parseWishPaste('名前,1,2,3\n青木,,休,\n上田,休,,', plan)
    expect(p.rows.map((r) => [r.staffId, r.wishes.map((w) => w.day)])).toEqual([['st1', [2]], ['st3', [1]]])
  })
})

describe('parseWishPaste: 合わないところを、言う', () => {
  it('スタッフの名前に当てはまらない行は、取り込まずに知らせる', () => {
    const p = parseWishPaste(`名前\t${days(1, 3)}\n青木\t休\n山田\t休\t休`, plan)
    expect(p.rows[1]).toMatchObject({ name: '山田', staffId: null })
    expect(p.problems[0]).toContain('山田')
    expect(p.offCount).toBe(1) // 当てはまらない行のぶんは数えない
    expect(p.ok).toBe(true)
  })
  it('読めなかったマスは、取り込まずに、例を見せる', () => {
    const p = parseWishPaste(`名前\t${days(1, 3)}\n青木\t休\t午後から\t？`, plan)
    expect(p.rows[0].unknown).toEqual([{ day: 2, text: '午後から' }, { day: 3, text: '？' }])
    expect(p.problems.join('')).toContain('読めなかったマスが、2個あります')
    expect(p.problems.join('')).toContain('午後から')
  })
  it('月が違って見えるときは、知らせる', () => {
    const p = parseWishPaste('名前\t11/1\t11/2\t11/3\n青木\t休', plan)
    expect(p.problems[0]).toContain('11月のものに見えます')
    expect(p.ok).toBe(true)
  })
  it('その月にない日の列は、読み飛ばして知らせる（11月に31日はない）', () => {
    const nov = tinyPlan({ month: 11 })
    const p = parseWishPaste(`名前\t${days(29, 31)}\n青木\t休\t休\t休`, nov)
    expect(p.rows[0].wishes.map((w) => w.day)).toEqual([29, 30])
    expect(p.problems[0]).toContain('31日の列は読み飛ばしました')
  })
  it('同じスタッフが2行あれば、知らせる', () => {
    const p = parseWishPaste(`名前\t${days(1, 3)}\n青木\t休\n青木\t\t休`, plan)
    expect(p.problems.join('')).toContain('同じスタッフに2回当てはまりました')
  })
  it('空の貼り付け、希望が1つもない表は、取り込めないと言う', () => {
    expect(parseWishPaste('', plan)).toMatchObject({ ok: false, rows: [] })
    expect(parseWishPaste('   \n\t\t', plan).problems[0]).toContain('空です')
    const none = parseWishPaste(`名前\t${days(1, 3)}\n青木\t\t\t`, plan)
    expect(none.ok).toBe(false)
    expect(none.problems.join('')).toContain('取り込める希望が見つかりませんでした')
  })
  it('スタッフが1人もいない plan に貼り付けても、落ちない', () => {
    const p = parseWishPaste(`名前\t${days(1, 3)}\n青木\t休`, tinyPlan({ staff: [] }))
    expect(p.ok).toBe(false)
    expect(p.rows[0].staffId).toBeNull()
  })
})

describe('applyWishPaste', () => {
  const existing = tinyPlan({ wishes: { st1: { '20': { kind: 'off' }, '2': { kind: 'shift', shiftId: 'sh1' } }, st3: { '9': { kind: 'off' } } } })
  const preview = parseWishPaste(`名前\t${days(1, 5)}\n青木\t\t休\n石川\t休\n山田\t休`, existing)

  it('merge: 貼り付けた日だけ書きかえ、ほかの希望は残す', () => {
    const next = applyWishPaste(existing, preview)
    expect(next.wishes).toEqual({
      st1: { '20': { kind: 'off' }, '2': { kind: 'off' } },
      st2: { '1': { kind: 'off' } },
      st3: { '9': { kind: 'off' } },
    })
  })
  it('replace: 貼り付けた表に出てきたスタッフの希望を入れかえる。出てこなかった人の希望は残す', () => {
    const next = applyWishPaste(existing, preview, { mode: 'replace' })
    expect(next.wishes).toEqual({ st1: { '2': { kind: 'off' } }, st2: { '1': { kind: 'off' } }, st3: { '9': { kind: 'off' } } })
  })
  it('名前が当てはまらなかった行を、画面で選んだスタッフに当てられる', () => {
    const next = applyWishPaste(existing, preview, { assign: { 4: 'st3' } })
    expect(next.wishes.st3).toEqual({ '9': { kind: 'off' }, '1': { kind: 'off' } })
    // いないスタッフを指しても、何も起きない
    expect(applyWishPaste(existing, preview, { assign: { 4: 'ghost' } }).wishes.ghost).toBeUndefined()
  })
  it('もとの plan を書き換えない', () => {
    const before = JSON.stringify(existing)
    applyWishPaste(existing, preview, { mode: 'replace' })
    expect(JSON.stringify(existing)).toBe(before)
  })
})
