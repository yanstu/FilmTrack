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

describe('CommandPalette 去遮罩 + Spotlight 风入场', () => {
  const c = read('src/components/common/CommandPalette.vue')

  it('遮罩完全透明、不模糊背景（去掉旧的 rgba 黑遮罩与 backdrop-filter）', () => {
    excludes(c, 'background: rgba(15, 23, 42, 0.4)', '不应再有黑色遮罩')
    excludes(c, '.cmdk-overlay {\n  position: fixed;\n  inset: 0;\n  z-index: 70;\n  background: rgba(15, 23, 42, 0.4);', '不应再有旧的遮罩样式')
    includes(c, '.cmdk-overlay {', 'overlay 容器应存在')
    includes(c, 'background: transparent', 'overlay 应完全透明')
    // overlay 自身不再模糊背景，但允许面板自己用 backdrop-filter 加质感
  })

  it('面板自身阴影加强为三层，弥补无遮罩时的层次缺失', () => {
    includes(c, '0 32px 64px -16px rgba(15, 23, 42, 0.34)', '应有强主投影')
    includes(c, '0 12px 24px -8px rgba(15, 23, 42, 0.18)', '应有次级投影')
    includes(c, '0 1px 2px rgba(15, 23, 42, 0.06)', '应有边缘细投影')
    includes(c, 'backdrop-filter: saturate(1.4) blur(20px)', '面板应有玻璃磨砂效果')
  })

  it('入场用 Apple 缓动 + 进出场曲线不同（更细腻）', () => {
    includes(c, 'cubic-bezier(0.22, 1, 0.36, 1)', '进入应用 Apple 缓动')
    includes(c, 'cubic-bezier(0.4, 0, 0.6, 1)', '离开应用反向标准曲线')
    includes(c, 'translateY(-6px) scale(0.985)', '进入应有微下落 + 微缩放')
    includes(c, 'transition: opacity 140ms ease', 'overlay 应有快速淡入淡出')
    includes(c, '@media (prefers-reduced-motion: reduce)', '应尊重减动画')
  })
})

describe('Modal 入场动效细化（duration + Apple 缓动 + translate）', () => {
  const m = read('src/components/ui/Modal.vue')

  it('遮罩从纯黑改为偏冷的 slate-900/35，模糊更克制', () => {
    includes(m, 'bg-slate-900/35 backdrop-blur-[2px]', '遮罩应为更克制的冷调')
    excludes(m, 'bg-black/30 backdrop-blur-sm', '不应再用旧的 black/30 + blur-sm')
  })

  it('入场用 260ms Apple 缓动 + opacity + 微 scale + 微 translateY', () => {
    includes(m, 'duration-[260ms] ease-[cubic-bezier(0.22,1,0.36,1)]', '入场应用 260ms Apple 缓动')
    includes(m, 'enter-from="opacity-0 scale-[0.97] translate-y-2"', '入场应同时 fade + scale + slide-up')
    includes(m, 'duration-[160ms] ease-[cubic-bezier(0.4,0,0.6,1)]', '离场应用 160ms 标准缓动')
    includes(m, 'leave-to="opacity-0 scale-[0.985] translate-y-1"', '离场应反向 fade + scale + slide')
  })

  it('遮罩 transition 也调到 220ms / 140ms', () => {
    includes(m, 'duration-[220ms] ease-out', '遮罩入场 220ms')
    includes(m, 'duration-[140ms] ease-in', '遮罩离场 140ms')
  })
})

describe('Navigation 侧栏：macOS Sidebar 风选中态（去掉旧液态动画）', () => {
  const css = read('src/styles/main.css')
  const nav = read('src/components/common/Navigation.vue')

  it('彻底移除旧的 liquidExpand 动画与紫蓝液态背景层', () => {
    excludes(css, 'liquidExpand', '不应再有 liquidExpand 关键帧动画')
    excludes(css, 'scale(0.8) rotate(-5deg)', '不应再有 rotate 弹跳')
    excludes(css, 'scale(1.1) rotate(2deg)', '不应再有 rotate 弹跳中间帧')
    // .gradient-apple / .text-gradient 等通用工具类仍保留紫蓝渐变（与 nav 无关）
    // 这里只确认 .nav-liquid-bg 上下文里不再用渐变填充
    excludes(css, '.nav-liquid-bg {\n  @apply absolute inset-0 rounded-xl transition-all duration-500 ease-out;\n  background: linear-gradient(135deg, #667eea', '.nav-liquid-bg 不应再用紫蓝渐变')
  })

  it('选中态为浅蓝底 + 内描边 + 蓝色文字加粗', () => {
    includes(css, '.nav-item.active {', '应有 .nav-item.active 规则')
    includes(css, 'background: rgba(59, 130, 246, 0.1)', '选中底应为柔和浅蓝')
    includes(css, 'box-shadow: inset 0 0 0 1px rgba(59, 130, 246, 0.18)', '应有内描边')
    includes(css, 'color: #1d4ed8', '选中文字应蓝色')
    includes(css, 'font-weight: 600', '选中文字应加粗')
  })

  it('左侧 3px 蓝色指示条（macOS Sidebar 标志）', () => {
    includes(css, '.nav-item.active::before {', '应有 ::before 蓝条')
    includes(css, 'width: 3px', '蓝条应为 3px 细条')
    includes(css, 'linear-gradient(180deg, #3b82f6, #2563eb)', '蓝条应有蓝色渐变')
    includes(css, 'nav-bar-in', '蓝条应有入场动画')
  })

  it('hover 态克制（淡灰底，不抢选中态视觉重量）', () => {
    includes(css, '.nav-item:hover:not(.active)', '应只对非活跃项 hover')
    includes(css, 'background: rgba(15, 23, 42, 0.04)', 'hover 应为极淡灰')
  })

  it('Navigation.vue 内冗余样式已清理', () => {
    excludes(nav, 'liquidExpand', 'Navigation 不应残留旧动画')
    excludes(nav, 'box-shadow: 0 0 20px rgba(99, 102, 241', 'Navigation 不应残留旧发光阴影')
    excludes(nav, '.nav-item.router-link-active::after', 'Navigation 不应残留旧伪元素')
  })

  it('Apple 缓动 + reduced-motion 兜底', () => {
    includes(css, 'cubic-bezier(0.22, 1, 0.36, 1)', '导航过渡应用 Apple 缓动')
    includes(css, '@media (prefers-reduced-motion: reduce)', '应尊重减动画')
  })
})
