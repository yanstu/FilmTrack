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

describe('TMDb API: getVideos / getImages', () => {
  const api = read('src/utils/api.ts')
  const types = read('src/types/index.ts')

  it('提供独立的 getVideos / getImages 接口（带缓存键 + 语言偏好）', () => {
    includes(api, 'async getVideos(', '应提供 getVideos')
    includes(api, 'async getImages(', '应提供 getImages')
    includes(api, "cacheKey = `videos_${mediaType}_${tmdbId}`", '应缓存视频结果')
    includes(api, "cacheKey = `images_${mediaType}_${tmdbId}`", '应缓存图片结果')
    includes(api, "include_video_language: 'zh,null,en'", '视频应优先中文 / 任意 / 英文')
    includes(api, "include_image_language: 'zh,null,en'", '图片应优先中文 / 任意 / 英文')
  })

  it('类型层导出 TMDbVideo / TMDbImage / 对应 Response 类型', () => {
    includes(types, 'interface TMDbVideo', '应有 TMDbVideo 类型')
    includes(types, 'interface TMDbVideosResponse', '应有 TMDbVideosResponse')
    includes(types, 'interface TMDbImage', '应有 TMDbImage')
    includes(types, 'interface TMDbImagesResponse', '应有 TMDbImagesResponse')
    includes(types, 'videos?: TMDbVideosResponse', 'TMDbMovieDetail 应可附带 videos')
    includes(types, 'images?: TMDbImagesResponse', 'TMDbMovieDetail 应可附带 images')
  })
})

describe('详情页预告片（DetailTrailer）', () => {
  const c = read('src/views/Detail/components/DetailTrailer.vue')

  it('按优先级挑视频：Trailer > Teaser > Featurette > …，并过滤 YouTube', () => {
    includes(c, "Trailer: 0", '应有优先级映射')
    includes(c, "Teaser: 1", '应包含 Teaser 次级')
    includes(c, "v.site === 'YouTube'", '应仅保留 YouTube 来源')
    includes(c, 'PRIORITY[a.type]', '应使用优先级排序')
  })

  it('在 Teleport 弹窗中以 youtube-nocookie 嵌入播放', () => {
    includes(c, '<Teleport v-if="playerOpen" to="body">', '应 Teleport 到 body 播放')
    includes(c, 'youtube-nocookie.com/embed/', '应使用 nocookie 域名')
    includes(c, "event.key === 'Escape'", '应支持 Esc 关闭弹窗')
  })

  it('未拿到视频时区段安静隐藏，错误时给重试按钮', () => {
    includes(c, 'v-if="visible"', '应按是否有视频/加载/错误条件显示')
    includes(c, 'trailer-retry', '错误态应有重试按钮')
    includes(c, '<Skeleton', '加载态应使用骨架占位')
  })
})

describe('详情页剧照画廊（DetailStillsGallery）', () => {
  const c = read('src/views/Detail/components/DetailStillsGallery.vue')

  it('横向缩略图条 + 灯箱大图 + 键盘左右切换 + Esc 关', () => {
    includes(c, 'class="stills-row scrollbar-apple"', '应横向滚动缩略图条')
    includes(c, 'class="lightbox-overlay"', '应有灯箱遮罩')
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

describe('详情页：DetailContent 引入预告片 + 剧照画廊', () => {
  const c = read('src/views/Detail/components/DetailContent.vue')

  it('在剧情简介下方接入 DetailTrailer 与 DetailStillsGallery，仅当有 tmdb_id 时显示', () => {
    includes(c, "import DetailTrailer from './DetailTrailer.vue'", '应导入 DetailTrailer')
    includes(c, "import DetailStillsGallery from './DetailStillsGallery.vue'", '应导入 DetailStillsGallery')
    includes(c, '<DetailTrailer', '应渲染预告片区')
    includes(c, '<DetailStillsGallery', '应渲染剧照画廊')
    includes(c, 'v-if="movie.tmdb_id"', '应在缺少 tmdb_id 时隐藏（避免无效请求）')
    includes(c, "movieMediaType = computed<'movie' | 'tv'>", '应推导 mediaType')
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

describe('CSP 已为 YouTube iframe 放行', () => {
  const tauri = read('src-tauri/tauri.conf.json')

  it('frame-src 包含 youtube-nocookie 与 youtube', () => {
    includes(tauri, 'frame-src', 'CSP 应显式声明 frame-src')
    includes(tauri, 'https://www.youtube-nocookie.com', '应放行 nocookie 域名')
    includes(tauri, 'https://www.youtube.com', '应放行 youtube 域名')
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
