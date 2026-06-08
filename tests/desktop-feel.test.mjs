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

describe('A. 去 Web 默认：禁选 / 禁拖 / 无 tap-highlight / 自定义焦点环', () => {
  const css = read('src/styles/main.css')

  it('全局禁选与禁拖，并禁用 tap-highlight', () => {
    includes(css, 'user-select: none', '全局应禁用文本选择')
    includes(css, '-webkit-user-drag: none', '应禁用拖拽')
    includes(css, '-webkit-tap-highlight-color: transparent', '应禁用触摸高亮')
  })

  it('放开内容区可选：input / textarea / contenteditable / .selectable', () => {
    includes(css, '.selectable,', '应允许通过 .selectable 类放开选择')
    includes(css, 'input,', '应放开 input')
    includes(css, 'textarea,', '应放开 textarea')
    includes(css, '[contenteditable="true"]', '应放开 contenteditable')
    includes(css, 'user-select: text', '放开应使用 text 而非 auto，行为更确定')
  })

  it('图片始终禁拖，避免拖动预览鬼影', () => {
    includes(css, 'img {', '应单独约束 img')
    includes(css, '-webkit-touch-callout: none', '应禁用 touch-callout')
  })

  it('移除浏览器默认蓝色焦点轮廓，自定义双层软阴影焦点环', () => {
    includes(css, '*:focus {', '应统一兜底取消默认 outline')
    includes(css, ':focus-visible {', '应用 :focus-visible 区分键盘焦点')
    includes(css, 'rgba(59, 130, 246, 0.55)', '焦点环应使用蓝色软阴影')
    includes(css, 'box-shadow:\n    0 0 0 2px rgba(255, 255, 255, 0.9)', '焦点环应有内层白圈避免融到背景')
  })
})

describe('B. 字体与文字渲染：原生字体栈 / 字距 / 字形 / tabular-nums', () => {
  const css = read('src/styles/main.css')

  it('字体栈优先 SF Pro 与 Segoe UI Variable', () => {
    includes(css, '-apple-system, BlinkMacSystemFont', 'macOS 应优先 SF Pro')
    includes(css, "'Segoe UI Variable Display'", 'Windows 11 应优先 Segoe UI Variable Display')
    includes(css, "'Segoe UI Variable Text'", '正文应优先 Segoe UI Variable Text')
  })

  it('启用文字渲染优化与字形平滑', () => {
    includes(css, 'text-rendering: optimizeLegibility', '应启用最佳易读性渲染')
    includes(css, '-webkit-font-smoothing: antialiased', 'WebKit 应抗锯齿')
    includes(css, '-moz-osx-font-smoothing: grayscale', 'macOS Firefox 应灰度抗锯齿')
  })

  it('全局字距与标题字距：与系统控件视感对齐', () => {
    includes(css, 'letter-spacing: -0.011em', '正文应稍紧凑字距')
    includes(css, 'letter-spacing: -0.022em', '标题应更紧凑字距')
  })

  it('数字默认等宽，避免抖动', () => {
    includes(css, 'font-variant-numeric: tabular-nums', 'body 应默认等宽数字')
  })
})

describe('C. 桌面级利落动效：按钮 active 回弹 + 利落 transition + reduced-motion', () => {
  const css = read('src/styles/main.css')

  it('按钮点击时有桌面 native 风的 scale 回弹', () => {
    includes(css, ':where(button, [role="button"], a.btn):active', '应用 :where 0-specificity 加 active 反馈')
    includes(css, 'transform: scale(0.97)', '反馈应为 0.97 微缩，不刺眼')
  })

  it('按钮默认 transition 用桌面利落曲线（160ms ease-out 风）', () => {
    includes(css, 'transition-duration: 160ms', '默认时长 160ms')
    includes(css, 'cubic-bezier(0.22, 1, 0.36, 1)', '使用 Apple 经典缓动曲线')
  })

  it('保留 prefers-reduced-motion 兜底', () => {
    includes(css, '@media (prefers-reduced-motion: reduce)', '应尊重系统减动画偏好')
  })
})

describe('D. 图片淡入：CachedImage 不再「破图突现」', () => {
  const c = read('src/components/ui/CachedImage.vue')

  it('图片加载完才显现，且兜底图保持低透明度作为占位', () => {
    includes(c, 'is-loaded', '应有 is-loaded 状态控制显现')
    includes(c, 'is-fallback', '应区分兜底图与真实图')
    includes(c, 'opacity: 0;', '初始应隐藏')
    includes(c, 'transition: opacity 220ms ease-out', '加载完成应有平滑淡入')
    includes(c, 'opacity: 0.6', '兜底图应保持 0.6 透明度作为占位')
  })

  it('图片错误也算「加载完成」，避免一直空白', () => {
    includes(c, 'handleError', '应有错误处理')
    includes(c, 'loaded.value = true', '错误时也标记 loaded，避免一直 0 透明')
  })

  it('reduced-motion 用户应跳过淡入直接显示', () => {
    includes(c, '@media (prefers-reduced-motion: reduce)', '应有减动画兜底')
  })
})

describe('D. 路由转场：fade-slide 桌面应用感（而非 SPA 瞬切）', () => {
  const app = read('src/App.vue')

  it('页面进入与离开有不同的曲线与时长（带方向感）', () => {
    includes(app, '.page-enter-active', '应有进入过渡')
    includes(app, '.page-leave-active', '应有离开过渡')
    includes(app, 'transform: translateY(6px)', '进入应有轻微下移到原位')
    includes(app, 'transform: translateY(-4px)', '离开应有轻微上移')
    includes(app, 'cubic-bezier(0.22, 1, 0.36, 1)', '应使用 Apple 经典缓动')
  })

  it('保留 prefers-reduced-motion 兜底（去掉位移，保留 opacity）', () => {
    includes(app, '@media (prefers-reduced-motion: reduce)', '应尊重系统偏好')
    includes(app, 'transform: none', '减动画时应去掉位移')
  })

  it('不再是 0.15s 单一 opacity 过渡', () => {
    excludes(app, 'transition: opacity 0.15s ease;', '不应再是旧的单一 opacity 过渡')
  })
})
