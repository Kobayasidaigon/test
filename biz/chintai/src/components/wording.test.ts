import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { findBannedPhrase } from '../core/wording'

// 画面の文に、言ってはいけない言い方（断定、あおり、相場での判定、必ず下がるという期待）が
// まぎれこんでいないかを確かめる。core のデータと結果の文は core のテストが見ているので、
// ここでは、画面の部品（src/components）と道具のページ（src/pages/Tool.tsx）に、じかに書いた文を見る。

const here = fileURLToPath(new URL('.', import.meta.url))

function listFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return listFiles(path)
    return /\.tsx?$/.test(name) && !/\.test\.ts$/.test(name) ? [path] : []
  })
}

/** コメントを取りのぞく（コメントには、「〜とは言わない」という説明として、禁句そのものを書くことがあるため）。 */
function stripComments(source: string): string {
  return source
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:"'`])\/\/.*$/gm, '$1')
}

describe('画面の文', () => {
  const files = [...listFiles(here), join(here, '..', 'pages', 'Tool.tsx')]

  it('調べるファイルが見つかる', () => {
    expect(files.length).toBeGreaterThan(20)
    expect(files.some((f) => f.endsWith('result-step.tsx'))).toBe(true)
  })

  it('言ってはいけない言い方が、入っていない', () => {
    for (const file of files) {
      const found = findBannedPhrase(stripComments(readFileSync(file, 'utf8')))
      expect(found, `${file} に「${found}」があります`).toBeNull()
    }
  })

  it('コメントを取りのぞく処理が、文まで消していない（消しすぎると、調べたことにならない）', () => {
    const sample = `const a = '外せると決まったわけではありません' // これはコメント\n{/* これもコメント */}\nconst url = 'https://example.com/x'`
    const stripped = stripComments(sample)
    expect(stripped).toContain('外せると決まったわけではありません')
    expect(stripped).toContain('https://example.com/x')
    expect(stripped).not.toContain('コメント')
    // 禁句が文の中にあれば、見つかる。
    expect(findBannedPhrase(stripComments(`<p>この費用は外せます。</p>`))).toBe('外せます')
  })
})
