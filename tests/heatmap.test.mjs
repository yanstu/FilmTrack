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

describe('豆瓣导入输入框 / 按钮圆角（分离 + 各自圆角）', () => {
  const panel = read('src/views/Import/components/DoubanImportPanel.vue')

  it('输入框与按钮分离、按钮为完整圆角', () => {
    includes(panel, 'flex gap-3', '输入框与按钮应有间距分离')
    includes(panel, 'rounded-2xl border border-transparent bg-blue-600', '按钮应为完整 2xl 圆角')
  })

  it('移除连体半圆角与连体覆盖样式', () => {
    excludes(panel, 'rounded-r-2xl', '不应再用连体半圆角')
    excludes(panel, 'douban-user-field', '不应再用连体圆角覆盖类')
  })
})

describe('观看活跃度热力图', () => {
  const heatmap = read('src/views/History/components/WatchHeatmap.vue')
  const history = read('src/views/History.vue')

  it('热力图按周分列、按观看次数分级着色', () => {
    includes(heatmap, 'TOTAL_WEEKS', '应按约一年的周数分列')
    includes(heatmap, 'const toLevel', '应有分级函数')
    includes(heatmap, 'lvl-4', '应有最高活跃度色阶')
  })

  it('历史页集成热力图并使用全量数据（不受分页/筛选影响）', () => {
    includes(history, 'WatchHeatmap', '历史页应引入热力图')
    includes(history, ':movies="movieStore.movies"', '应使用 store 全量影片')
  })
})

describe('观看活跃度热力图：hover 浮层信息', () => {
  const heatmap = read('src/views/History/components/WatchHeatmap.vue')

  it('使用自定义浮层替代原生 title 提示', () => {
    includes(heatmap, 'heatmap-tip', '应有自定义浮层容器')
    includes(heatmap, 'Teleport', '浮层应 Teleport 到 body 以免被滚动容器裁剪')
    excludes(heatmap, ':title="cell', '不应再使用原生 title 提示')
  })

  it('hover 时显示日期/周几、当天部数与作品名，并有无记录态', () => {
    includes(heatmap, 'showTip', '应有显示浮层的处理函数')
    includes(heatmap, '@mouseenter', '单元格应监听 mouseenter')
    includes(heatmap, '@mouseleave', '单元格应监听 mouseleave')
    includes(heatmap, 'WEEKDAYS', '应包含周几映射')
    includes(heatmap, 'tip.titles', '浮层应展示当天作品名')
    includes(heatmap, '这天没有观看记录', '应有无观看记录的空态文案')
  })

  it('按天收集作品名用于浮层（含标题字段）', () => {
    includes(heatmap, 'titles', '日统计应收集作品名')
    includes(heatmap, 'MAX_TIP_TITLES', '应限制浮层中作品名数量')
  })
})
