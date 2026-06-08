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

  it('按钮真正居中到窗口中线：左右两侧 flex-1 等宽，中部 flex-shrink-0', () => {
    includes(bar, 'flex-1 min-w-0 flex items-center space-x-3 px-4', '左侧应 flex-1 等宽占位')
    includes(bar, 'flex-shrink-0 flex justify-center', '中部应 flex-shrink-0，让按钮真正落在窗口中线')
    includes(bar, 'data-tauri-drag-region class="flex-shrink-0 flex justify-center"', '中部容器仍保留窗口拖动')
  })

  it('右侧容器保留窗口拖动，按钮各自带 window-no-drag（避免空白也成 no-drag）', () => {
    includes(bar, 'data-tauri-drag-region class="flex-1 min-w-0 flex justify-end items-center space-x-1 px-4"', '右侧外层应为可拖动区')
    includes(bar, 'class="window-no-drag w-8 h-8 flex items-center justify-center rounded-md', '按钮自身应 window-no-drag')
  })
})
