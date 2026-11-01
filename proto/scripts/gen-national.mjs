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
//   - 民間のまとめだけが根拠のものは、今年度の記事でなければ入れない（題名しか見られなかった公式ページも、根拠に数えない）
//   - 所得の条件があるか確かめていない無償化は、年収の目安（UNSURE_CAP）より上の年収帯を「確認中」にする（どの年収でも0円とはしない）
//   - 「予定」としか分からない制度や、0〜2歳の第1子を含むと書かれていない制度は、第1子の0円に入れない
//   - 今年度も続いているか分からない値（例: 2024年度の給食費の無償化）は、計算に入れず「確認中」にして、メモに過去の値を書く
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
  if (!srcIndex.has(key)) { srcIndex.set(key, SOURCES.length); SOURCES.push({ label: plainLabel(label), url }) }
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

// 画面に出る文から、調べた作業の言葉（要約・検索結果・照合・収集・ファイル名など）を除き、使う人に向けた言い方にする。
// 確からしさの情報（ページの中身を直接は確かめていない、など）は「概要」「未確認」の言葉で残す
const PLAIN = [
  [/（この行は、.*$/, ''],
  [/収集で市の公式(ページ|FAQ)から確かめた内容で、照合では確かめきれなかった。?/g, '市の公式$1の内容で、あとから確かめ直せていない。'],
  [/小学校の0円は収集時の市公式ページによる（照合では確かめ直せなかった）/g, '小学校の0円は市の公式ページによる（あとから確かめ直せていない）'],
  [/照合では本文を読み直せていない。?/g, 'あとから確かめ直せていない。'],
  [/。?照合では確かめ直していない/g, ''],
  [/（照合の記録）/g, ''],
  [/このプロジェクトの以前の調べ（[^）]*）の値で、今回の検索では表が途中で切れていて確かめられず。?/g, '以前の調べの値で、今回は確かめ直せていない。'],
  [/このプロジェクトの以前の調べ（[^）]*）の値で、今回の検索では確かめていない。?/g, '以前の調べの値で、今回は確かめ直していない。'],
  [/県のページはこの環境から開けず（404）、隣の調べ（都道府県の制度）の検索結果の要約による。/g, '県のページは直接は確かめられていない（ページの概要による）。'],
  [/別のページに「([^」]*)」の条件の記載があるとの要約もあり、/g, '別のページに「$1」の条件があるとされ、'],
  [/市のページは直接開けず、検索結果の要約と市の報道発表の題名で確認。?/g, '市のページの概要と報道発表で確認。'],
  [/市のページは(直接)?開けず、検索結果の要約で確認。?/g, '市のページの概要で確認。'],
  [/（検索結果の要約）。市のページは直接開けなかった。?/g, '（市のページの概要）。'],
  [/は検索結果の要約では分からなかった/g, 'は分かっていない'],
  [/(\S+?)の公式ページの検索結果の要約）/g, '$1の公式ページの概要による）'],
  [/のページの検索結果の要約では/g, 'のページの概要では'],
  [/検索結果の要約では/g, 'ページの概要では'],
  [/（検索結果の要約）/g, '（ページの概要による）'],
  [/検索結果の要約（2026-11-01）/g, '2026年11月1日に確認（ページの概要）'],
  [/（額は要約に出ず未確認）/g, '（額は未確認）'],
  [/は要約に出ず未確認/g, 'は未確認'],
  [/は要約で読めず/g, 'は未確認'],
  [/年度の記載は要約に出ず。2026年11月1日の検索で掲載を確認/g, '年度の記載なし。2026年11月1日に掲載を確認'],
  [/（県の外郭サイトの要約）/g, '（県の関連サイトによる）'],
  [/（今回の検索の要約）/g, ''],
  [/、要約）/g, '）'],
  [/（要約）/g, ''],
  [/の資料が検索に出た/g, 'の資料あり'],
  [/ページの題名は「([^」]*)」（その時点の掲載。/g, 'ページには「$1」とある（'],
  [/（題名だけ確認）/g, '（中身は未確認）'],
  [/が検索結果に出たが、直接は開けなかった/g, 'があるが、中身は未確認'],
  [/。市町村ごとの一覧は見ていない。）/g, '。市町村ごとの実施は未確認）'],
  [/既存の調べ（cities20、2026-11-01）/g, '2026年11月1日の調べ'],
]
const plainNote = (s) => PLAIN.reduce((a, [re, to]) => a.replace(re, to), s || '').replace(/。。/g, '。').trim()
// 出典の名前のかっこ書きから、調べた作業の言葉を除く
const LABEL_PLAIN = [
  [/。?(検索結果の|検索の)要約(で確認)?(。ページは直接開けず|。curlでは404|。www\.chisou\.go\.jp は404で直接は読めず)?/g, ''],
  [/（題名だけ確認。県のサイトはつながらず中身は未確認）/g, '（中身は未確認）'],
  [/（記事の題名だけ）/g, ''],
  [/（既存の調べ cities20 (より|で確認済)）/g, ''],
  [/。既存の調べ cities20 (より|で確認済)/g, ''],
  [/※題名だけ検索で確認、中身は未読/g, '（中身は未確認）'],
  [/。前の調べ（data\.ts）の出典。今回は開けていない/g, ''],
  [/（）/g, ''],
]
const plainLabel = (s) => LABEL_PLAIN.reduce((a, [re, to]) => a.replace(re, to), s || '').trim()

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
// 年齢の書き方は「就学前」か「◯歳年度末」。読めない書き方が来たら止める（null の年齢が「確認済」で入らないように）
const age = (s, where) => {
  if (s === '就学前') return 6
  const m = (s || '').match(/^(\d+)歳/)
  if (!m) throw new Error(`${medFile} の年齢が読めない: ${where} 「${s}」（書式は「就学前」か「◯歳年度末」）`)
  return Number(m[1])
}
const medical = {}
for (const r of csv(medFile)) {
  const where = `${r.pref}${r.name}`
  medical[r.pref + r.name] = [age(r.tsuin, where), age(r.nyuin, where), r.income_limit_tsuin === '有' ? 1 : 0, r.copay_tsuin === '有' ? 1 : 0, r.note || '']
}
// about.html の医療費の文は手で書いている。版が変わったら書き換えるよう知らせる
{
  const about = readFileSync(new URL('../site/public/about.html', import.meta.url), 'utf8')
  if (!about.includes(`（${MEDICAL_META.asOf}時点）`)) console.warn(`注意: site/public/about.html の子どもの医療費の出典を「${MEDICAL_META.asOf}時点」に書き換えてください`)
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
// [無料(1)・無料でない(0)・前は無料で今年度は確認中(2), 確からしさの番号, 時点の文の番号, メモの文の番号, 出典の番号[]]
// 今年度（2026年度）も続いているか分からない行（青森県・和歌山県の2024年度からの無償化）は、計算には入れない（画面は「確認中」）
const STALE_LUNCH = /2026年度(は|の継続は)未確認/
const lunch = {}
const lunchSkip = {}
for (const r of lunchRows) {
  if (!['全員', 'なし', '一部'].includes(r.jh_free)) { lunchSkip[r.jh_free] = (lunchSkip[r.jh_free] ?? 0) + 1; continue }
  const stale = STALE_LUNCH.test(r.as_of)
  if (stale && r.jh_free !== '全員') { lunchSkip[`${r.jh_free}（今年度は未確認）`] = (lunchSkip[`${r.jh_free}（今年度は未確認）`] ?? 0) + 1; continue }
  let conf = r.jh_confidence === '確認済' ? '確認済' : '推定'
  if (conf === '確認済' && !/2026/.test(r.as_of)) conf = '推定'
  if (stale) conf = '仮置き'
  const sources = splitSources(r.source_label, r.source_url)
  if (!sources.length) throw new Error(`給食の出典がない: ${r.code}`)
  // 20市調査の行の「（この行は、…）」は、取り込みの経緯なので画面には出さない
  const note = plainNote(r.note.replace(/（この行は、.*$/, '').trim())
  const partial = r.jh_free === '一部' ? '全員は無料ではない（第3子以降など一部の子だけ0円）。' : ''
  lunch[r.code] = [stale ? 2 : r.jh_free === '全員' ? 1 : 0, confNo(conf), t(plainNote(r.as_of)), t(partial + note), sources]
}

// ---------- 移住支援金 ----------
// s: 'yes' 実施 / 'none' 実施なし / 'part' 一部の地域だけ / 'unknown' 東京圏の条件不利地域で、実施しているか分からない（画面は「準備中」）
// 東京圏の外の未確認は入れない（画面は「準備中」）。対象外（東京圏の条件不利地域でない街）も入れない（決まりの上で移住先にならない）
const TOKYO_AREA = ['東京都', '埼玉県', '千葉県', '神奈川県']
const iju = {}
const ijuCount = {}
const man = (s) => Number(s) * 10000
for (const r of ijuRows) {
  ijuCount[r.implements] = (ijuCount[r.implements] ?? 0) + 1
  const s = { 実施: 'yes', 実施なし: 'none', 一部地域: 'part', 未確認: TOKYO_AREA.includes(r.pref) ? 'unknown' : undefined }[r.implements]
  if (!s) continue
  const conf = r.note.startsWith('【推定】') ? '推定' : r.note.startsWith('【確認済】') ? '確認済' : '仮置き'
  const note = s === 'unknown'
    ? '東京圏の条件不利地域（23区から移る家族の移住先になりうる街）。移住支援事業を実施しているかは、まだ確かめられていない'
    : plainNote(r.note.replace(/^【[^】]*】/, '').trim())
  const rec = { s, conf: confNo(conf), asOf: t(plainNote(r.as_of)), note: t(note), src: splitSources(r.source_label, r.source_url) }
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
// 所得の条件があるか確かめていない無償化の、年収の目安（万円）。これより下の年収帯は0円、これにかかる年収帯と上の年収帯は「確認中」にする。
// 県の基準が分かっている制度は、その額（MAYBE_CAP・県の基準）。どれも「確かめた額」ではないので、画面では額を言わず「所得の条件は確認中」と書く
const UNSURE_CAP = 600
const MAYBE_CAP = {
  やまなし子育て応援事業: { cap: 640, note: '県の別のページに「所得割169,000円未満（国の基準の第5階層まで、年収約640万円未満）」の条件があるとされ、確かめられていないので、それより上の年収帯は確認中にしている' },
}
// 県の基準の額（市町村の一覧に所得の条件が書かれていないとき、目安に使う）
const PREF_CAP = { 秋田県: 640 }
const UNSURE_NOTE = (cap) => `（所得の条件があるかは確かめていないので、年収${cap}万円以上の年収帯は確認中にしている）`
// 県の説明から全市町村に広げた制度に添える一言と、時点の書き直し（県のページで確かめた更新日）
const PREF_WIDE_NOTE = '（県の説明から全市町村と推定。市町村ごとの実施は未確認）'
const AS_OF_FIX = { いわて子育て応援保育料無償化事業: '県のページ（更新日2024年3月13日）' }
// 公式でない根拠（民間のまとめ）か、中身を開けなかった公式ページか（今年度の記事でなければ、これだけを根拠にしない）
const weakSource = (s) => PRIVATE.test(s.url) || /検索結果の要約で確認/.test(s.label)
const thisYear = (asOf) => /2026|令和8年/.test(asOf || '')

const muni = json('muni-nursery-policies.json')
for (const r of muni) {
  const text = `${r.detail ?? ''} ${r.since_note ?? ''} ${r.as_of ?? ''}`
  const unsure = r.income_limit === '未確認'
  const why =
    r.policy === 'free_scope_unknown' ? '対象（第1子からか第2子からか）が未確認'
    : r.program === '阿波っ子はぐくみ保育料助成事業' ? '県の説明で支援の中身が市町村ごとに違うとされ、市町村ごとの実施が未確認（手挙げの制度）'
    : r.policy === 'first_free_income' && !r.income_limit_annual_man_yen ? '第1子の無償に所得の条件があるが、その額が分からない'
    : r.sources.every((s) => PRIVATE.test(s.url)) && !thisYear(r.as_of) ? '民間のまとめだけが根拠で、今年度の記事ではない'
    : r.sources.every(weakSource) && !thisYear(r.as_of) ? '民間のまとめと、中身を開けなかった公式ページだけが根拠で、今年度の記事ではない'
    : r.policy === 'first_free' && unsure && /予定/.test(text) ? '令和8年度からの「予定」（報道）としか分からず、実施を市町村の資料で確かめていない'
    : r.policy === 'first_free' && /第1子を含むと(は)?明記(されていない|はない)/.test(text) ? '0〜2歳の第1子を含むとは書かれていない'
    : r.policy === 'first_free_partial' && unsure ? '一部の年齢だけの無償化で、所得の条件があるか分からない'
    : ''
  if (why) { skipped.push({ code: r.code, name: `${r.pref}${r.name}`, policy: r.policy, why }); continue }
  let conf = r.confidence === '確認済' && isCurrent(r.as_of) ? '確認済' : '推定'
  if (PREF_WIDE.has(r.program)) conf = '推定'
  // 所得の条件があるか分からない制度は、年収の目安で分けて計算するので「確認済」にしない
  if (unsure) conf = weaker(conf, '推定')
  const count = r.sibling_count === 'household' ? 'household' : r.sibling_count === 'together' ? 'together' : null
  let note = plainNote(r.detail)
  if (PREF_WIDE.has(r.program) && !/東京都/.test(r.program) && !/市町村ごとの実施/.test(note)) note += PREF_WIDE_NOTE
  const rule = { conf, asOf: plainNote(AS_OF_FIX[r.program] ?? r.as_of), note, src: r.sources.map((s) => src(s.label, s.url)), via: r.program || r.policy }
  const unsureCap = MAYBE_CAP[r.program]?.cap ?? PREF_CAP[r.pref] ?? UNSURE_CAP
  if (r.policy === 'first_free') {
    if (unsure) { rule.firstFreeUnder = unsureCap; rule.firstUnsure = true; rule.note += UNSURE_NOTE(unsureCap) }
    else rule.firstFree = true
  } else if (r.policy === 'first_free_income') rule.firstFreeUnder = r.income_limit_annual_man_yen
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
    } else if (unsure) {
      rule.secondFreeUnder = unsureCap
      rule.secondUnsure = true
      rule.note += MAYBE_CAP[r.program] ? `（${MAYBE_CAP[r.program].note}）` : UNSURE_NOTE(unsureCap)
    }
    if (SECOND_ONLY.has(r.program)) rule.secondOnly = true
    if (!count) rule.note += '（2人目の数え方が分からないので、国の基準どおり、同時に保育園などに通う子で数えている）'
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
          conf: '推定', asOf: plainNote(pr.asOf), via: pr.name,
          note: plainNote(`${p.pref}の${pr.name}：${pr.content}${pr.coverageNote ? `（${pr.coverageNote}）` : ''}`),
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
// 所得の条件（年収の目安）は、どれかの規則で0円になれば0円なので、いちばん高い額を使う。
// 条件があるか分からない規則が1つでもあれば、その額より上の年収帯は「確認中」（ffx・sfx・tfx）
const capOf = (rs, key, unsureKey) => {
  if (!rs.length || !rs.every((r) => r[key])) return {}
  return { cap: Math.max(...rs.map((r) => r[key])), unsure: rs.some((r) => r[unsureKey]) }
}
const nursery = {}
for (const [code, list] of rules) {
  const o = { conf: 0, src: [], notes: [], asOf: [], via: [] }
  const firstFree = list.some((r) => r.firstFree)
  if (firstFree) o.ff = 1
  const fc = capOf(list.filter((r) => r.firstFreeUnder), 'firstFreeUnder', 'firstUnsure')
  if (!firstFree && fc.cap) { o.ffu = fc.cap; if (fc.unsure) o.ffx = 1 }
  const sec = list.filter((r) => r.secondFree)
  if (sec.length) {
    o.sf = 1
    const sc = capOf(sec, 'secondFreeUnder', 'secondUnsure')
    if (sc.cap) { o.sfu = sc.cap; if (sc.unsure) o.sfx = 1 }
    if (sec.every((r) => r.secondOnly)) o.so = 1
    o.sc = sec.some((r) => r.secondCount === 'household') ? 'h' : 't'
  }
  // 3人目以降：3人目の制度（鳥取県）と、2人目からの制度（2人目だけの制度は除く）。2人目の所得の条件は3人目にも付ける
  const third = list.filter((r) => r.thirdFree || (r.secondFree && !r.secondOnly))
  if (third.length) {
    o.tf = 1
    o.tc = third.some((r) => r.thirdCount === 'household' || r.secondCount === 'household') ? 'h' : 't'
    const tc = capOf(third.map((r) => (r.thirdFree ? {} : r)), 'secondFreeUnder', 'secondUnsure')
    if (tc.cap) { o.tfu = tc.cap; if (tc.unsure) o.tfx = 1 }
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
    ...(o.ff ? { ff: 1 } : {}), ...(o.ffu ? { ffu: o.ffu } : {}), ...(o.ffx ? { ffx: 1 } : {}),
    ...(o.sf ? { sf: 1, sc: o.sc } : {}), ...(o.sfu ? { sfu: o.sfu } : {}), ...(o.sfx ? { sfx: 1 } : {}), ...(o.so ? { so: 1 } : {}),
    ...(o.tf ? { tf: 1, tc: o.tc } : {}), ...(o.tfu ? { tfu: o.tfu } : {}), ...(o.tfx ? { tfx: 1 } : {}), ...(o.fa !== undefined ? { fa: o.fa } : {}),
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

// 中学校の給食費: [無料なら1・無料でないなら0・前は無料だったが今年度も続いているか分からないなら2, 確からしさ, 時点(NAT_TEXTS), メモ(NAT_TEXTS), 出典(NAT_SOURCES)[]]。
// 表にない街と、2の街は分からない（確認中）
export const LUNCH: Record<string, [0 | 1 | 2, 0 | 1 | 2, number, number, number[]]> = ${JSON.stringify(sorted(lunch))}

// 移住支援金: s = yes 実施 / none 実施なし / part 一部の地域だけ / unknown 東京圏の条件不利地域で、実施しているか分からない（準備中）
// f 世帯の額、c 子1人の加算、s1 単身の額（分かる街だけ）、fu は世帯の額が「最大」（国の上限。市町村で少ないことがある）、cu は子どもの加算の額が分からない（c は国の上限）
// cn は加算の条件（例: 2026年4月1日以降の転入）。表にない街は分からない（準備中）。東京圏の条件不利地域でない街（対象外）は入れていない
export interface NatIju { s: 'yes' | 'none' | 'part' | 'unknown'; f?: number; c?: number; s1?: number; fu?: 1; cu?: 1; cn?: number; conf: number; asOf: number; note: number; src: number[] }
export const IJU: Record<string, NatIju> = ${JSON.stringify(sorted(iju))}

// 0〜2歳の保育料の制度（国の基準より有利になる分）
//   ff 第1子から0円 / ffu 第1子の0円に所得の条件（年収の目安・万円） / sf 2人目0円 / sfu 2人目の0円の所得の条件 / so 2人目だけ（3人目以降は国の基準）
//   sc 2人目の数え方（h 同じ世帯の子 / t 同時に通う子） / tf 3人目以降0円 / tfu 3人目の0円の所得の条件 / tc 3人目の数え方 / fa この年齢（歳児クラス）からは第1子も0円
//   ffx・sfx・tfx … 所得の条件があるか確かめていない（ffu・sfu・tfu は年収の目安。その額にかかる年収帯と上の年収帯は確認中）
//   conf 確からしさ / cc 数え方の確からしさ / asOf 時点 / note メモ / src 出典
export interface NatNursery { ff?: 1; ffu?: number; ffx?: 1; sf?: 1; sfu?: number; sfx?: 1; so?: 1; sc?: 'h' | 't'; tf?: 1; tfu?: number; tfx?: 1; tc?: 'h' | 't'; fa?: number; conf: number; cc?: number; asOf: number; note: number; src: number[] }
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
  `lunch ${Object.keys(lunch).length}（無料 ${cnt(lunch, (v) => v[0] === 1)}・無料でない ${cnt(lunch, (v) => v[0] === 0)}・今年度は確認中 ${cnt(lunch, (v) => v[0] === 2)}）`,
  `iju ${Object.keys(iju).length}（実施 ${cnt(iju, (v) => v.s === 'yes')}〈子の加算の額が分かる ${cnt(iju, (v) => v.s === 'yes' && !v.cu)}〉・実施なし ${cnt(iju, (v) => v.s === 'none')}・一部 ${cnt(iju, (v) => v.s === 'part')}・東京圏で未確認 ${cnt(iju, (v) => v.s === 'unknown')}）`,
  `nursery ${Object.keys(nursery).length}（第1子0円 ${cnt(nursery, (v) => v.ff)}・第1子に所得の条件 ${cnt(nursery, (v) => v.ffu)}〈あるか未確認 ${cnt(nursery, (v) => v.ffx)}〉・2人目0円 ${cnt(nursery, (v) => v.sf)}〈所得の条件 ${cnt(nursery, (v) => v.sfu)}・あるか未確認 ${cnt(nursery, (v) => v.sfx)}〉・3人目0円 ${cnt(nursery, (v) => v.tf)}〈所得の条件 ${cnt(nursery, (v) => v.tfu)}〉・年齢 ${cnt(nursery, (v) => v.fa !== undefined)}）`,
  `入れなかった保育料の行 ${skipped.length}`,
  `sources ${SOURCES.length}, texts ${TEXTS.length}, ${(ts.length / 1024).toFixed(0)} KB`,
].join('\n'))
for (const c of Object.keys(nursery)) if (!NAME[c]) throw new Error(`保育料の制度のコードが一覧にない: ${c}`)
