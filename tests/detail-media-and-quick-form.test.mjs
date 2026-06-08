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

describe('TMDb API: getImages（仅剧照；预告片此前已移除）', () => {
  const api = read('src/utils/api.ts')
  const types = read('src/types/index.ts')

  it('提供 getImages 接口（带缓存键 + 语言偏好）；不再有 getVideos', () => {
    includes(api, 'async getImages(', '应提供 getImages')
    includes(api, "cacheKey = `images_${mediaType}_${tmdbId}`", '应缓存图片结果')
    includes(api, "include_image_language: 'zh,null,en'", '图片应优先中文 / 任意 / 英文')
    excludes(api, 'async getVideos(', '不应再保留 getVideos（预告片已移除）')
  })

  it('类型层导出 TMDbImage 与 TMDbImagesResponse（剧照所需）', () => {
    includes(types, 'interface TMDbImage', '应有 TMDbImage')
    includes(types, 'interface TMDbImagesResponse', '应有 TMDbImagesResponse')
    includes(types, 'images?: TMDbImagesResponse', 'TMDbMovieDetail 应可附带 images')
  })
})

describe('详情页剧照画廊（DetailStillsGallery）', () => {
  const c = read('src/views/Detail/components/DetailStillsGallery.vue')

  it('Hero 番形主视觉 + 缩略条 + 灯箱大图 + 键盘左右切换 + Esc 关（升级版）', () => {
    includes(c, 'hero-stage', '应有 Hero 番形作为主视觉')
    includes(c, 'class="thumb-strip scrollbar-apple"', '应有缩略条横向滚动')
    includes(c, 'class="lightbox-overlay"', '应保留灯箱遮罩')
    includes(c, "event.key === 'ArrowRight'", '应支持右键下一张')
    includes(c, "event.key === 'ArrowLeft'", '应支持左键上一张')
    includes(c, "event.key === 'Escape'", '应支持 Esc 关闭')
  })

  it('按 vote_average + vote_count 排序，限制最多展示数量', () => {
    includes(c, 'sortByQuality', '应有按质量排序逻辑')
    includes(c, 'b.vote_average - a.vote_average', '应按评分降序')
    includes(c, 'max?: number', '应可配置最大数量')
    includes(c, "max: 12", '默认应展示 12 张')
  })

  it('使用骨架占位 + 仅在确有数据时显示区段', () => {
    includes(c, '<Skeleton', '加载态应使用骨架')
    includes(c, 'v-if="visible"', '应按 visible 控制区段渲染')
  })
})

describe('详情页：DetailContent 接入剧照画廊（预告片已移除）', () => {
  const c = read('src/views/Detail/components/DetailContent.vue')

  it('剧情简介下方接入 DetailStillsGallery，仅当有 tmdb_id 时显示；不再引入 DetailTrailer', () => {
    includes(c, "import DetailStillsGallery from './DetailStillsGallery.vue'", '应导入 DetailStillsGallery')
    includes(c, '<DetailStillsGallery', '应渲染剧照画廊')
    includes(c, 'v-if="movie.tmdb_id"', '应在缺少 tmdb_id 时隐藏（避免无效请求）')
    includes(c, "movieMediaType = computed<'movie' | 'tv'>", '应推导 mediaType')
    excludes(c, 'DetailTrailer', '不应再导入或渲染预告片组件')
  })
})

describe('一体式快速记录弹窗（QuickRecordDialog）', () => {
  const c = read('src/views/Detail/components/QuickRecordDialog.vue')

  it('包含 进度 / 评分 / 短评 三个分区，并一次性 emit save', () => {
    includes(c, '进度', '应有进度分区')
    includes(c, '评分', '应有评分分区')
    includes(c, '短评 / 备注', '应有短评分区')
    includes(c, "emit('save', partial)", '保存时一次性 emit save')
  })

  it('TV 提供 -/+ 步进 + 完成状态自动切换；Movie 提供"已经看完"开关', () => {
    includes(c, 'getNextWatchProgress', '应使用下一集工具函数')
    includes(c, 'getPreviousWatchProgress', '应使用上一集工具函数')
    includes(c, 'willMarkCompleted', '应有自动标记完成的判定')
    includes(c, 'markedCompleted', 'Movie 应有完成状态开关')
  })

  it('显示本次 delta（+N 集 / 回退 N 集）+ 280 字软限制', () => {
    includes(c, 'quick-delta', '应有本次增量提示')
    includes(c, 'value.slice(0, 280)', '短评应有 280 字软限制')
  })

  it('从 planned / paused 自动切到 watching；新完成时自动写今天观看日期', () => {
    includes(c, "['planned', 'paused'].includes(initialStatus.value)", '应在原状态为 planned/paused 时自动切 watching')
    includes(c, "watched_date = new Date().toISOString().slice(0, 10)", '应自动写今天为观看日期')
  })
})

describe('ActionButtons / DetailSidebar 接入"快速记录"主操作', () => {
  const ab = read('src/views/Detail/components/ActionButtons.vue')
  const sb = read('src/views/Detail/components/DetailSidebar.vue')
  const idx = read('src/views/Detail/index.vue')
  const types = read('src/views/Detail/types.ts')

  it('ActionButtons 把"快速记录"作为主操作（蓝色 + Zap 图标），原"标记当前集"降级文案', () => {
    includes(ab, "@click=\"$emit('quickRecord')\"", '主按钮应派发 quickRecord')
    includes(ab, 'ZapIcon', '主按钮应使用 Zap 图标')
    includes(ab, '快速记录', '主按钮文案应为"快速记录"')
    includes(ab, '仅标记下一集', '辅按钮应改为"仅标记下一集"以避免与快速记录混淆')
  })

  it('DetailSidebar 透传 quickRecord；types 同步加入 quickRecord emits', () => {
    includes(sb, "@quick-record=\"$emit('quickRecord')\"", '侧栏应透传 quickRecord')
    includes(types, "(e: 'quickRecord'): void;", 'types 应加入 quickRecord emits')
  })

  it('Detail/index 接住 quickRecord 打开 QuickRecordDialog，保存复用已有 handleSaveRecord', () => {
    includes(idx, 'QuickRecordDialog', '详情应挂载 QuickRecordDialog')
    includes(idx, 'openQuickRecord', '详情应有打开方法')
    includes(idx, 'handleQuickSave', '详情应桥接保存')
    includes(idx, 'await handleSaveRecord', '应复用已有保存链路')
  })
})

describe('CSP 不再为已移除的 YouTube iframe 放行（同步回滚）', () => {
  const tauri = read('src-tauri/tauri.conf.json')

  it('CSP 不再含 youtube 域名（预告片已移除，CSP 应回滚）', () => {
    excludes(tauri, 'youtube-nocookie', 'CSP 不应再含 nocookie 域名')
    excludes(tauri, 'www.youtube.com', 'CSP 不应再含 youtube 域名')
  })
})

describe('详情页隐藏「片源 / 线路」UI（减少新手心智，统一走设置 → 播放）', () => {
  const panel = read('src/views/Detail/components/DetailPlayerPanel.vue')

  it('详情页不再渲染 sourceOptions / lineOptions 两个 select', () => {
    excludes(panel, 'player-source-grid', '不应再保留片源/线路网格容器')
    excludes(panel, 'player-source-field', '不应再保留片源/线路字段容器')
    excludes(panel, 'placeholder="选择片源"', '不应再渲染"选择片源"下拉')
    excludes(panel, 'placeholder="选择线路"', '不应再渲染"选择线路"下拉')
  })

  it('对应的 import / handler / disabled 计算也一并清理', () => {
    excludes(panel, "import HeadlessSelect from", '不应再导入 HeadlessSelect')
    excludes(panel, 'handleSelectSource', '不应再保留片源选择 handler')
    excludes(panel, 'handleSelectLine', '不应再保留线路选择 handler')
    excludes(panel, 'sourceSelectDisabled', '不应再保留片源禁用计算')
    excludes(panel, 'lineSelectDisabled', '不应再保留线路禁用计算')
    excludes(panel, 'sourceOptions', '不应再保留 sourceOptions')
    excludes(panel, 'lineOptions', '不应再保留 lineOptions')
  })

  it('错误态保留"去设置换源"入口作为高级用户出口', () => {
    includes(panel, 'openPlaybackSettings', '错误态应有跳设置入口')
    includes(panel, "section: 'video'", '应跳到设置的"播放"区')
  })
})

describe('上一集工具函数（getPreviousWatchProgress）', () => {
  const s = read('src/utils/seasonProgress.ts')

  it('支持当前集回退、跨季回到上一季最后一集', () => {
    includes(s, 'export const getPreviousWatchProgress', '应导出工具函数')
    includes(s, 'current.episode > 1', '应优先当季回退')
    includes(s, 'previousSeasons', '应支持跨季回退')
    includes(s, 'getSeasonEpisodeCount(source, prevSeason)', '回退应落到上季最后一集')
  })
})
