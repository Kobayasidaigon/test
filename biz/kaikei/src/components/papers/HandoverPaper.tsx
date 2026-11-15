import { formatWareki, type HandoverReport, type PendingItem } from '@/core'
import { Paper, PaperDate, PaperHeading, PaperSection, yen } from './Paper'

// 5. 引き継ぎ書。
// 残高（現金、口座ごと。照合の結果つき）、通帳・はんこ・帳簿などの保管場所のチェック、
// まだ払っていないもの・まだもらっていないもの、備品、次の担当へのメモ。渡す人と受け取る人の署名欄。

const CHECK_TEXT = { match: '合っている', over: '合っていない', short: '合っていない', unchecked: '' } as const

function PendingTable({ items, total, empty }: { items: PendingItem[]; total: number; empty: string }) {
  if (items.length === 0) return <p style={{ paddingLeft: 'calc(var(--u) * 4)' }}>{empty}</p>
  return (
    <table className="paper-table">
      <colgroup>
        <col style={{ width: '74%' }} />
        <col style={{ width: '26%' }} />
      </colgroup>
      <thead>
        <tr>
          <th scope="col">内容</th>
          <th scope="col">金額（円）</th>
        </tr>
      </thead>
      <tbody>
        {items.map((item) => (
          <tr key={item.id}>
            <td>{item.description}</td>
            <td className={item.amount === null ? 'center small' : 'num'}>{item.amount === null ? 'まだ決まっていない' : yen(item.amount)}</td>
          </tr>
        ))}
        {items.length > 1 && (
          <tr className="total">
            <th scope="row" className="small" style={{ letterSpacing: 0 }}>
              金額が決まっている分の合計
            </th>
            <td className="num">{yen(total)}</td>
          </tr>
        )}
      </tbody>
    </table>
  )
}

export function HandoverPaper({ report, watermark = false }: { report: HandoverReport; watermark?: boolean }) {
  return (
    <Paper label={`${report.yearLabel} ${report.title}`} watermark={watermark} className="paper-handover">
      <PaperHeading title={report.title} period={report.yearLabel} orgName={report.orgName} />

      <p className="paper-line" style={{ marginTop: 'calc(var(--u) * 5)' }}>
        <span>引き継ぎをした日</span>
        <span>
          <PaperDate date={report.date} />
        </span>
      </p>
      <div style={{ marginTop: 'calc(var(--u) * 3)', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 'calc(var(--u) * 3)' }}>
        <PaperSignCompact caption="渡す人" role={report.from.title} name={report.from.name} />
        <PaperSignCompact caption="受け取る人" role={report.to.title} name={report.to.name} />
      </div>

      <PaperSection title="1　残高" unit="（単位：円）" />
      <table className="paper-table">
        <colgroup>
          <col style={{ width: '27%' }} />
          <col style={{ width: '17%' }} />
          <col style={{ width: '22%' }} />
          <col style={{ width: '17%' }} />
          <col style={{ width: '17%' }} />
        </colgroup>
        <thead>
          <tr>
            <th scope="col">お金の置き場所</th>
            <th scope="col">帳簿の残高</th>
            <th scope="col">確かめた日</th>
            <th scope="col">実際の残高</th>
            <th scope="col">照合の結果</th>
          </tr>
        </thead>
        <tbody>
          {report.balances.map((b) => (
            <tr key={b.accountId}>
              <td>{b.name}</td>
              <td className="num">{yen(b.bookBalance)}</td>
              <td className="center small">{b.check ? formatWareki(b.check.date) : ''}</td>
              <td className="num">{b.check ? yen(b.check.actual) : ''}</td>
              <td className="center small">
                {b.check ? CHECK_TEXT[b.check.status] : ''}
                {b.check && b.check.diff !== 0 ? `（差 ${yen(b.check.diff)}）` : ''}
                {/* 確かめた日のあとに取引が入っていると、帳簿の残高（いま）と、実際の残高（確かめた日）がちがって見える。そのわけを書く */}
                {b.check && b.check.actual - b.check.diff !== b.bookBalance && <span style={{ display: 'block' }}>（そのあとに取引あり）</span>}
              </td>
            </tr>
          ))}
          <tr className="total">
            <th scope="row">合計</th>
            <td className="num">{yen(report.balanceTotal)}</td>
            <td colSpan={3} />
          </tr>
        </tbody>
      </table>
      <p className="paper-note">
        {report.lastTransactionDate
          ? `帳簿の残高は、${formatWareki(report.lastTransactionDate)}までの取引を入れた金額です。`
          : '帳簿の残高は、年度はじめの金額です（取引は、まだ入っていません）。'}
        「実際の残高」と「照合の結果」は、確かめた日の時点のものです。
      </p>

      <PaperSection title="2　通帳・はんこ・帳簿などの保管場所" />
      {report.custody.length === 0 ? (
        <p style={{ paddingLeft: 'calc(var(--u) * 4)' }}>書いてあるものは、ありません。</p>
      ) : (
        <table className="paper-table">
          <colgroup>
            <col style={{ width: '10%' }} />
            <col style={{ width: '40%' }} />
            <col style={{ width: '50%' }} />
          </colgroup>
          <thead>
            <tr>
              <th scope="col" className="small">
                渡した
              </th>
              <th scope="col">引き継ぐもの</th>
              <th scope="col">保管場所</th>
            </tr>
          </thead>
          <tbody>
            {report.custody.map((c) => (
              <tr key={c.id}>
                <td className="center check-cell">
                  <span className="paper-check" role="img" aria-label={c.handedOver ? '渡した' : 'まだ'}>
                    {c.handedOver ? '✓' : ''}
                  </span>
                </td>
                <td>{c.label}</td>
                <td className="small">{c.place}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div style={{ breakInside: 'avoid' }}>
        <PaperSection title="3　まだ払っていないもの" />
        <PendingTable items={report.unpaid} total={report.unpaidTotal} empty="ありません。" />
      </div>

      <div style={{ breakInside: 'avoid' }}>
        <PaperSection title="4　まだもらっていないもの" />
        <PendingTable items={report.unreceived} total={report.unreceivedTotal} empty="ありません。" />
      </div>

      <div style={{ breakInside: 'avoid' }}>
        <PaperSection title="5　備品" />
        {report.equipment.length === 0 ? (
          <p style={{ paddingLeft: 'calc(var(--u) * 4)' }}>ありません。</p>
        ) : (
          <table className="paper-table">
            <colgroup>
              <col style={{ width: '38%' }} />
              <col style={{ width: '16%' }} />
              <col style={{ width: '46%' }} />
            </colgroup>
            <thead>
              <tr>
                <th scope="col">名前</th>
                <th scope="col">数</th>
                <th scope="col">保管場所</th>
              </tr>
            </thead>
            <tbody>
              {report.equipment.map((e) => (
                <tr key={e.id}>
                  <td>{e.name}</td>
                  <td className="center">{e.quantity}</td>
                  <td className="small">{e.place}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div style={{ breakInside: 'avoid' }}>
        <PaperSection title="6　次の担当の方へ" />
        <div className="paper-memo">{report.memo}</div>
      </div>
    </Paper>
  )
}

/** 引き継ぎ書の上のほうに、2人ぶんを横に並べるための、小さめの署名欄。 */
function PaperSignCompact({ caption, role, name }: { caption: string; role: string; name: string }) {
  return (
    <div style={{ flex: '1 1 calc(var(--u) * 80)' }}>
      <p className="small" style={{ fontSize: 'calc(var(--u) * 3.2)', color: 'var(--paper-sub)' }}>
        {caption}
      </p>
      <div className="paper-sign" style={{ justifyContent: 'flex-start' }}>
        <span className="role" style={{ minWidth: 0, textAlign: 'left' }}>
          {role}
        </span>
        <span className="name" style={{ minWidth: 'calc(var(--u) * 36)', flex: 1 }}>
          {name}
        </span>
        <span className="paper-seal" aria-label="はんこを押すところ">
          印
        </span>
      </div>
    </div>
  )
}
