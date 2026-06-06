import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

/**
 * 下拉组件（HeadlessSelect）UI / 动画契约测试
 *
 * 说明：本项目测试链路是纯字符串契约（无 jsdom，无法计算真实 CSS / 动画），
 * 因此这里通过「读取 .vue 源文件 + 断言关键类名」来守护这一轮下拉打磨：
 *  - 入场 / 离场都有过渡（此前只有离场，展开是硬切）；
 *  - 展开 / 键盘焦点态与表单输入框一致（4px 蓝环）；
 *  - 选项行为圆角药丸式高亮、面板用精致滚动条；
 *  - 占位与已选值的文字色区分。
 * 任何人误删这些交互细节都会在 `npm test` 时立刻失败。
 */

const read = (relativePath) =>
  readFileSync(fileURLToPath(new URL(`../${relativePath}`, import.meta.url)), 'utf8')

const expectIncludes = (source, needle, message) => {
  assert.ok(source.includes(needle), `${message}\n缺少片段: ${needle}`)
}

const select = read('src/components/ui/HeadlessSelect.vue')

describe('下拉组件 HeadlessSelect 动画', () => {
  it('同时具备入场与离场过渡（不再硬切出现）', () => {
    expectIncludes(select, 'enter-active-class="transition duration-150 ease-out"', '应有入场过渡')
    expectIncludes(select, 'enter-from-class="opacity-0 scale-[0.96]"', '入场应为缩放淡入')
    expectIncludes(select, 'leave-to-class="opacity-0 scale-[0.96]"', '离场应为缩放淡出')
  })

  it('入场缩放按展开方向设置变换原点（从触发器边缘生长）', () => {
    expectIncludes(select, "transformOrigin: shouldOpenAbove ? 'bottom center' : 'top center'", '应按上/下展开切换变换原点')
  })
})

describe('下拉组件 HeadlessSelect UI', () => {
  it('展开 / 键盘焦点态与表单输入框一致（4px 蓝环）', () => {
    expectIncludes(select, 'border-blue-400 bg-white/95 ring-4 ring-blue-200/60', '展开态应为蓝边 + 4px 蓝环')
    expectIncludes(select, 'focus-visible:ring-4 focus-visible:ring-blue-200/60', '键盘焦点应有 4px 蓝环')
  })

  it('占位为灰色、已选值为深色', () => {
    expectIncludes(
      select,
      "displayValue === placeholder ? 'text-gray-400' : 'text-gray-900'",
      '占位与已选值应有文字色区分'
    )
  })

  it('选项为圆角药丸式高亮、面板使用精致滚动条', () => {
    expectIncludes(select, 'rounded-lg py-2.5 pl-4 pr-9', '选项行应为圆角药丸式')
    expectIncludes(select, "active ? 'bg-blue-50 text-blue-700'", '激活项应为柔和蓝底')
    expectIncludes(select, 'scrollbar-apple', '面板应使用精致滚动条')
  })
})
