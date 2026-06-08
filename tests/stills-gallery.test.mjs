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

describe('剧照画廊重设计：Hero 番形 + 缩略条', () => {
  const gallery = read('src/views/Detail/components/DetailStillsGallery.vue')

  it('采用 Hero 番形为主视觉（不再是同尺寸一排）', () => {
    includes(gallery, 'hero-stage', '应有 Hero 番形容器')
    includes(gallery, 'aspect-ratio: 16 / 9', 'Hero 应保持 16:9 比例')
    includes(gallery, 'hero-img', 'Hero 应有专属图片节点')
  })

  it('Hero 切换有交叉淡入与右下角序号 / 大图按钮', () => {
    includes(gallery, 'hero-cross', 'Hero 切换应有交叉淡入过渡')
    includes(gallery, 'hero-index', '应有序号角标')
    includes(gallery, 'hero-zoom', '应有「大图」按钮')
    includes(gallery, 'Maximize', '大图按钮应使用 Maximize 图标')
  })

  it('Hero 上下渐隐遮罩与左右悬浮箭头', () => {
    includes(gallery, 'hero-shade-top', '应有顶部渐隐遮罩')
    includes(gallery, 'hero-shade-bottom', '应有底部渐隐遮罩')
    includes(gallery, 'hero-arrow-left', '应有左侧悬浮箭头')
    includes(gallery, 'hero-arrow-right', '应有右侧悬浮箭头')
  })

  it('缩略条：当前活跃高亮 + 蓝色底条 + 两侧渐隐', () => {
    includes(gallery, 'thumb-strip', '应有缩略条')
    includes(gallery, 'is-active', '应区分当前活跃缩略')
    includes(gallery, 'thumb-bar', '活跃缩略应有蓝色底条')
    includes(gallery, 'strip-fade-left', '缩略条左侧应渐隐')
    includes(gallery, 'strip-fade-right', '缩略条右侧应渐隐')
  })

  it('交互更克制：点 Hero 默认不开灯箱，点缩略图切换 Hero', () => {
    includes(gallery, 'prefersLightboxOnHero', '应有显式开关控制 Hero 点击行为')
    includes(gallery, 'setActive', '缩略图应有切换激活函数')
    includes(gallery, '@dblclick="openLightbox', '缩略图应支持双击直开灯箱')
  })

  it('键盘可达：悬停 Hero 时方向键切换、Enter 开大图', () => {
    includes(gallery, "event.key === 'ArrowRight'", '应处理右方向键')
    includes(gallery, "event.key === 'ArrowLeft'", '应处理左方向键')
    includes(gallery, "event.key === 'Enter'", '应处理 Enter 键开大图')
    includes(gallery, "event.key === 'Escape'", '灯箱应处理 Esc 关闭')
  })

  it('Hero 使用更高清的尺寸（w1280），缩略图换为 w300', () => {
    includes(gallery, 'w1280', 'Hero 应使用 w1280 提升清晰度')
    includes(gallery, 'w300', '缩略图改用 w300，节省带宽')
    excludes(gallery, 'w500', '不应再使用原先一刀切的 w500')
  })

  it('预加载下一张 Hero，切换更顺滑', () => {
    includes(gallery, 'preloadAround', '应有预加载函数')
    includes(gallery, 'new Image()', '应用 Image() 触发浏览器预加载')
  })

  it('保留灯箱并支持上一张/下一张/序号显示', () => {
    includes(gallery, 'lightbox-overlay', '应保留灯箱')
    includes(gallery, 'lightbox-nav', '灯箱应有翻页按钮')
    includes(gallery, 'lightbox-meta', '灯箱应显示序号')
  })

  it('不再使用原先「同尺寸一排」的实现痕迹', () => {
    excludes(gallery, '.still-thumb {', '不应再有旧的 still-thumb 块')
    excludes(gallery, 'width: 200px;\n  height: 112px;', '不应再有旧的 200x112 固定尺寸')
  })
})
