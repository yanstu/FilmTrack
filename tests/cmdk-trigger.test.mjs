import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const read = (relativePath) =>
  readFileSync(fileURLToPath(new URL(`../${relativePath}`, import.meta.url)), 'utf8')

const includes = (source, needle, message) =>
  assert.ok(source.includes(needle), `${message ?? '缺少片段'}: ${needle}`)

describe('标题栏 Spotlight 入口（让 ⌘K 被看见）', () => {
  const bar = read('src/components/common/TitleBar.vue')

  it('居中位置渲染 cmdk-trigger 按钮，点击派发 open-command-palette', () => {
    includes(bar, 'class="cmdk-trigger window-no-drag"', '应渲染 cmdk-trigger 按钮且不可拖动')
    includes(bar, '@click="openCommandPalette"', '应绑定点击打开命令面板')
    includes(bar, "new CustomEvent('open-command-palette')", '应通过事件总线打开命令面板')
  })

  it('按钮含搜索图标 + placeholder + ⌘/Ctrl K 键盘提示', () => {
    includes(bar, '<SearchIcon class="cmdk-trigger-ico" />', '应使用 SearchIcon')
    includes(bar, '搜索作品 / 页面 / 动作…', 'placeholder 应说明可搜内容')
    includes(bar, '<kbd>{{ modKeyLabel }}</kbd><kbd>K</kbd>', '应展示组合键提示')
    includes(bar, "modKeyLabel = computed(() => (isMac ? '⌘' : 'Ctrl'))", '应按平台显示组合键')
  })

  it('提供窄宽降级（短文案 + 仅图标）避免挤压其它控件', () => {
    includes(bar, 'cmdk-trigger-text-full', '应有完整文案节点')
    includes(bar, 'cmdk-trigger-text-short', '应有短文案备份节点')
    includes(bar, '@media (max-width: 900px)', '应有窄宽降级断点')
    includes(bar, '@media (max-width: 640px)', '极窄时应仅显示图标 + kbd')
  })

  it('按钮位于中部并保持窗口拖动（仅按钮本身禁用拖动）', () => {
    includes(bar, 'flex-1 flex justify-center px-4', '中部容器仍是 flex-1 并居中')
    includes(bar, 'data-tauri-drag-region class="flex-1 flex justify-center', '中部区域保留窗口拖动')
  })
})
