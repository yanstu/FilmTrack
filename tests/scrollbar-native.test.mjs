import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const read = (relativePath) =>
  readFileSync(fileURLToPath(new URL(`../${relativePath}`, import.meta.url)), 'utf8')

const includes = (source, needle, message) =>
  assert.ok(source.includes(needle), `${message ?? '缺少片段'}: ${needle}`)

const excludes = (source, needle, message) =>
  assert.ok(!source.includes(needle), `${message ?? '存在不该出现的片段'}: ${needle}`)

describe('滚动条统一为 mac native 风（去掉显眼的蓝色渐变）', () => {
  const css = read('src/styles/main.css')

  it('彻底移除旧的蓝色渐变滚动条', () => {
    excludes(css, 'rgba(59, 130, 246, 0.2), rgba(59, 130, 246, 0.3)', '不应再用蓝色渐变 thumb')
    excludes(css, 'rgba(59, 130, 246, 0.4), rgba(59, 130, 246, 0.5)', '不应再用蓝色渐变 thumb hover')
    excludes(css, 'box-shadow: 0 2px 8px rgba(59, 130, 246, 0.15)', '不应再用蓝色阴影')
  })

  it('默认 thumb 透明，仅当鼠标进入容器才显形（native 风）', () => {
    includes(css, '::-webkit-scrollbar-thumb {\n  background: transparent;', '默认 thumb 应透明')
    includes(css, ':hover > ::-webkit-scrollbar-thumb', '容器悬停时应显示 thumb')
    includes(css, 'rgba(15, 23, 42, 0.28)', 'thumb 应使用低对比度暗色')
  })

  it('Firefox 端默认透明、悬停才显，与 webkit 一致', () => {
    includes(css, 'scrollbar-color: transparent transparent', 'FF 默认应透明')
    includes(css, ':hover {\n  scrollbar-color: rgba(15, 23, 42, 0.28) transparent', 'FF 悬停才显')
    includes(css, 'scrollbar-width: thin', 'FF 应用细滚动条')
  })

  it('提供 .scrollbar-apple 与 .scrollbar-none 工具类', () => {
    includes(css, '.scrollbar-apple {', '应定义 .scrollbar-apple 类')
    includes(css, 'scrollbar-gutter: stable', '.scrollbar-apple 应稳定布局')
    includes(css, '.scrollbar-none {', '应定义 .scrollbar-none 类')
    includes(css, 'scrollbar-width: none', '.scrollbar-none 应彻底隐藏 FF 滚动条')
  })

  it('macOS 收窄到 7px', () => {
    includes(css, '.platform-mac ::-webkit-scrollbar {\n  width: 7px;', 'macOS 应收窄 thumb')
  })
})
