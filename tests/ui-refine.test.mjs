import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

/**
 * 本轮组件细节打磨契约（导入圆角 / 日期方向层级 / 评分 / 历史分页与统计 / 文案一致）
 * 纯字符串契约，守护关键交互与性能修复不被回退。
 */

const read = (relativePath) =>
  readFileSync(fileURLToPath(new URL(`../${relativePath}`, import.meta.url)), 'utf8')

const includes = (source, needle, message) =>
  assert.ok(source.includes(needle), `${message}\n缺少片段: ${needle}`)

const excludes = (source, needle, message) =>
  assert.ok(!source.includes(needle), `${message}\n仍存在不该出现的片段: ${needle}`)

describe('豆瓣导入输入框与按钮圆角协调', () => {
  const panel = read('src/views/Import/components/DoubanImportPanel.vue')

  it('输入框与按钮分离、各自完整圆角，无连体半圆角', () => {
    includes(panel, 'flex gap-3', '输入框与按钮应分离并留间距')
    excludes(panel, 'rounded-r-2xl', '不应再用连体半圆角')
    excludes(panel, 'rounded-r-xl', '不应再用不对称半圆角')
  })
})

describe('日期选择器弹出方向与层级', () => {
  const dateField = read('src/components/ui/DateField.vue')

  it('支持按可用空间向上弹出', () => {
    includes(dateField, 'updatePanelPosition', '应根据可用空间计算弹出位置')
    includes(dateField, "transformOrigin: above ? 'bottom left' : 'top left'", '应按方向设置变换原点')
  })

  it('Teleport 到 body + 高层级 fixed 定位，避免被遮挡/裁切', () => {
    includes(dateField, '<Teleport to="body">', '应 Teleport 到 body')
    includes(dateField, "zIndex: '99999'", '层级应足够高')
  })
})

describe('评分组件样式', () => {
  const star = read('src/components/ui/StarRating.vue')

  it('实星金色辉光 + 更强悬停反馈', () => {
    includes(star, 'drop-shadow-[0_1px_2px_rgba(234,179,8,0.35)]', '实星应有金色辉光')
    includes(star, 'hover:scale-125 active:scale-95', '悬停放大 + 按压回弹')
  })
})

describe('观看历史性能与统计样式', () => {
  const data = read('src/views/History/composables/useHistoryData.ts')
  const view = read('src/views/History.vue')

  it('历史改为真正切片分页，增量渲染避免一次性全量', () => {
    includes(data, 'allMovies.slice(startIndex, endIndex)', '应按页切片')
    includes(data, 'const hasMore = endIndex < allMovies.length', '应基于切片判断 hasMore')
    excludes(data, 'hasMore: false', '不应再一次性返回全部并 hasMore:false')
  })

  it('统计磁贴：图标芯片 + 数字 + 标签、等宽数字', () => {
    includes(
      view,
      'flex items-center gap-3 rounded-2xl border border-gray-200/60 bg-white/80 backdrop-blur-sm p-3.5',
      '统计磁贴样式'
    )
    includes(view, 'stat-ico', '应有彩色图标芯片')
    includes(view, 'font-variant-numeric: tabular-nums', '统计数字应等宽')
  })
})

describe('首页文案一致性', () => {
  const home = read('src/views/Home.vue')

  it('最近观看空状态文案与区块标题一致', () => {
    includes(home, '还没有最近观看记录', '空状态应与「最近观看」一致')
    excludes(home, '暂无重刷记录', '不应再出现与标题不符的「重刷」文案')
  })
})
