import { checkBrokerage, checkProration, compareToMonthly } from './calc'
import { categoryOrder } from './categories'
import { formatMonthDayJa, formatMonths, formatYen, toOneLine } from './format'
import { getItem, OTHER_ITEM_ID, resolveBasis } from './items'
import type {
  AskParts,
  BrokerageCalc,
  CategorySubtotal,
  Estimate,
  EstimateLine,
  Finding,
  FindingCalc,
  FindingLevel,
  Inspection,
  InspectionNote,
  ItemDef,
  MonthsCalc,
  ProrationCalc,
} from './types'

// 見積書を点検する。この道具の中心。
//
// 考え方:
// - 判定は、項目のデータ（items.ts）と、計算（calc.ts）だけから作る。画面には依存しない。
// - 断定しない。headline は「〜を確かめる項目です」「〜の可能性があります」の形にする。
// - 金額の高い安いは言わない。言うのは、決まりのある上限（仲介手数料）との比較と、
//   日割りの目安との比較と、「家賃の何か月分にあたるか」という計算だけ。

/** 公的な決まりが見つからなかった項目（契約書で確かめる区分）に添える文。 */
const NO_RULE_GENERAL = 'この項目についての国の決まりや資料は、見つかりませんでした。条件は、契約書と、不動産会社への質問で確かめましょう。'

const MISSING_AMOUNT = '金額が、まだ入っていません（合計には入っていません）。'

/** 0円の行の、ひとことの判定。 */
const ZERO_HEADLINE = '見積もりの額は、0円になっています。'

/** 区分ごとの、決まった言い方。 */
const categoryHeadline: Record<ItemDef['category'], string> = {
  usual: 'ふつうはかかる項目です。',
  capped: '上限の決まりがある項目です。',
  optional: '必須か任意かを、確かめる項目です。',
  choosable: '自分で選べることがある項目です。',
  'who-pays': 'だれが負担するかを、確かめる項目です。',
  overlap: 'ほかの費用と重なっていないかを、確かめる項目です。',
  contract: '契約書で、条件を確かめる項目です。',
  other: 'この道具の一覧にない項目です。何のお金かを、確かめましょう。',
}

type Draft = {
  level: FindingLevel
  headline: string
  reasons: string[]
  calc: FindingCalc | null
  ask: AskParts
  howToAsk: string
  askDefault: boolean
}

/** 見積書の1行を点検する。見積書の全体も受け取るのは、家賃などの計算のもとと、ほかの行との重なりを見るため。 */
function inspectLine(line: EstimateLine, estimate: Estimate): Finding {
  const item = getItem(line.itemId)
  // 名前は、1行にそろえる（読み込んだファイルの名前に改行が入っていても、画面や文面で段落が割れないように）。
  const label = toOneLine(line.label) || item.name
  const isCheckCategory = item.category !== 'usual'

  const d: Draft = {
    level: isCheckCategory ? 'check' : 'ok',
    headline: categoryHeadline[item.category],
    reasons: [item.why],
    calc: null,
    ask: item.ask,
    howToAsk: item.howToAsk,
    askDefault: isCheckCategory,
  }

  // 契約書で確かめる区分で、決まりが見つからなかった項目には、そのことを添える。
  // （必須か任意かを確かめる区分は、why そのものが「決まりは見つかりませんでした」の文になっている。）
  if (item.basisStatus === 'none-found' && item.category === 'contract') d.reasons.push(NO_RULE_GENERAL)

  switch (item.id) {
    case 'chukai':
      applyBrokerage(d, line, estimate)
      break
    case 'hiwari':
      applyProration(d, line, estimate)
      break
    case 'shikikin':
    case 'reikin':
      applyMonths(d, line, estimate)
      break
    case 'maeyachin':
      applyAdvanceRent(d, line, estimate)
      break
    case 'kanrihi':
      applyCommonFee(d, line, estimate)
      break
    case 'hoshoryo':
      applyGuarantee(d, line, estimate)
      break
  }

  // 合計に入れない・引く項目は、そのことを言う。
  if (item.totalRole === 'exclude') d.reasons.push('初期費用ではないので、合計には入れていません。')
  if (item.totalRole === 'subtract' && line.amount !== null) d.reasons.push('見積書で引かれている金額として、合計から引いています。')

  // 0円の行（初期費用として足す、確かめる区分の項目）。「鍵の交換費用 0円」「消毒料 0円」のように、
  // かからないことが見積書に書かれている行に、赤ペンを入れて「外せますか」とたずねる文面を作ると、的はずれになる。
  // 確かめる項目にも、「もし全部外せた場合の差」にも、はじめの文面にも入れずに、0円であることだけを言う。
  // 仲介手数料は、上限との比較（applyBrokerage）で、0円なら範囲内になるので、そちらに任せる。
  // 更新料など、初期費用ではない項目は、金額がなくても条件を確かめる項目なので、0円でも変えない。
  const zeroCharge = line.amount === 0 && item.totalRole === 'add' && isCheckCategory && item.id !== 'chukai'
  if (zeroCharge) {
    d.level = 'ok'
    d.headline = ZERO_HEADLINE
    d.reasons.push('見積もりの額が0円なので、確かめる項目には入れていません。')
    d.askDefault = false
  }

  // 一緒にあると、重なっていないかを確かめたい項目。
  // 相手の行が0円のとき（「敷金 0円」と書かれた見積書 など）は、重なる相手のお金がないので、言わない。
  // 相手の金額が未入力のときは、額がわからないだけなので、言う。
  if (!zeroCharge) {
    const others = estimate.lines.filter((other) => other.id !== line.id)
    for (const o of item.overlapsWith ?? []) {
      if (others.some((other) => other.itemId === o.itemId && other.amount !== 0)) d.reasons.push(o.text)
    }
    if (item.id === 'cleaning') applyCleaningWithoutDeposit(d, others)
  }

  // 金額が未入力。初期費用として足す項目だけ知らせる（更新料などは、金額がなくても確かめられる）。
  if (line.amount === null && item.totalRole === 'add') {
    d.reasons.push(MISSING_AMOUNT)
    if (d.level === 'ok') d.level = 'note'
  }

  return {
    lineId: line.id,
    itemId: item.id,
    label,
    itemName: item.name,
    amount: line.amount,
    category: item.category,
    level: d.level,
    headline: d.headline,
    reasons: d.reasons,
    checks: item.checks,
    calc: d.calc,
    basisStatus: item.basisStatus,
    basis: resolveBasis(item.basis),
    related: resolveBasis(item.related),
    limits: item.limits,
    caveat: item.caveat,
    howToAsk: d.howToAsk,
    ask: d.ask,
    askDefault: d.askDefault,
    // 0円の行は、外せたとしても差が出ないので、数えない（「0円　1項目の合計」と出るのを防ぐ）。
    countsTowardAskTotal: item.askRemovable && item.totalRole === 'add' && line.amount !== null && line.amount > 0,
    totalRole: item.totalRole,
    guideSlug: item.guide?.slug ?? null,
  }
}

// ---------------------------------------------------------------------------
// 仲介手数料
// ---------------------------------------------------------------------------

/**
 * 退去時クリーニング費用の前払いで、敷金が0円の見積書のとき。
 * 項目のデータの聞き方は「敷金からも清掃の費用が引かれることはありますか」だが、敷金が0円なら、引かれる敷金がない。
 * そのまま送ると的はずれな質問になるので、「この金額のほかに請求されることがあるか」だけをたずねる形にする。
 * 敷金の行がない（入れていないだけかもしれない）ときと、金額が未入力のときは、もとの聞き方のままにする。
 */
function applyCleaningWithoutDeposit(d: Draft, others: EstimateLine[]): void {
  const deposits = others.filter((other) => other.itemId === 'shikikin')
  if (deposits.length === 0 || deposits.some((other) => other.amount !== 0)) return
  d.reasons.push('見積書の敷金は、0円になっています。退去のときに、この金額のほかに清掃の費用を請求されることがないかを、契約書で確かめましょう。')
  d.howToAsk = '「退去のときに、この金額のほかに、清掃の費用を請求されることはありますか」と聞いてみましょう。'
  d.ask = {
    mail: '退去時のクリーニング費用について、退去のときに、この金額のほかに、清掃の費用を請求されることがあるかどうかを、教えていただけますでしょうか。',
    line: '退去のときに、この金額のほかに、清掃の費用を請求されることはありますか。',
  }
}

/**
 * 上限と比べる額を決める。
 * 仲介手数料の行が2つ以上あるとき（「仲介手数料」と「仲介手数料（消費税）」を分けて書いた見積書 など）は、
 * 金額の入っている行を合わせた額で比べる。1行ずつ比べると、合計では上限を超えていても、どの行にも
 * 「おさまっています」と出てしまう。この道具でただ1つ、決まりと比べる項目なので、見落とさないようにする。
 */
function brokerageGroup(line: EstimateLine, estimate: Estimate): { amount: number | null; count: number; first: boolean } {
  if (line.amount === null) return { amount: null, count: 1, first: true }
  const group = estimate.lines.filter((other) => getItem(other.itemId).id === 'chukai' && other.amount !== null)
  if (group.length < 2) return { amount: line.amount, count: 1, first: true }
  return { amount: group.reduce((sum, other) => sum + (other.amount ?? 0), 0), count: group.length, first: group[0].id === line.id }
}

function applyBrokerage(d: Draft, line: EstimateLine, estimate: Estimate): void {
  const group = brokerageGroup(line, estimate)
  const grouped = group.count > 1
  const calc: BrokerageCalc = { ...checkBrokerage({ rent: estimate.rent, commonFee: estimate.commonFee, amount: group.amount }), lineCount: group.count }
  d.calc = calc
  if (calc.status === 'no-rent') {
    d.level = 'note'
    d.headline = '上限の決まりがある項目です。家賃を入れると、上限の目安と比べられます。'
    d.askDefault = false
    return
  }
  // ここから先は、家賃が入っている（halfCap と fullCap がある）。
  const rent = calc.rent as number
  const halfCap = calc.halfCap as number
  const fullCap = calc.fullCap as number
  d.reasons.push(`家賃 ${formatYen(rent)} をもとにすると、0.5か月分＋消費税は ${formatYen(halfCap)}、1か月分＋消費税は ${formatYen(fullCap)} です。`)

  if (calc.status === 'no-amount' || group.amount === null) {
    d.level = 'note'
    d.headline = '上限の決まりがある項目です。金額を入れると、上限の目安と比べられます。'
    d.askDefault = false
    return
  }
  const amount = group.amount
  // 2行以上を合わせたときは、どの文でも「合わせた額」で言う。1行のときは、これまでどおりの言い方。
  const subject = grouped ? `仲介手数料の${group.count}行の合計が、` : ''
  const amountName = grouped ? '合わせた額' : '見積もりの額'
  if (grouped) d.reasons.push(`仲介手数料の行が、${group.count}つあります。金額を合わせて、上限の目安と比べています。`)
  // 文面は、合わせた額でたずねる。同じ質問が2回入らないように、はじめから文面に入れるのは、最初の行だけにする。
  const sumMail = `仲介手数料は、見積書の${group.count}行を合わせると ${formatYen(amount)} になります。`
  const sumLine = `見積書の${group.count}行を合わせると ${formatYen(amount)} になります。`
  const rounding = '上限の目安との差は1円未満で、端数の処理の違いとみなしました。'
  const fee = estimate.commonFee ?? 0
  const feeNote = (kind: 'half' | 'full') => {
    const base = rent + fee
    const cap = Math.floor((base * (kind === 'half' ? 55 : 110)) / 100)
    const name = kind === 'half' ? '0.5か月分＋消費税' : '1か月分＋消費税'
    return `家賃に管理費・共益費を足した額（${formatYen(base)}）の${name}（${formatYen(cap)}）と、同じ額です。管理費・共益費を含めて計算されているのかもしれません。計算のもとを、聞いてみましょう。`
  }
  /** 計算のもとを聞く文面（項目のデータの文）。2行以上のときは、合わせた額を添える。 */
  const askBasis = (): AskParts =>
    grouped
      ? {
          mail: `${sumMail}合わせた額の計算のもと（何をもとに、何か月分で計算されているか）を、教えていただけますでしょうか。`,
          line: `${sumLine}何をもとに、何か月分で計算されているか、教えてください。`,
        }
      : d.ask

  if (calc.status === 'within-half') {
    d.level = 'ok'
    d.headline = `${subject}家賃の0.5か月分＋消費税の範囲に、おさまっています。`
    d.reasons.push(`${amountName}は ${formatYen(amount)} です。`)
    if (calc.roundingOnly) d.reasons.push(rounding)
    d.ask = askBasis()
    d.askDefault = false
    return
  }

  if (calc.status === 'within-full') {
    d.level = 'check'
    d.reasons.push(`${amountName}は ${formatYen(amount)} で、0.5か月分＋消費税より ${formatYen(calc.overHalf)} 多くなっています。`)
    if (calc.roundingOnly) d.reasons.push(rounding)
    if (calc.rentPlusFeeMatch === 'half') {
      d.headline = `${subject}家賃だけで計算した0.5か月分＋消費税を、超えています。計算のもとを、確かめる項目です。`
      d.reasons.push(feeNote('half'))
      // 計算のもとを聞く文面にする。
      d.ask = askBasis()
    } else {
      d.headline = `${subject}家賃の0.5か月分＋消費税を、超えています。1か月分で承諾していたかを、確かめる項目です。`
      d.reasons.push(
        '借主から受け取れるのは、仲介を依頼するときに承諾している場合を除いて、家賃の0.5か月分＋消費税まで、という決まりがあります。申し込みのときの書類に、1か月分を払うことへの承諾が書かれていないかを、確かめましょう。',
      )
      d.ask = grouped
        ? {
            mail: `${sumMail}合わせた額は、家賃の何か月分で計算されていますでしょうか。家賃の0.5か月分（＋消費税）でお願いすることは、できますでしょうか。`,
            line: `${sumLine}家賃の何か月分で計算されていますか。0.5か月分（＋消費税）でお願いすることは、できますか。`,
          }
        : {
            mail: '仲介手数料は、家賃の何か月分で計算されていますでしょうか。家賃の0.5か月分（＋消費税）でお願いすることは、できますでしょうか。',
            line: '家賃の何か月分で計算されていますか。0.5か月分（＋消費税）でお願いすることは、できますか。',
          }
    }
    d.askDefault = group.first
    return
  }

  // over-full
  d.level = 'alert'
  d.headline = `${subject}貸主と借主の合計の上限（家賃の1か月分＋消費税）を、超えている可能性があります。`
  d.reasons.push(`${amountName}は ${formatYen(amount)} で、1か月分＋消費税より ${formatYen(calc.overFull)} 多くなっています。`)
  if (calc.rentPlusFeeMatch === 'full') d.reasons.push(feeNote('full'))
  d.reasons.push('入力した家賃が合っているかを確かめたうえで、計算のもとと、仲介手数料のほかの費用が一緒に書かれていないかを、聞いてみましょう。')
  d.ask = askBasis()
  d.askDefault = group.first
}

// ---------------------------------------------------------------------------
// 日割り家賃
// ---------------------------------------------------------------------------

/** 日割りの目安を説明する文。 */
function prorationText(calc: ProrationCalc, moveInDate: string): string {
  const withFee = calc.estimateWithFee !== null ? `、管理費・共益費を足すと ${formatYen(calc.estimateWithFee)}` : ''
  return `入居する日（${formatMonthDayJa(moveInDate)}）から月の終わりまでは、${calc.days}日です（入居する日を含みます）。その月の日数（${calc.daysInMonth}日）で割ると、目安は、家賃だけなら ${formatYen(calc.estimateRentOnly as number)}${withFee} です。`
}

function applyProration(d: Draft, line: EstimateLine, estimate: Estimate): void {
  const calc = checkProration({
    rent: estimate.rent,
    commonFee: estimate.commonFee,
    moveInDate: estimate.moveInDate,
    amount: line.amount,
  })
  d.calc = calc
  if (calc.status === 'no-basis' || estimate.moveInDate === null) {
    d.level = 'note'
    d.reasons.push('家賃と入居する日を入れると、日割りの目安を計算できます。')
    return
  }
  const moveIn = estimate.moveInDate
  d.reasons.push(prorationText(calc, moveIn))
  if (calc.status === 'no-amount' || line.amount === null) return

  const range = `数え方の違いを見込んだ幅（${formatYen(calc.low as number)}〜${formatYen(calc.high as number)}）`
  if (calc.status === 'ok') {
    d.reasons.push(
      calc.matched === 'fee'
        ? '見積もりの額は、管理費・共益費だけの日割りとして見ると、目安と大きくは違いません。'
        : '見積もりの額は、この目安と大きくは違いません。',
    )
    return
  }
  const askWithDate: AskParts = {
    mail: `日割り家賃は、何日から何日までの分で、1か月を何日として計算されているかを、教えていただけますでしょうか。入居する日は、${formatMonthDayJa(moveIn)}の予定です。`,
    line: `何日から何日までの分で、どう計算されているか、教えてください。入居する日は、${formatMonthDayJa(moveIn)}の予定です。`,
  }
  if (calc.status === 'high') {
    d.level = 'check'
    d.headline = '日割りの目安より、多くなっています。何日から何日までの分かを、確かめましょう。'
    d.reasons.push(
      `見積もりの額（${formatYen(line.amount)}）は、${range}より、家賃の1日分を超えて多くなっています。家賃がかかり始める日（契約の開始日）が、入居する日より前になっていないかを、確かめましょう。`,
    )
    d.ask = askWithDate
    d.askDefault = true
    return
  }
  // low: 借りる人に不利ではないので、赤ペンは入れない。日付の食い違いに気づけるように、メモとして知らせる。
  d.level = 'note'
  d.headline = '日割りの目安より、少なくなっています。何日から何日までの分かを、確かめておくと安心です。'
  d.reasons.push(
    `見積もりの額（${formatYen(line.amount)}）は、${range}より少なくなっています。家賃がかかり始める日が、入居する日よりあとになっているのかもしれません。`,
  )
  d.ask = askWithDate
}

// ---------------------------------------------------------------------------
// 月額と比べる項目（敷金、礼金、前家賃、管理費、保証料）
// ---------------------------------------------------------------------------

const NEED_RENT = '家賃を入れると、家賃の何か月分にあたるかを計算できます。'

/**
 * 「1か月分」「約1.28か月分」などの言い方を作る。
 *
 * 丸めると 0.5 の刻みになるが、ちょうどではない額（家賃 78,000円に対する 78,100円 など）は、
 * 「1か月分にあたります」と言い切らずに、「約1か月分（ちょうど1か月分より 100円 多い額）」と、差も言う。
 * 「1か月分とは違う額です」という判定のすぐ下で、「1か月分にあたります」と言うことがないようにするため。
 */
function monthsText(calc: MonthsCalc, amount: number): string {
  const text = formatMonths(calc.months, calc.exact)
  if (calc.exact) return text
  const half = Math.round(calc.months * 2) / 2
  if (half <= 0 || Math.abs(calc.months - half) >= 0.005) return text
  const diff = amount - half * calc.baseAmount
  return `${text}（ちょうど${formatMonths(half)}より ${formatYen(Math.max(1, Math.abs(diff)))} ${diff > 0 ? '多い' : '少ない'}額）`
}

/** 0円の行は、月額と比べない（「約0か月分」と言っても役に立たないため）。0円であることだけを言う。 */
function isZero(d: Draft, line: EstimateLine): boolean {
  if (line.amount !== 0) return false
  d.reasons.push('見積もりの額は、0円になっています。')
  return true
}

function applyMonths(d: Draft, line: EstimateLine, estimate: Estimate): void {
  if (line.amount === null || isZero(d, line)) return
  const calc = compareToMonthly({ rent: estimate.rent, commonFee: estimate.commonFee, amount: line.amount, base: 'rent' })
  if (!calc) {
    d.reasons.push(NEED_RENT)
    return
  }
  d.calc = calc
  d.reasons.push(`家賃（${formatYen(calc.baseAmount)}）の${monthsText(calc, line.amount)}にあたります。`)
}

function applyAdvanceRent(d: Draft, line: EstimateLine, estimate: Estimate): void {
  if (line.amount === null || isZero(d, line)) return
  const { rent } = estimate
  if (rent === null || rent <= 0) {
    d.reasons.push(NEED_RENT)
    return
  }
  const fee = estimate.commonFee !== null && estimate.commonFee > 0 ? estimate.commonFee : 0
  if (line.amount === rent) {
    d.calc = { kind: 'months', base: 'rent', baseAmount: rent, months: 1, exact: true }
    d.reasons.push(`家賃の1か月分（${formatYen(rent)}）と、同じ額です。`)
    return
  }
  if (fee > 0 && line.amount === rent + fee) {
    d.calc = { kind: 'months', base: 'rent+fee', baseAmount: rent + fee, months: 1, exact: true }
    d.reasons.push(`家賃＋管理費・共益費の1か月分（${formatYen(rent + fee)}）と、同じ額です。`)
    return
  }
  const calc = compareToMonthly({ rent, commonFee: estimate.commonFee, amount: line.amount, base: 'auto' })
  d.calc = calc
  d.level = 'check'
  d.headline = 'ふつうはかかる項目ですが、家賃の1か月分とは違う額です。何月分にあたるかを、確かめましょう。'
  const oneMonth = fee > 0 ? `家賃の1か月分は ${formatYen(rent)}、管理費・共益費を足すと ${formatYen(rent + fee)} です。` : `家賃の1か月分は ${formatYen(rent)} です。`
  const baseName = calc?.base === 'rent+fee' ? '家賃＋管理費・共益費' : '家賃'
  d.reasons.push(`${oneMonth}見積もりの額（${formatYen(line.amount)}）は、${baseName}の${calc ? monthsText(calc, line.amount) : '1か月分とは違う額'}にあたります。`)
  d.reasons.push('入居する日によっては、当月分と翌月分の両方を先に払う見積書もあります。何月分にあたるかを、聞いてみましょう。')
  d.askDefault = true
}

function applyCommonFee(d: Draft, line: EstimateLine, estimate: Estimate): void {
  if (line.amount === null || isZero(d, line)) return
  const fee = estimate.commonFee
  if (fee === null || fee <= 0) {
    d.reasons.push('管理費・共益費（月額）を入れると、何か月分にあたるかを計算できます。')
    return
  }
  const calc = compareToMonthly({ rent: estimate.rent, commonFee: fee, amount: line.amount, base: 'fee' })
  d.calc = calc
  if (line.amount === fee) {
    d.reasons.push(`入力した管理費・共益費の1か月分（${formatYen(fee)}）と、同じ額です。`)
    return
  }
  if (!calc) return
  // 1か月分と違っても、日割りの分を含んでいるだけのことがあるので、メモにとどめる。
  d.level = 'note'
  d.reasons.push(`入力した管理費・共益費（月額 ${formatYen(fee)}）の${monthsText(calc, line.amount)}にあたります。日割りの分を含んでいるのかもしれません。何か月分かを、確かめておくと安心です。`)
}

function applyGuarantee(d: Draft, line: EstimateLine, estimate: Estimate): void {
  if (line.amount === null || isZero(d, line)) return
  const calc = compareToMonthly({ rent: estimate.rent, commonFee: estimate.commonFee, amount: line.amount, base: 'rent+fee' })
  if (!calc) {
    d.reasons.push(NEED_RENT)
    return
  }
  d.calc = calc
  const baseName = calc.base === 'rent+fee' ? '家賃＋管理費・共益費' : '家賃'
  // 保証料は「何％」で決まることがあるので、割合も添える。高い安いは言わない。
  // 割合も、割り切れないときは「約」を付ける（41,100円 ÷ 82,000円 を「50％」と言い切らない）。
  const percent = `${(line.amount * 100) % calc.baseAmount === 0 ? '' : '約'}${Math.round((line.amount * 100) / calc.baseAmount)}％`
  d.reasons.push(`${baseName}（${formatYen(calc.baseAmount)}）の${formatMonths(calc.months, calc.exact)}（${percent}）にあたります。計算のもとは、保証会社や契約によって違います。`)
}

// ---------------------------------------------------------------------------
// 見積書の全体
// ---------------------------------------------------------------------------

/**
 * 見積書を点検する。
 * 何も入っていない見積書や、家賃が未入力の見積書でも、落ちずに結果を返す（気づきは notes に入る）。
 */
export function inspectEstimate(estimate: Estimate): Inspection {
  const findings = estimate.lines.map((line) => inspectLine(line, estimate))

  let total = 0
  let excludedTotal = 0
  let askTotal = 0
  let askCount = 0
  let missingAmountCount = 0
  const subtotals = new Map<string, CategorySubtotal>()
  for (const f of findings) {
    const row = subtotals.get(f.category) ?? { category: f.category, count: 0, subtotal: 0 }
    row.count += 1
    if (f.amount === null) {
      if (f.totalRole === 'add') missingAmountCount += 1
    } else if (f.totalRole === 'add') {
      total += f.amount
      row.subtotal += f.amount
    } else if (f.totalRole === 'subtract') {
      total -= f.amount
      row.subtotal -= f.amount
    } else {
      excludedTotal += f.amount
    }
    if (f.countsTowardAskTotal && f.amount !== null) {
      askTotal += f.amount
      askCount += 1
    }
    subtotals.set(f.category, row)
  }
  const byCategory = categoryOrder.flatMap((id) => {
    const row = subtotals.get(id)
    return row ? [row] : []
  })

  const statedTotalDiff = estimate.statedTotal === null ? null : total - estimate.statedTotal

  const notes: InspectionNote[] = []
  if (findings.length === 0) {
    notes.push({ kind: 'no-lines', text: '見積書の項目が、まだ入っていません。項目を足すか、「サンプルの見積書を入れる」で試してください。' })
  } else {
    if (estimate.rent === null || estimate.rent <= 0) {
      notes.push({ kind: 'no-rent', text: '家賃が入っていません。家賃を入れると、仲介手数料の上限の目安や、家賃の何か月分にあたるかを計算できます。' })
    }
    if (estimate.moveInDate === null && findings.some((f) => f.itemId === 'hiwari')) {
      notes.push({ kind: 'no-move-in-date', text: '入居する日が入っていません。入れると、日割り家賃の目安を計算できます。' })
    }
    if (missingAmountCount > 0) {
      notes.push({ kind: 'missing-amount', text: `金額が入っていない項目が、${missingAmountCount}つあります。合計には入っていません。` })
    }
    if (statedTotalDiff !== null && estimate.statedTotal !== null) {
      if (statedTotalDiff === 0) {
        notes.push({ kind: 'stated-total-match', text: '入力した項目の合計は、見積書に書かれた合計と同じです。' })
      } else {
        const more = statedTotalDiff > 0
        notes.push({
          kind: 'stated-total-diff',
          text: `入力した項目の合計（${formatYen(total)}）は、見積書に書かれた合計（${formatYen(estimate.statedTotal)}）より、${formatYen(Math.abs(statedTotalDiff))} ${more ? '多く' : '少なく'}なっています。${more ? '同じ項目を2回入れていないか' : '入れ忘れた項目がないか'}、金額の打ちまちがいがないかを、確かめてください。`,
        })
      }
    }
  }

  return {
    findings,
    total,
    byCategory,
    excludedTotal,
    askTotal,
    askCount,
    attentionCount: findings.filter((f) => f.level === 'check' || f.level === 'alert').length,
    missingAmountCount,
    statedTotalDiff,
    notes,
  }
}

/** 一覧にない項目の行か。 */
export function isOtherLine(line: EstimateLine): boolean {
  return getItem(line.itemId).id === OTHER_ITEM_ID
}
