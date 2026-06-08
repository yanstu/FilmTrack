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

describe('1. 详情页 Hero Backdrop 色彩延伸层', () => {
  const detail = read('src/views/Detail/index.vue')

  it('挂载 detail-ambient 色彩延伸层并支持兜底', () => {
    includes(detail, 'detail-ambient', '应有 detail-ambient 容器')
    includes(detail, 'detail-ambient-fallback', '应有无 backdrop 的优雅兜底色斑')
    includes(detail, 'ambientBackdropUrl', '应有计算属性产出 backdrop URL')
  })

  it('Ambient 层有模糊 + 饱和 + 向下渐隐遮罩 + 渐入动画', () => {
    includes(detail, 'blur(68px) saturate(1.3)', '应有模糊 + 适度饱和')
    includes(detail, 'mask-image: linear-gradient', '应通过 mask 向下渐隐')
    includes(detail, 'ambient-fade-in', '初次出现应有渐入')
    includes(detail, '@media (prefers-reduced-motion: reduce)', '应尊重系统偏好')
  })

  it('Ambient 层全宽铺底（不被限宽容器裁切）、不可点击、在内容之下', () => {
    includes(detail, 'pointer-events: none', 'Ambient 应不阻塞点击')
    includes(detail, 'z-index: 0', 'Ambient 应在底层')
    includes(detail, 'inset: 0 0 auto 0', 'Ambient 应紧贴根容器左右两侧（全宽）')
    includes(detail, 'overflow-y-auto overflow-x-hidden', '根容器应锁横向溢出，避免 ambient scale 引起 X 滚动条')
  })

  it('优先使用 movie.backdrop_path，回退到首张候选剧照', () => {
    includes(detail, 'movie.backdrop_path', '应优先 backdrop_path')
    includes(detail, 'backdropImages?.[0]', '应回退到首张剧照')
  })
})

describe('2. 首页统计数字增长动画（useCountUp）', () => {
  const composable = read('src/composables/useCountUp.ts')
  const home = read('src/views/Home.vue')

  it('composable 使用 RAF + ease-out-cubic 实现 800ms 增长', () => {
    includes(composable, 'requestAnimationFrame', '应用 RAF 驱动')
    includes(composable, 'easeOutCubic', '应有 ease-out-cubic 缓动')
    includes(composable, 'duration = 800', '默认 800ms')
    includes(composable, 'prefersReducedMotion', '应尊重系统减动画')
  })

  it('composable 支持小数位（如评分 0.0）与延迟（多卡错峰）', () => {
    includes(composable, 'decimals?:', '应支持 decimals')
    includes(composable, 'delay?:', '应支持 delay')
    includes(composable, 'options.immediate', '应支持立即跳到终值')
  })

  it('Home.vue 5 张统计卡分别接入动画值，并按 50ms 错峰', () => {
    includes(home, 'animatedTotal', '总数应接动画')
    includes(home, 'animatedCompleted', '完成数应接动画')
    includes(home, 'animatedAverageRating', '平均评分应接动画')
    includes(home, 'animatedThisMonth', '本月观看应接动画')
    includes(home, 'animatedThisYear', '今年观看应接动画')
    includes(home, 'delay: 50', '相邻卡应有 50ms 错峰')
    includes(home, 'delay: 100', '第三卡延迟 100ms')
    includes(home, 'delay: 150', '第四卡延迟 150ms')
    includes(home, 'delay: 200', '第五卡延迟 200ms')
    includes(home, 'averageRatingDisplay', '评分应通过计算属性兜底格式化')
  })
})

describe('3. 成功 Toast 体系（utils/toast + ToastStack）', () => {
  const svc = read('src/utils/toast.ts')
  const stack = read('src/components/common/ToastStack.vue')
  const item = read('src/components/common/ToastItemView.vue')
  const app = read('src/App.vue')

  it('Toast 服务暴露 success / info / warning / error 与栈管理', () => {
    includes(svc, 'success:', '应有 success')
    includes(svc, 'info:', '应有 info')
    includes(svc, 'warning:', '应有 warning')
    includes(svc, 'error:', '应有 error')
    includes(svc, 'dismiss', '应有 dismiss')
    includes(svc, 'MAX_STACK', '应限制栈深防止堆积')
  })

  it('ToastStack 用 TransitionGroup 渲染，挂在右上角且支持 reduced-motion', () => {
    includes(stack, 'TransitionGroup', '应用 TransitionGroup 实现栈动效')
    includes(stack, 'Teleport to="body"', '应 Teleport 到 body')
    includes(stack, 'toast-stack-anim', '应有 enter/leave 动画类名')
    includes(stack, '@media (prefers-reduced-motion: reduce)', '应尊重减动画')
  })

  it('ToastItem 成功态有打勾微动效与自动消失计时', () => {
    includes(item, 'success-pop', '成功 icon 应有弹入动效')
    includes(item, 'setTimeout', '应有自动消失计时器')
    includes(item, 'CheckCircle2 as SuccessIcon', '成功应用 CheckCircle2 图标')
  })

  it('App.vue 挂载 ToastStack；设置保存接入 toast.success', () => {
    includes(app, '<ToastStack />', 'App 应挂载 ToastStack')
    includes(app, "from './utils/toast'", '应导入 toast 服务')
    includes(app, "toast.success('设置已保存'", '设置保存应触发成功 toast')
  })

  it('详情页复制 / 删除 / 保存 / 更新影视信息 接入 toast 替代模态框', () => {
    const actions = read('src/views/Detail/composables/useDetailActions.ts')
    const data = read('src/views/Detail/composables/useDetailData.ts')
    includes(actions, "toast.success('已复制到剪贴板'", '复制成功应走 toast')
    includes(actions, "toast.success('已删除'", '删除成功应走 toast')
    includes(data, "toast.success('记录已保存')", '保存成功应走 toast')
    includes(data, "toast.success('影视信息已更新'", '影视信息更新应走 toast')
    excludes(actions, "appStore.modalService.showInfo('复制成功'", '复制成功不应再用模态框')
  })
})

describe('4. 海报卡 hover 升级（MovieCard）', () => {
  const card = read('src/components/business/MovieCard.vue')

  it('hover 时图片轻微缩放（1.06）+ 卡片上移 -6px + 阴影加强', () => {
    includes(card, 'transform: scale(1.06)', '海报应 hover 时缩放 1.06')
    includes(card, 'translateY(-6px)', '卡片上移应为 -6px（更克制）')
    includes(card, '0 22px 44px -24px rgba(15, 23, 42, 0.4)', '应加强 hover 阴影')
  })

  it('底部 hover 渐变蒙版与「查看详情」CTA 上滑', () => {
    includes(card, 'poster-hover-veil', '应有底部渐变蒙版')
    includes(card, 'poster-cta', '应有底部 CTA 容器')
    includes(card, 'poster-cta-btn', '应有「查看详情」按钮')
    includes(card, 'goToDetail', '应有跳详情的方法')
  })

  it('右上次级操作（编辑 / 删除）默认隐藏、hover 渐显', () => {
    includes(card, 'poster-quick-actions', '应有次级操作容器')
    includes(card, 'poster-quick-btn-danger', '删除应有 danger 样式')
    excludes(card, 'bg-black/60 opacity-0 group-hover:opacity-100', '不应再用旧的全屏黑蒙版')
  })

  it('使用 Apple 经典缓动曲线 + 减动画兜底', () => {
    includes(card, 'cubic-bezier(0.22, 1, 0.36, 1)', '应用 Apple 经典 ease-out')
    includes(card, '@media (prefers-reduced-motion: reduce)', '应尊重系统减动画')
  })
})
