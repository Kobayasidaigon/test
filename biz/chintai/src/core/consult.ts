import type { SourceId } from './sources'
import type { BasisNote } from './types'

// 相談先と、広告の表示についての事実。どれも、公式のページで確かめたもの（sources.ts）。
// この道具は、個別の法律相談には答えない。結果の画面と「このサイトについて」に、相談先を出す。

export type ConsultDesk = {
  id: string
  /** 窓口の名前。 */
  name: string
  /** 電話番号（電話の窓口でなければ null）。 */
  phone: string | null
  /** 何をしてくれる窓口か。 */
  what: string
  /** 受付の時間（公式のページで確かめられたものだけ。窓口によって違うものは null）。 */
  hours: string | null
  /** 添えること。 */
  note: string | null
  sourceId: SourceId
}

export const consultDesks: ConsultDesk[] = [
  {
    id: 'hotline188',
    name: '消費者ホットライン',
    phone: '188',
    what: '全国共通の電話番号です。地方公共団体が設置している、身近な消費生活センターや消費生活相談窓口を案内してくれます。契約のことで困って、どこに相談すればよいかわからないときに使えます。',
    hours: null,
    note: '相談できる曜日と時間は、案内された窓口によって違います。',
    sourceId: 'caa-188',
  },
  {
    id: 'kokusen-map',
    name: '全国の消費生活センター等（国民生活センターのページ）',
    phone: null,
    what: '都道府県や市区町村の消費生活センターなどの窓口を、一覧から探せます。',
    hours: null,
    note: '受付の時間は、窓口によって違います。',
    sourceId: 'kokusen-map',
  },
  {
    id: 'houterasu',
    name: '法テラス・サポートダイヤル',
    phone: '0570-078374',
    what: 'オペレーターが、問い合わせの内容に合った相談窓口や法制度を、案内してくれます（弁護士などによる法律相談ではありません）。',
    hours: '平日 9時〜21時、土曜 9時〜17時（祝日・年末年始を除く）',
    note: '通話料がかかります。',
    sourceId: 'houterasu-dial',
  },
]

/** 広告の表示についての事実（「このサイトについて」と、広告の枠の近くに出す）。 */
export const adDisclosure: BasisNote = {
  text: '消費者庁は、令和5年（2023年）10月1日から、広告であるのに広告であることを隠す表示（ステルスマーケティング）は景品表示法違反になる、と案内しています。このサイトでは、広告には必ず「広告」と表示します。',
  sourceIds: ['caa-stealth'],
}
