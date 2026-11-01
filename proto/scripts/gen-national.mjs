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
//   - 県の制度は、実施している市町村のコードがあり、サイトの計算で表せて、国の基準より有利になるものだけ入れる（PREF_IMPORT）。
//     県の今年度の一覧（市町村ごとの欄）で実施が分かるものは「確認済」まで、県が「全市町村で」と書いているだけのものは「推定」まで
//   - 1つの街の確からしさは、計算に効いている規則で決める（ほかの規則で同じ結果になる、弱い規則は数えない）
//   - 移住支援金の受付が今年度は終わった・止まった街は、額を出しつつ、そう書く（受付終了の値 cl）
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
  [/内閣府の一覧では「○」だが、市の全体の額としては使わない。/g, ''],
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
  // 頭の【確認済】【推定】（確からしさは jh_confidence で持つ）と、20市調査の行の「（この行は、…）」（取り込みの経緯）は、画面には出さない
  const note = plainNote(r.note.replace(/^【[^】]*】/, '').replace(/（この行は、.*$/, '').trim())
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
    // 子どもの加算：「1人◯万円」ならその額（「1人0万円」は加算なし）、
    // 「最大◯万円（市のページ）」は街のページが「最大」と書いている額（額は分かる。もっと少ないことがある）、
    // 「最大100万円」だけは国の上限で、この街の額は分からない
    const per = r.child_addition.match(/^1人(\d+)万円/)
    const cityMax = r.child_addition.match(/^最大(\d+)万円（[^）]*(市|町|村)のページ）/)
    if (per) rec.c = man(per[1])
    else if (cityMax) { rec.c = man(cityMax[1]); rec.cm = 1 }
    else if (/最大(\d+)万円/.test(r.child_addition)) { rec.c = man(r.child_addition.match(/最大(\d+)万円/)[1]); rec.cu = 1 }
    else throw new Error(`子どもの加算が読めない: ${r.code} ${r.child_addition}`)
    // 加算の条件（例: 2026年4月1日以降の転入）。「子育て加算なし」は加算の額（0円）で分かるので、条件の文からは除く
    const cond = r.child_addition.match(/（([^）]*)）/)
    const condText = cond ? cond[1].split('。').filter((x) => x && !/加算(なし|は無い|はない)/.test(x)).join('。') : ''
    if (condText && per) rec.cn = t(condText)
    // 今年度の受付が、予算の上限に達して終わった・止まった街
    const cl = closedText(r.note)
    if (cl) rec.cl = t(cl)
  }
  iju[r.code] = rec
}
// メモの「…受付を終了した」「…受付を一旦停止している」から、受付の状況の短い文を作る（予算に達すると終わる「ことがある」は入れない）
function closedText(note) {
  const m = note.match(/受付(を|は)[^。]*?(終了した|停止している)/)
  if (!m) return ''
  // その文より前で、いちばん近い「◯◯のページ（YYYY年M月D日更新）」を時点にする
  const pages = [...note.slice(0, m.index).matchAll(/([^\s。:：、（）]+?)のページ（(\d{4}年\d{1,2}月\d{1,2}日)更新）/g)]
  const page = pages.at(-1)
  return `令和8年度の受付は、予算の上限に達して${m[2] === '停止している' ? '停止中' : '終了'}${page ? `（${page[1]}のページ、${page[2]}更新）` : ''}`
}

// ---------- 0〜2歳の保育料（市区町村の一覧 ＋ 県の制度） ----------
// 1つの街に、いくつかの制度がかさなることがある（例: 県の第2子の無償化と、町の2歳児の無償化）
const rules = new Map() // code → 規則の配列
const addRule = (code, rule) => { if (!rules.has(code)) rules.set(code, []); rules.get(code).push(rule) }
const skipped = [] // 入れなかったもの（理由つき。coverage と README のため）
const replaced = [] // 市区町村の一覧の行のうち、県の制度（PREF_IMPORT）で入れ直したもの

// 民間のサイト（まとめ・解説）。今年度の記事でなければ根拠にしない
const PRIVATE = /craftsman\.fun|pulmo\.jp|cckuma\.com/
// 県の説明（全市町村で、など）から市町村に広げたもの。市町村ごとには確かめていないので「推定」まで
const PREF_WIDE = new Set([
  'いわて子育て応援保育料無償化事業',
  'やまぐち子育て応援第2子以降保育料無償化事業',
  '大分県 3歳未満児（第2子以降）の保育料助成',
  '子だくさんふくいプロジェクト（第2子以降の保育料無償化）',
  '東京都 保育所等利用世帯負担軽減事業（保育料等第一子無償化）',
])
// 所得の条件があるか確かめていない無償化の、年収の目安（万円）。これより下の年収帯は0円、これにかかる年収帯と上の年収帯は「確認中」にする。
// 県の基準が分かっている県は、その額（PREF_CAP）。どれも「確かめた額」ではないので、画面では額を言わず「所得の条件は確認中」と書く
const UNSURE_CAP = 600
// 県の基準の額（市町村の一覧に所得の条件が書かれていないとき、目安に使う）
const PREF_CAP = { 秋田県: 640 }
const UNSURE_NOTE = (cap) => `（所得の条件があるかは確かめていないので、年収${cap}万円以上の年収帯は確認中にしている）`
// 県の説明から全市町村に広げた制度に添える一言と、時点の書き直し（県のページで確かめた更新日）
const PREF_WIDE_NOTE = '（県の説明から全市町村と推定。市町村ごとの実施は未確認）'
const AS_OF_FIX = { いわて子育て応援保育料無償化事業: '県のページ（更新日2024年3月13日）・令和8年度当初予算（案）' }
// 公式でない根拠（民間のまとめ）か、中身を開けなかった公式ページか（今年度の記事でなければ、これだけを根拠にしない）
const weakSource = (s) => PRIVATE.test(s.url) || /検索結果の要約で確認/.test(s.label)
const thisYear = (asOf) => /2026|令和8年/.test(asOf || '')

// ---- 県の制度（pref-nursery-east.json・pref-nursery-west.json）----
// 入れる制度。キーは east は id、west は「県/制度の名前」。
//   basis: list      … 県の一覧（市町村ごとの欄）や交付決定の一覧で、実施している市町村が分かる。今年度の資料で、制度が確認済なら「確認済」
//          statement … 県が「全市町村で」「市町（高松市を除く）」のように書いているだけ。市町村ごとには確かめていないので「推定」まで
//   rule:  計算の規則（firstFree 第1子から0円 / secondFree 2人目0円〈secondFreeUnder は所得の条件の年収〉/ secondHalfHome 2人目半額を同じ世帯の子で数える /
//          thirdFree 3人目以降0円〈thirdCount: household は同じ世帯の子で数える〉）
//   supersedes: この制度で入れ直す、市区町村の一覧の制度の名前（県の資料で確かめ直した内容のほうを使う）
//   note: 画面に出すメモ（県の資料の言葉を、使う人に向けて短くしたもの）
const PREF_IMPORT = {
  'aomori-musyoka-menu': {
    basis: 'list', rule: { firstFree: true },
    supersedes: ['青森県 学校給食費無償化等子育て支援市町村交付金（保育料無償化事業）'],
    note: '青森県の一覧（令和8年9月18日時点）で、0〜2歳児の保育料を「完全無償化」している市町村（県の交付金の推奨事業）。県の一覧は「完全無償化」と「一部無償化」を分けて書いている（市町村ごとの案内では確かめていない）。',
  },
  'akita-sukoyaka-second': {
    basis: 'list', rule: { secondFree: true, secondFreeUnder: 640 },
    supersedes: ['すこやか子育て支援事業（県と市町村で1/2ずつ）'],
    note: '秋田県の一覧（令和8年4月1日現在）で、県の基準（すこやか子育て支援事業）以上の保育料の助成をしている市町村。県の基準では、第2子以降の保育料を全額助成（保育所は世帯年収約640万円まで）。2人目の数え方は書かれていないので、国の基準どおり、同時に保育園などに通う子で数えている。',
  },
  'tochigi-second-free': {
    basis: 'statement', rule: { secondFree: true, secondCount: 'household', thirdFree: true, thirdCount: 'household' },
    supersedes: ['栃木県 第2子保育料免除事業'],
    note: '栃木県の第2子以降保育料等免除事業（県の子育て応援サイトに「県内すべての市町で」とある。市町ごとの案内では確かめていない）：生計が同じ同一世帯の18歳未満の子のうち、2人目の0〜2歳児の保育料を免除（2024年10月から）。3人目以降も免除。上の子が卒園していても、別の園でも対象。所得制限なし。令和8年度も続いているかは、県の予算資料では確かめていない。',
  },
  'yamanashi-ouen': {
    basis: 'statement', rule: { secondFree: true, secondCount: 'household', secondFreeUnder: 640 },
    supersedes: ['やまなし子育て応援事業'],
    note: '山梨県のやまなし子育て応援事業（県のページに「平成28年4月から県内全ての市町村で実施」とある。市町村ごとの案内では確かめていない）：生計が同じ第1子がいれば、第1子の年齢を問わず（19歳以上も含む）、第2子以降の0〜2歳児の保育料を無料。世帯の市町村民税所得割が169,000円未満（年収約640万円未満）の世帯が対象。令和8年度も続いているかは、県の予算資料では確かめていない。',
  },
  'nagano-tashi-third': {
    basis: 'statement', rule: { thirdFree: true, thirdCount: 'household' },
    note: '長野県の保育料軽減事業（県のページに「令和７年度から全市町村で支援を実施」とある。市町村ごとの案内では確かめていない）：国の「同時に通う」の条件にかかわらず、0〜2歳児の第2子は半額、第3子以降は無料（所得の区分なし）。上の子の年齢の上限は未確認。',
  },
  'nagano-tashi-second': {
    basis: 'statement', rule: { secondHalfHome: true },
    note: '長野県の保育料軽減事業（県のページに「令和７年度から全市町村で支援を実施」とある。市町村ごとの案内では確かめていない）：国の「同時に通う」の条件にかかわらず、0〜2歳児の第2子は半額、第3子以降は無料（所得の区分なし）。上の子の年齢の上限は未確認。',
  },
  '鳥取県/県独自の保育料軽減（第3子以降）': {
    basis: 'list', rule: { thirdFree: true, thirdCount: 'household' }, asOf: '2026年4月時点（県の「保育料等の無償化・軽減内容一覧」）',
    note: '鳥取県の一覧（令和8年4月時点）で、県内19市町村すべてが、同じ世帯の第3子以降の0〜2歳児の保育料を原則無償（同時に通っていなくても。県と市町村で半分ずつ負担）。上の子の年齢の上限は書かれていない。',
  },
  '香川県/第３子以降保育料等免除事業（多子世帯の保育料の免除）': {
    basis: 'statement', rule: { thirdFree: true, thirdCount: 'household' }, asOf: '令和8年度主要事業の概要（2026年2月）',
    note: '香川県の第３子以降保育料等免除事業（令和8年度予算。県の資料は実施主体を「市町（高松市除く）」としている。市町ごとの案内では確かめていない）：おおむね18歳までのいちばん上の子を第1子と数えて、第3子以降の3歳未満の保育料を免除（所得制限なし）。',
  },
  '三重県/みえ子ども・子育て応援総合補助金（市町の独自事業への補助）': {
    // 令和8年度の交付決定（町の事業の計画）。町の案内と開始の月は確かめていないので「推定」まで
    basis: 'list', maxConf: '推定', rule: { firstFree: true }, asOf: '令和8年度の交付決定（2026年5月27日発表）',
    note: '三重県の補助金（みえ子ども・子育て応援総合補助金）の令和8年度の交付決定で、御浜町の「保育料無償化事業」：国の無償化に加えて、町独自に0〜2歳児の保育料を全世帯対象に無償化（延長保育料も）。町の案内と、始まる月は確かめていない。',
  },
}
// 実施している市町村のコードはあるが、入れない制度と、その理由
const PREF_SKIP = {
  'akita-sukoyaka-partial': '第1子などの一部の助成（2分の1・4分の1）で、サイトの計算（0円か半額）では表せない',
  'nagano-low-income': '年収約360万円未満の世帯だけで、サイトの年収帯（400万円未満）の途中に境目がある',
  'saitama-tashi-musyoka': 'data.ts で県内63市町村に入れている（全63市町村での実施は、県議会での議員の発言による）',
  'toyama-third-free': '第3子の数え方が分からず、国の基準（同時に通う3人目は0円）と同じ計算になる',
  'fukui-second-free': '市区町村の一覧に同じ制度が入っている（17市町）',
  'tokyo-second-free': '区市町の第1子からの無償化（市区町村の一覧。23区は data.ts）が入っていて、2人目の制度は計算に効かない',
  'tokyo-first-free': '都の実績（令和7年度。23区26市5町3村）から、市区町村の一覧に入っている（23区は data.ts）',
  'iwate-ouen-musyoka': '県のページの「第2子以降については年齢にかかわらず、保育料が無償化」から、市区町村の一覧に入っている（33市町村。推定）',
  '兵庫県/ひょうご保育料軽減事業（第1子）': '保育料の一部の補助（月1万円まで等）で0円にはならず、実施している市町の範囲も分からない',
  '兵庫県/ひょうご保育料軽減事業（第2子以降）': '保育料の一部の補助（月1万5千円まで等）で0円にはならず、実施している市町の範囲も分からない',
  '大分県/大分にこにこ保育支援事業（3歳未満児〈第2子以降〉の保育料の助成）': '県のページの「第2子以降は保育料が無料」から、市区町村の一覧に入っている（18市町村。推定）',
  '和歌山県/紀州っ子いっぱいサポート（第2子）': '年収約360万円未満の世帯だけで、サイトの年収帯（400万円未満）の途中に境目がある',
  '和歌山県/紀州っ子いっぱいサポート（第3子以降）': '第3子の数え方が分からず、国の基準（同時に通う3人目は0円）と同じ計算になる',
  '鳥取県/県独自の保育料軽減（低所得の世帯の第2子）': '年収約360万円未満の世帯だけで、サイトの年収帯（400万円未満）の途中に境目がある',
  '鳥取県/中山間地域市町村保育料無償化等モデル事業': '町ごとの中身は市区町村の一覧に入っている（9町）',
  '山口県/やまぐち子育て応援第2子以降保育料無償化事業': '市区町村の一覧に同じ制度が入っている（19市町）',
  '宮崎県/第2子保育料の負担軽減（子ども・若者プロジェクト）': '2人目の保育料を国の基準の半額から4分の1にする制度で、サイトの計算（0円か半額）では表せない',
}
const east = json('pref-nursery-east.json').prefectures
const west = json('pref-nursery-west.json')
// east と west を1つの形にそろえる
const prefPrograms = [
  ...east.flatMap((p) => p.programs.map((pr) => ({ key: pr.id, pref: p.pref, prefCode: p.prefCode, name: pr.name, codes: pr.implementingMunicipalityCodes ?? [], conf: pr.confidence, asOf: pr.asOf, sources: pr.sources, scope: pr.scope }))),
  ...west.flatMap((p) => (p.programs ?? []).map((pr) => ({ key: `${p.pref}/${pr.name}`, pref: p.pref, prefCode: p.prefCode, name: pr.name, codes: pr.implementingCodes ?? [], conf: pr.confidence, asOf: pr.asOf, sources: pr.sources, scope: pr.coverage }))),
]
for (const k of [...Object.keys(PREF_IMPORT), ...Object.keys(PREF_SKIP)]) if (!prefPrograms.some((pr) => pr.key === k)) throw new Error(`県の制度が材料にない: ${k}`)
const prefRules = [] // [市町村コード, 規則]
const superseded = new Map() // 市区町村の一覧の制度の名前 → 県の制度で入れ直す市町村コード
for (const pr of prefPrograms) {
  const imp = PREF_IMPORT[pr.key]
  if (!imp) {
    const why = PREF_SKIP[pr.key] ?? (pr.codes.length ? '国の基準より有利になるか分からない' : /^opt/i.test(pr.scope ?? '') ? '手挙げの制度で、実施している市町村の一覧がない' : '実施している市町村の範囲が分からない')
    skipped.push({ code: pr.prefCode, name: pr.pref, policy: pr.name, why, pref: true })
    continue
  }
  if (!pr.codes.length) throw new Error(`県の制度の市町村が空: ${pr.key}`)
  const asOf = imp.asOf ?? pr.asOf
  let conf = imp.basis === 'list' && pr.conf === '確認済' && isCurrent(asOf) ? '確認済' : '推定'
  if (imp.maxConf) conf = weaker(conf, imp.maxConf)
  for (const m of imp.supersedes ?? []) superseded.set(m, new Set([...(superseded.get(m) ?? []), ...pr.codes]))
  for (const code of pr.codes) prefRules.push([code, { ...imp.rule, conf, asOf: plainNote(asOf), note: imp.note, src: pr.sources.map((s) => src(s.label, s.url)), via: pr.name }])
}

const muni = json('muni-nursery-policies.json')
for (const r of muni) {
  // 県の資料で確かめ直した県の制度で入れ直す行（青森県・秋田県の今年度の一覧、栃木県・山梨県の県のページ）
  if (superseded.get(r.program)?.has(r.code)) { replaced.push({ code: r.code, name: `${r.pref}${r.name}`, program: r.program }); continue }
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
  const unsureCap = PREF_CAP[r.pref] ?? UNSURE_CAP
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
      rule.note += UNSURE_NOTE(unsureCap)
    }
    if (!count) rule.note += '（2人目の数え方が分からないので、国の基準どおり、同時に保育園などに通う子で数えている）'
  } else throw new Error(`知らない種類: ${r.policy}`)
  addRule(r.code, rule)
}
// 県の制度の規則は、市区町村の一覧の規則のあとに足す
for (const [code, rule] of prefRules) addRule(code, rule)
// 市区町村の一覧で入れなかった行のうち、県の制度で入った街（README・coverage 用）
for (const s of skipped) if (!s.pref && rules.has(s.code)) s.coveredByPref = true

// 1つの街の規則をまとめる。
// 所得の条件（年収の目安）は、どれかの規則で0円になれば0円なので、いちばん高い額を使う。
// 条件があるか分からない規則が1つでもあれば、その額より上の年収帯は「確認中」（ffx・sfx・tfx）
const capOf = (rs, key, unsureKey) => {
  if (!rs.length || !rs.every((r) => r[key])) return {}
  return { cap: Math.max(...rs.map((r) => r[key])), unsure: rs.some((r) => r[unsureKey]) }
}
// 規則の組から、計算に使う形（効果）を作る
function effectOf(list) {
  // 第1子から0円の街は、ほかの規則（2人目・3人目）が計算に効かない
  if (list.some((r) => r.firstFree)) return { ff: 1 }
  const o = {}
  const fc = capOf(list.filter((r) => r.firstFreeUnder), 'firstFreeUnder', 'firstUnsure')
  if (fc.cap) { o.ffu = fc.cap; if (fc.unsure) o.ffx = 1 }
  const sec = list.filter((r) => r.secondFree)
  if (sec.length) {
    o.sf = 1
    o.sc = sec.some((r) => r.secondCount === 'household') ? 'h' : 't'
    const sc = capOf(sec, 'secondFreeUnder', 'secondUnsure')
    if (sc.cap) { o.sfu = sc.cap; if (sc.unsure) o.sfx = 1 }
    if (sec.every((r) => r.secondOnly)) o.so = 1
  } else if (list.some((r) => r.secondHalfHome)) o.sh = 1 // 2人目は半額のまま、同じ世帯の子で数える（2人目0円の制度があれば効かない）
  // 3人目以降：3人目の制度と、2人目からの制度（2人目だけの制度は除く）。2人目の所得の条件は3人目にも付ける
  const third = list.filter((r) => r.thirdFree || (r.secondFree && !r.secondOnly))
  if (third.length) {
    o.tf = 1
    o.tc = third.some((r) => r.thirdCount === 'household' || r.secondCount === 'household') ? 'h' : 't'
    const tc = capOf(third.map((r) => (r.thirdFree ? {} : r)), 'secondFreeUnder', 'secondUnsure')
    if (tc.cap) { o.tfu = tc.cap; if (tc.unsure) o.tfx = 1 }
  }
  const fa = list.filter((r) => r.freeFromAge !== undefined).map((r) => r.freeFromAge)
  if (fa.length) o.fa = Math.min(...fa)
  return o
}
const effectKey = (list) => JSON.stringify(effectOf(list))
const nursery = {}
const nurseryDropped = {} // 計算に効かず、確からしさに数えなかった規則（街ごとの数。README 用）
for (const [code, list] of rules) {
  // 確からしさは、計算に効いている規則で決める。確かな規則から順に、効果が変わる規則だけを残す
  // （例: 長野市の第2子以降0円〈市のページ〉があれば、県の「全市町村で」の制度〈推定〉は同じ結果なので数えない）
  const order = list.map((r, i) => [r, i]).sort((a, b) => confNo(a[0].conf) - confNo(b[0].conf) || a[1] - b[1]).map(([r]) => r)
  let kept = []
  for (const r of order) if (effectKey([...kept, r]) !== effectKey(kept)) kept.push(r)
  if (effectKey(kept) !== effectKey(list)) kept = list
  // 残した規則と同じくらい確かな規則は、根拠として時点・メモ・出典に添える（第1子から0円の街では、第1子の規則だけ）
  const floor = Math.max(...kept.map((r) => confNo(r.conf)))
  const ff = list.some((r) => r.firstFree)
  const used = list.filter((r) => kept.includes(r) || (confNo(r.conf) <= floor && (!ff || r.firstFree)))
  if (used.length < list.length) nurseryDropped[code] = list.length - used.length
  let conf = '確認済'
  const notes = [], asOf = [], srcs = []
  for (const r of used) {
    conf = weaker(conf, r.conf)
    srcs.push(...r.src)
    if (!notes.includes(r.note)) notes.push(r.note)
    if (!asOf.includes(r.asOf)) asOf.push(r.asOf)
  }
  // 数え方（同じ世帯の子で数える）を言っている規則の確からしさ（第1子から0円の街では使わない）
  const hh = ff ? [] : used.filter((r) => r.secondCount === 'household' || r.thirdCount === 'household' || r.secondHalfHome)
  const cc = hh.reduce((a, r) => weaker(a, r.conf), '確認済')
  nursery[code] = {
    ...effectOf(list), conf: confNo(conf), ...(hh.length ? { cc: confNo(cc) } : {}),
    asOf: t(asOf.join('／')), note: t(notes.join('／')), src: [...new Set(srcs)],
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
// f 世帯の額、c 子1人の加算（0 は加算なし）、s1 単身の額（分かる街だけ）、fu は世帯の額が「最大」（国の上限。市町村で少ないことがある）、cu は子どもの加算の額が分からない（c は国の上限）
// cm は子どもの加算を街のページが「最大」の額で書いている（c はその額。もっと少ないことがある）。cn は加算の条件（例: 2026年4月1日以降の転入）
// cl は今年度の受付が予算の上限に達して終わった・止まったこと（NAT_TEXTS。額は出すが、そう断る）
// 表にない街は分からない（準備中）。東京圏の条件不利地域でない街（対象外）は入れていない
export interface NatIju { s: 'yes' | 'none' | 'part' | 'unknown'; f?: number; c?: number; s1?: number; fu?: 1; cu?: 1; cm?: 1; cn?: number; cl?: number; conf: number; asOf: number; note: number; src: number[] }
export const IJU: Record<string, NatIju> = ${JSON.stringify(sorted(iju))}

// 0〜2歳の保育料の制度（国の基準より有利になる分）
//   ff 第1子から0円 / ffu 第1子の0円に所得の条件（年収の目安・万円） / sf 2人目0円 / sfu 2人目の0円の所得の条件 / so 2人目だけ（3人目以降は国の基準）
//   sc 2人目の数え方（h 同じ世帯の子 / t 同時に通う子） / sh 2人目は半額のまま、同じ世帯の子で数える（長野県。国の基準は同時に通う子だけ）
//   tf 3人目以降0円 / tfu 3人目の0円の所得の条件 / tc 3人目の数え方 / fa この年齢（歳児クラス）からは第1子も0円
//   第1子から0円の街（ff）は、ほかの規則が計算に効かないので ff だけを持つ
//   ffx・sfx・tfx … 所得の条件があるか確かめていない（ffu・sfu・tfu は年収の目安。その額にかかる年収帯と上の年収帯は確認中）
//   conf 確からしさ / cc 数え方の確からしさ / asOf 時点 / note メモ / src 出典
export interface NatNursery { ff?: 1; ffu?: number; ffx?: 1; sf?: 1; sfu?: number; sfx?: 1; so?: 1; sc?: 'h' | 't'; sh?: 1; tf?: 1; tfu?: number; tfx?: 1; tc?: 'h' | 't'; fa?: number; conf: number; cc?: number; asOf: number; note: number; src: number[] }
export const NURSERY: Record<string, NatNursery> = ${JSON.stringify(sorted(nursery))}
`
writeFileSync(new URL('../src/shared/national.ts', import.meta.url), ts)

// 入れなかったものの記録（README・coverage 用。リポジトリには入れない一時ファイル）
const outSkip = process.argv[2]
if (outSkip) writeFileSync(outSkip, JSON.stringify({ skipped, replaced, nurseryDropped, lunchSkip, ijuCount }, null, 1))

const cnt = (o, f) => Object.values(o).filter(f).length
console.log([
  `medical ${Object.keys(medical).length}（${medFile}）`,
  `rent ${Object.keys(rent).length}`,
  `waiting ${Object.keys(waiting).length}（1人以上 ${cnt(waiting, (v) => v > 0)}）`,
  `lunch ${Object.keys(lunch).length}（無料 ${cnt(lunch, (v) => v[0] === 1)}・無料でない ${cnt(lunch, (v) => v[0] === 0)}・今年度は確認中 ${cnt(lunch, (v) => v[0] === 2)}）`,
  `iju ${Object.keys(iju).length}（実施 ${cnt(iju, (v) => v.s === 'yes')}〈子の加算の額が分かる ${cnt(iju, (v) => v.s === 'yes' && !v.cu)}・受付終了 ${cnt(iju, (v) => v.cl !== undefined)}〉・実施なし ${cnt(iju, (v) => v.s === 'none')}・一部 ${cnt(iju, (v) => v.s === 'part')}・東京圏で未確認 ${cnt(iju, (v) => v.s === 'unknown')}・確認済 ${cnt(iju, (v) => v.conf === 0)}）`,
  `nursery ${Object.keys(nursery).length}（第1子0円 ${cnt(nursery, (v) => v.ff)}・第1子に所得の条件 ${cnt(nursery, (v) => v.ffu)}〈あるか未確認 ${cnt(nursery, (v) => v.ffx)}〉・2人目0円 ${cnt(nursery, (v) => v.sf)}〈所得の条件 ${cnt(nursery, (v) => v.sfu)}・あるか未確認 ${cnt(nursery, (v) => v.sfx)}〉・2人目半額を同じ世帯で ${cnt(nursery, (v) => v.sh)}・3人目0円 ${cnt(nursery, (v) => v.tf)}〈所得の条件 ${cnt(nursery, (v) => v.tfu)}〉・年齢 ${cnt(nursery, (v) => v.fa !== undefined)}・確認済 ${cnt(nursery, (v) => v.conf === 0)}）`,
  `入れなかった保育料の行 ${skipped.filter((x) => !x.pref).length}（うち県の制度で入った街 ${skipped.filter((x) => x.coveredByPref).length}）・入れなかった県の制度 ${skipped.filter((x) => x.pref).length}・県の制度で入れ直した行 ${replaced.length}`,
  `sources ${SOURCES.length}, texts ${TEXTS.length}, ${(ts.length / 1024).toFixed(0)} KB`,
].join('\n'))
for (const c of Object.keys(nursery)) if (!NAME[c]) throw new Error(`保育料の制度のコードが一覧にない: ${c}`)
