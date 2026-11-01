// data/ の全国の材料 → src/shared/national.ts（自動生成。手で編集しない）
//   node scripts/gen-national.mjs
//
// 読む材料（くわしくは data/README.md）
//   medical-r8.csv（あれば。なければ medical-r7.csv） … 子ども医療費助成（こども家庭庁の全国調査 別紙3）
//   rent-r5.csv            … 家賃の平均（令和5年住宅・土地統計調査）
//   waiting.csv            … 待機児童数（こども家庭庁「保育所等関連状況取りまとめ（令和8年4月1日）」）
//   lunch-mext.csv         … 中学校の給食費の無償化（市区町村ごとの調べ）
//   iju-list.csv           … 移住支援金（地方創生移住支援事業）を実施しているか
//   muni-nursery-policies.json … 市区町村の0〜2歳の保育料の無償化（県の一覧・市のページなど）
//   pref-nursery-east.json / pref-nursery-west.json … 都道府県の0〜2歳の保育料の制度
//
// 取り込みの決まり（守ること）
//   - 確かめていない項目は入れない（0円・「ない」にしない）。画面では「確認中」「準備中」になる
//   - 値には、確からしさ（確認済・推定）・時点・出典を付ける
//   - 今年度（令和8年度・2026年）の情報でないものは、確認済でも「推定」に下げる
//   - 県が「全市町村で」と書いている制度は、市町村ごとには確かめていないので「推定」まで
//   - 手挙げ（実施する市町村に県が補助）の制度は、実施市町村の一覧がある市町村だけ
//   - 民間のまとめだけが根拠のものは、今年度の記事でなければ入れない
import { existsSync, readFileSync, writeFileSync } from 'node:fs'

const dataPath = (p) => new URL(`../data/${p}`, import.meta.url)
const text = (p) => readFileSync(dataPath(p), 'utf8').replace(/^﻿/, '')
const json = (p) => JSON.parse(text(p))

// 引用符つきの CSV を読む（値の中のカンマ・改行・"" に対応）
function csv(p) {
  const s = text(p)
  const rows = []
  let row = [], cell = '', q = false
  for (let i = 0; i < s.length; i++) {
    const ch = s[i]
    if (q) {
      if (ch === '"') {
        if (s[i + 1] === '"') { cell += '"'; i++ } else q = false
      } else cell += ch
    } else if (ch === '"') q = true
    else if (ch === ',') { row.push(cell); cell = '' }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && s[i + 1] === '\n') i++
      row.push(cell); rows.push(row); row = []; cell = ''
    } else cell += ch
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row) }
  const [head, ...body] = rows.filter((r) => r.length > 1 || r[0] !== '')
  return body.map((r) => Object.fromEntries(head.map((h, i) => [h, r[i] ?? ''])))
}

// ---------- 出典と文の表（同じものは1つにまとめ、行からは番号で引く） ----------
const SOURCES = []
const srcIndex = new Map()
function src(label, url) {
  const key = url
  if (!srcIndex.has(key)) { srcIndex.set(key, SOURCES.length); SOURCES.push({ label, url }) }
  return srcIndex.get(key)
}
const TEXTS = []
const textIndex = new Map()
function t(s) {
  if (!textIndex.has(s)) { textIndex.set(s, TEXTS.length); TEXTS.push(s) }
  return textIndex.get(s)
}
const CONF = ['確認済', '推定', '仮置き']
const confNo = (c) => Math.max(0, CONF.indexOf(c))
const weaker = (a, b) => (confNo(a) >= confNo(b) ? a : b)

// 「 | 」で区切った出典の名前とURLを、出典の番号の並びにする
function splitSources(labels, urls) {
  const ls = (labels || '').split(' | ').map((x) => x.trim())
  const us = (urls || '').split(' | ').map((x) => x.trim())
  const out = []
  us.forEach((u, i) => { if (/^https?:\/\//.test(u)) out.push(src(ls[i] || ls[0] || u, u)) })
  return [...new Set(out)]
}

// 今年度（令和8年度・2026年）の情報か。時点の書き方から決める（下は今年度でない書き方）
const NOT_CURRENT = [/令和7年4月1日現在/, /令和6年度/, /2024年6月/, /更新日202[345]/, /令和7年3月現在/, /県の計画（2025年9月）/, /令和7年7月8日時点/, /令和7年度実績/, /令和6年6月時点/]
const isCurrent = (asOf) => !NOT_CURRENT.some((re) => re.test(asOf || ''))

// ---------- 市区町村の一覧（3つの全国の表で同じ1,741か確かめる） ----------
const waitingRows = csv('waiting.csv')
const lunchRows = csv('lunch-mext.csv')
const ijuRows = csv('iju-list.csv')
const CODES = waitingRows.map((r) => r.code)
for (const [name, rows] of [['lunch-mext.csv', lunchRows], ['iju-list.csv', ijuRows]]) {
  const a = rows.map((r) => r.code).sort().join(), b = [...CODES].sort().join()
  if (a !== b) throw new Error(`${name} の市区町村が waiting.csv と合わない`)
}
if (CODES.length !== 1741) throw new Error(`市区町村の数が1,741ではない: ${CODES.length}`)
const NAME = Object.fromEntries(waitingRows.map((r) => [r.code, `${r.pref}${r.name}`]))

// ---------- 子ども医療費（令和8年の版があれば、それを使う） ----------
// 列: pref,name,tsuin,nyuin,income_limit_tsuin,income_limit_nyuin,copay_tsuin,copay_nyuin,note（令和7年の版と同じ形で作ること）
const medFile = existsSync(dataPath('medical-r8.csv')) ? 'medical-r8.csv' : 'medical-r7.csv'
const MEDICAL_META = medFile === 'medical-r8.csv'
  ? { edition: '令和8年度', asOf: '令和8年4月1日', label: 'こども家庭庁 こどもに係る医療費の助成についての調査（令和8年4月1日時点）', url: 'https://www.cfa.go.jp/policies/boshihoken/' }
  : { edition: '令和7年度', asOf: '令和7年4月1日', label: 'こども家庭庁 こどもに係る医療費の助成についての調査（令和7年4月1日時点）', url: 'https://www.cfa.go.jp/policies/boshihoken/kodomoiryouhityousa-r7' }
const age = (s) => (s === '就学前' ? 6 : Number((s.match(/(\d+)歳/) || [])[1] ?? NaN))
const medical = {}
for (const r of csv(medFile)) {
  medical[r.pref + r.name] = [age(r.tsuin), age(r.nyuin), r.income_limit_tsuin === '有' ? 1 : 0, r.copay_tsuin === '有' ? 1 : 0, r.note || '']
}

// ---------- 家賃 ----------
const rent = {}
for (const r of csv('rent-r5.csv')) {
  const num = (v) => (v && v !== 'None' ? Number(v) : null)
  rent[r.code5] = [num(r.avg_all), num(r.avg_18_24), num(r.avg_24_30)]
}

// ---------- 待機児童（令和8年4月1日。全1,741市区町村が表に載っている） ----------
const waiting = {}
const waitingKumamoto = []
for (const r of waitingRows) {
  if (!/^\d+$/.test(r.waiting)) throw new Error(`待機児童の数が読めない: ${r.code} ${r.waiting}`)
  waiting[r.code] = Number(r.waiting)
  if (r.pref === '熊本県') waitingKumamoto.push(r.code)
}
const w0 = waitingRows[0]
const [wLabel1, wLabel2] = w0.source_label.split(' | ')
const [wUrl1, wUrl2] = w0.source_url.split(' | ')
const WAITLIST_META = {
  asOf: '2026年4月1日',
  label: 'こども家庭庁「保育所等関連状況取りまとめ（令和8年4月1日）」（加工して作成）',
  url: wUrl2 || 'https://www.cfa.go.jp/policies/hoiku/torimatome/r8',
  fileLabel: wLabel1,
  fileUrl: wUrl1,
  note: '国の定義の待機児童（特定の園だけを希望している子などは数えない）。取りまとめ全体が暫定値で、今後直されることがある',
  kumamotoNote: '熊本県内は令和8年熊本地震の影響でまだ確定していない（暫定値）',
  pageLabel: wLabel2,
}

// ---------- 給食（中学校） ----------
// [無料(1)・無料でない(0), 確からしさの番号, 時点の文の番号, メモの文の番号, 出典の番号[]]
const lunch = {}
const lunchSkip = {}
for (const r of lunchRows) {
  if (!['全員', 'なし', '一部'].includes(r.jh_free)) { lunchSkip[r.jh_free] = (lunchSkip[r.jh_free] ?? 0) + 1; continue }
  let conf = r.jh_confidence === '確認済' ? '確認済' : '推定'
  if (conf === '確認済' && !/2026/.test(r.as_of)) conf = '推定'
  const sources = splitSources(r.source_label, r.source_url)
  if (!sources.length) throw new Error(`給食の出典がない: ${r.code}`)
  // 20市調査の行の「（この行は、…）」は、取り込みの経緯なので画面には出さない
  const note = r.note.replace(/（この行は、[^）]*）$/, '').trim()
  const partial = r.jh_free === '一部' ? '全員は無料ではない（第3子以降など一部の子だけ0円）。' : ''
  lunch[r.code] = [r.jh_free === '全員' ? 1 : 0, confNo(conf), t(r.as_of), t(partial + note), sources]
}

// ---------- 移住支援金 ----------
// s: 'yes' 実施 / 'none' 実施なし / 'part' 一部の地域だけ（対象外＝東京圏の条件不利地域でない街と、未確認は入れない）
const iju = {}
const ijuCount = {}
const man = (s) => Number(s) * 10000
for (const r of ijuRows) {
  ijuCount[r.implements] = (ijuCount[r.implements] ?? 0) + 1
  const s = { 実施: 'yes', 実施なし: 'none', 一部地域: 'part' }[r.implements]
  if (!s) continue
  const conf = r.note.startsWith('【推定】') ? '推定' : r.note.startsWith('【確認済】') ? '確認済' : '仮置き'
  const note = r.note.replace(/^【[^】]*】/, '').trim()
  const rec = { s, conf: confNo(conf), asOf: t(r.as_of), note: t(note), src: splitSources(r.source_label, r.source_url) }
  if (s === 'yes' || s === 'part') {
    // 世帯の額：メモに「世帯◯万円」とあればその額、なければ国の上限（最大100万円）
    const fam = note.match(/世帯(\d+)万円/)
    rec.f = fam ? man(fam[1]) : 1000000
    if (!fam) rec.fu = 1
    // 単身の額（メモに書いてある街だけ。ないときは国の上限の最大60万円として計算する）
    const one = note.match(/単身(\d+)万円/)
    if (one) rec.s1 = man(one[1])
    // 子どもの加算：「1人◯万円」ならその額、「最大100万円」は最大（市町村によって少ない）
    const per = r.child_addition.match(/^1人(\d+)万円/)
    if (per) rec.c = man(per[1])
    else if (/最大(\d+)万円/.test(r.child_addition)) { rec.c = man(r.child_addition.match(/最大(\d+)万円/)[1]); rec.cu = 1 }
    else throw new Error(`子どもの加算が読めない: ${r.code} ${r.child_addition}`)
    const cond = r.child_addition.match(/（([^）]*)）/)
    if (cond && per) rec.cn = t(cond[1])
  }
  iju[r.code] = rec
}

// ---------- 0〜2歳の保育料（市区町村の一覧 ＋ 県の「全市町村」の制度） ----------
// 1つの街に、いくつかの制度がかさなることがある（例: 県の第2子の無償化と、町の2歳児の無償化）
const rules = new Map() // code → 規則の配列
const addRule = (code, rule) => { if (!rules.has(code)) rules.set(code, []); rules.get(code).push(rule) }
const skipped = [] // 入れなかったもの（理由つき。coverage と README のため）

// 民間のサイト（まとめ・解説）。今年度の記事でなければ根拠にしない
const PRIVATE = /craftsman\.fun|pulmo\.jp|cckuma\.com/
// 県の説明（全市町村で、など）から市町村に広げたもの。市町村ごとには確かめていないので「推定」まで
const PREF_WIDE = new Set([
  'いわて子育て応援保育料無償化事業',
  'やまぐち子育て応援第2子以降保育料無償化事業',
  '大分県 3歳未満児（第2子以降）の保育料助成',
  '栃木県 第2子保育料免除事業',
  '子だくさんふくいプロジェクト（第2子以降の保育料無償化）',
  'やまなし子育て応援事業',
  '東京都 保育所等利用世帯負担軽減事業（保育料等第一子無償化）',
])
// 2人目だけが対象の制度（3人目以降は国の基準）
const SECOND_ONLY = new Set(['栃木県 第2子保育料免除事業'])
// 所得の条件があるかもしれない制度（確かめられていない）。この年収（万円）より上の帯は「確認中」にする
const MAYBE_CAP = { やまなし子育て応援事業: { cap: 640, note: '県の別のページに「所得割169,000円未満（年収約640万円未満）」の条件があるとされ、確かめられていないので、それより上の年収帯は確認中にしている' } }

const muni = json('muni-nursery-policies.json')
for (const r of muni) {
  const why =
    r.policy === 'free_scope_unknown' ? '対象（第1子からか第2子からか）が未確認'
    : r.program === '阿波っ子はぐくみ保育料助成事業' ? '県の説明で支援の中身が市町村ごとに違うとされ、市町村ごとの実施が未確認（手挙げの制度）'
    : r.policy === 'first_free_income' && !r.income_limit_annual_man_yen ? '第1子の無償に所得の条件があるが、その額が分からない'
    : r.sources.every((s) => PRIVATE.test(s.url)) && !/2026/.test(r.as_of) ? '民間のまとめだけが根拠で、今年度の記事ではない'
    : ''
  if (why) { skipped.push({ code: r.code, name: `${r.pref}${r.name}`, policy: r.policy, why }); continue }
  let conf = r.confidence === '確認済' && isCurrent(r.as_of) ? '確認済' : '推定'
  if (PREF_WIDE.has(r.program)) conf = '推定'
  const count = r.sibling_count === 'household' ? 'household' : r.sibling_count === 'together' ? 'together' : null
  const rule = { conf, asOf: r.as_of, note: r.detail, src: r.sources.map((s) => src(s.label, s.url)), via: r.program || r.policy }
  if (r.policy === 'first_free') rule.firstFree = true
  else if (r.policy === 'first_free_income') rule.firstFreeUnder = r.income_limit_annual_man_yen
  else if (r.policy === 'first_free_partial') {
    const a = Number(((r.conditions || '').match(/(\d)歳児/) || [])[1])
    if (!Number.isFinite(a)) { skipped.push({ code: r.code, name: `${r.pref}${r.name}`, policy: r.policy, why: '対象の年齢が読めない' }); continue }
    rule.freeFromAge = a
  } else if (r.policy === 'second_free') {
    rule.secondFree = true
    rule.secondCount = count
    if (r.income_limit === 'あり') {
      if (!r.income_limit_annual_man_yen) { skipped.push({ code: r.code, name: `${r.pref}${r.name}`, policy: r.policy, why: '所得の条件の額が分からない' }); continue }
      rule.secondFreeUnder = r.income_limit_annual_man_yen
    }
    const maybe = MAYBE_CAP[r.program]
    if (maybe && r.income_limit !== 'なし') { rule.secondFreeUnder = maybe.cap; rule.note += `（${maybe.note}）` }
    if (SECOND_ONLY.has(r.program)) rule.secondOnly = true
    if (!count) rule.note += '（2人目の数え方が分からないので、国の基準どおり、同時に保育園などに通う子で数えています）'
  } else throw new Error(`知らない種類: ${r.policy}`)
  addRule(r.code, rule)
}

// 県の制度のうち、県が「全市町村で」と書いていて、国の基準より有利になるもの
// （栃木・山梨は市区町村の一覧にも同じ制度が入っている。埼玉は data.ts で入れている。富山は第3子の数え方が分からず、国の基準と同じになるので入れない）
const east = json('pref-nursery-east.json').prefectures
const west = json('pref-nursery-west.json')
for (const p of west) {
  for (const pr of p.programs ?? []) {
    if (pr.coverage !== 'all' || !(pr.implementingCodes ?? []).length) continue
    // 第3子以降を、同じ世帯の子で数えて0円（鳥取県）
    if (pr.kind === 'thirdPlus' && pr.benefit === 'free' && pr.counting === 'household') {
      for (const code of pr.implementingCodes) {
        addRule(code, {
          conf: '推定', asOf: pr.asOf, via: pr.name,
          note: `${p.pref}の${pr.name}：${pr.content}${pr.coverageNote ? `（${pr.coverageNote}）` : ''}`,
          src: pr.sources.map((s) => src(s.label, s.url)), thirdFree: true, thirdCount: 'household',
        })
      }
    } else {
      skipped.push({ code: p.prefCode, name: p.pref, policy: pr.name, why: pr.incomeLimit === 'yes' ? '年収約360万円未満の世帯だけで、サイトの年収帯（400万円未満）の途中に境目がある' : '国の基準より有利になるか分からない' })
    }
  }
}
for (const p of east) {
  for (const pr of p.programs) {
    if (pr.scope !== 'all') continue
    skipped.push({ code: p.prefCode, name: p.pref, policy: pr.id, why: { 'saitama-tashi-musyoka': 'data.ts で県内63市町村に入れている', 'toyama-third-free': '第3子の数え方が分からず、国の基準（同時に通う3人目は0円）と同じ計算になる' }[pr.id] ?? '市区町村の一覧に同じ制度が入っている' })
  }
}

// 1つの街の規則をまとめる（確からしさは、効いている規則のうちいちばん弱いもの）
const nursery = {}
for (const [code, list] of rules) {
  const o = { conf: 0, src: [], notes: [], asOf: [], via: [] }
  const firstFree = list.some((r) => r.firstFree)
  if (firstFree) o.ff = 1
  const ffu = list.filter((r) => r.firstFreeUnder).map((r) => r.firstFreeUnder)
  if (!firstFree && ffu.length) o.ffu = Math.min(...ffu)
  const sec = list.filter((r) => r.secondFree)
  if (sec.length) {
    o.sf = 1
    const caps = sec.map((r) => r.secondFreeUnder)
    if (caps.every((x) => x)) o.sfu = Math.min(...caps)
    if (sec.every((r) => r.secondOnly)) o.so = 1
    o.sc = sec.some((r) => r.secondCount === 'household') ? 'h' : 't'
  }
  const third = list.filter((r) => r.thirdFree || (r.secondFree && !r.secondOnly))
  if (third.length) {
    o.tf = 1
    o.tc = third.some((r) => r.thirdCount === 'household' || r.secondCount === 'household') ? 'h' : 't'
  }
  const fa = list.filter((r) => r.freeFromAge !== undefined).map((r) => r.freeFromAge)
  if (!firstFree && fa.length) o.fa = Math.min(...fa)
  // 第1子から0円の街は、ほかの規則（2人目・3人目）が計算に効かないので、第1子の規則だけで確からしさ・時点・出典を決める
  const used = firstFree ? list.filter((r) => r.firstFree) : list
  let conf = '確認済'
  for (const r of used) {
    conf = weaker(conf, r.conf)
    o.src.push(...r.src)
    if (!o.notes.includes(r.note)) o.notes.push(r.note)
    if (!o.asOf.includes(r.asOf)) o.asOf.push(r.asOf)
    o.via.push(r.via)
  }
  // 数え方（同じ世帯の子で数える）を言っている規則の確からしさ（第1子から0円の街では使わない）
  const hh = firstFree ? [] : list.filter((r) => r.secondCount === 'household' || r.thirdCount === 'household')
  const cc = hh.reduce((a, r) => weaker(a, r.conf), '確認済')
  nursery[code] = {
    ...(o.ff ? { ff: 1 } : {}), ...(o.ffu ? { ffu: o.ffu } : {}), ...(o.sf ? { sf: 1, sc: o.sc } : {}), ...(o.sfu ? { sfu: o.sfu } : {}), ...(o.so ? { so: 1 } : {}),
    ...(o.tf ? { tf: 1, tc: o.tc } : {}), ...(o.fa !== undefined ? { fa: o.fa } : {}),
    conf: confNo(conf), ...(hh.length ? { cc: confNo(cc) } : {}),
    asOf: t(o.asOf.join('／')), note: t(o.notes.join('／')), src: [...new Set(o.src)],
  }
}

// ---------- 書き出す ----------
const sorted = (obj) => Object.fromEntries(Object.keys(obj).sort().map((k) => [k, obj[k]]))
const ts = `// 自動生成（scripts/gen-national.mjs）。手で編集しない。材料と取り込みの決まりは data/README.md と scripts/gen-national.mjs
// 子ども医療費助成: ${MEDICAL_META.label}別紙3を加工
// 家賃: 総務省統計局「令和5年住宅・土地統計調査」第111-3表（e-Stat）を加工。借家の1か月当たり家賃の平均（家賃0円を含まない）
// 待機児童: ${WAITLIST_META.label}
// 給食・移住支援金・保育料: 国・都道府県・市区町村の公開資料（行ごとの出典は NAT_SOURCES の番号）
import type { Source } from './types'

export const MEDICAL_META = ${JSON.stringify(MEDICAL_META)} as const
// [通院の対象年齢（年度末）, 入院の対象年齢, 所得制限あり(1), 通院の一部自己負担あり(1), 注記]
export const MEDICAL: Record<string, [number, number, 0 | 1, 0 | 1, string]> = ${JSON.stringify(medical)}
// [総数, 居住室18.0〜23.9畳, 24.0〜29.9畳]（円/月）。キーは地方公共団体コードの上5けた
export const RENT_R5: Record<string, [number | null, number | null, number | null]> = ${JSON.stringify(rent)}

// 出典（行からは番号で引く）と、くり返し出てくる文
export const NAT_SOURCES: Source[] = ${JSON.stringify(SOURCES)}
export const NAT_TEXTS: string[] = ${JSON.stringify(TEXTS)}
// 確からしさの番号 → 0 確認済、1 推定、2 仮置き

// 待機児童の数（全1,741市区町村。0人の街も表に載っている）
export const WAITLIST_META = ${JSON.stringify(WAITLIST_META)} as const
export const WAITLIST_R8: Record<string, number> = ${JSON.stringify(sorted(waiting))}

// 中学校の給食費: [無料なら1, 確からしさ, 時点(NAT_TEXTS), メモ(NAT_TEXTS), 出典(NAT_SOURCES)[]]。表にない街は分からない（確認中）
export const LUNCH: Record<string, [0 | 1, 0 | 1 | 2, number, number, number[]]> = ${JSON.stringify(sorted(lunch))}

// 移住支援金: s = yes 実施 / none 実施なし / part 一部の地域だけ。f 世帯の額、c 子1人の加算、s1 単身の額（分かる街だけ）、fu・cu は「最大」（市町村で少ないことがある）
// cn は加算の条件（例: 2026年4月1日以降の転入）。表にない街は分からない（準備中）。東京圏の条件不利地域でない街（対象外）は入れていない
export interface NatIju { s: 'yes' | 'none' | 'part'; f?: number; c?: number; s1?: number; fu?: 1; cu?: 1; cn?: number; conf: number; asOf: number; note: number; src: number[] }
export const IJU: Record<string, NatIju> = ${JSON.stringify(sorted(iju))}

// 0〜2歳の保育料の制度（国の基準より有利になる分）
//   ff 第1子から0円 / ffu 第1子の0円に所得の条件（年収の目安・万円） / sf 2人目0円 / sfu 2人目の0円の所得の条件 / so 2人目だけ（3人目以降は国の基準）
//   sc 2人目の数え方（h 同じ世帯の子 / t 同時に通う子） / tf 3人目以降0円 / tc 3人目の数え方 / fa この年齢（歳児クラス）からは第1子も0円
//   conf 確からしさ / cc 数え方の確からしさ / asOf 時点 / note メモ / src 出典
export interface NatNursery { ff?: 1; ffu?: number; sf?: 1; sfu?: number; so?: 1; sc?: 'h' | 't'; tf?: 1; tc?: 'h' | 't'; fa?: number; conf: number; cc?: number; asOf: number; note: number; src: number[] }
export const NURSERY: Record<string, NatNursery> = ${JSON.stringify(sorted(nursery))}
`
writeFileSync(new URL('../src/shared/national.ts', import.meta.url), ts)

// 入れなかったものの記録（README・coverage 用。リポジトリには入れない一時ファイル）
const outSkip = process.argv[2]
if (outSkip) writeFileSync(outSkip, JSON.stringify({ skipped, lunchSkip, ijuCount }, null, 1))

const cnt = (o, f) => Object.values(o).filter(f).length
console.log([
  `medical ${Object.keys(medical).length}（${medFile}）`,
  `rent ${Object.keys(rent).length}`,
  `waiting ${Object.keys(waiting).length}（1人以上 ${cnt(waiting, (v) => v > 0)}）`,
  `lunch ${Object.keys(lunch).length}（無料 ${cnt(lunch, (v) => v[0] === 1)}・無料でない ${cnt(lunch, (v) => v[0] === 0)}）`,
  `iju ${Object.keys(iju).length}（実施 ${cnt(iju, (v) => v.s === 'yes')}・実施なし ${cnt(iju, (v) => v.s === 'none')}・一部 ${cnt(iju, (v) => v.s === 'part')}）`,
  `nursery ${Object.keys(nursery).length}（第1子0円 ${cnt(nursery, (v) => v.ff)}・所得の条件つき ${cnt(nursery, (v) => v.ffu)}・2人目0円 ${cnt(nursery, (v) => v.sf)}・3人目0円 ${cnt(nursery, (v) => v.tf)}・年齢 ${cnt(nursery, (v) => v.fa !== undefined)}）`,
  `入れなかった保育料の行 ${skipped.length}`,
  `sources ${SOURCES.length}, texts ${TEXTS.length}, ${(ts.length / 1024).toFixed(0)} KB`,
].join('\n'))
for (const c of Object.keys(nursery)) if (!NAME[c]) throw new Error(`保育料の制度のコードが一覧にない: ${c}`)
