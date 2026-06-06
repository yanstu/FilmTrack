import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

/**
 * 本轮 UI 打磨契约测试（详情封面质感 / 记录搜索交互 / 豆瓣文案 / 设置留白）
 * 纯字符串契约，守护关键交互与质感细节不被误删。
 */

const read = (relativePath) =>
  readFileSync(fileURLToPath(new URL(`../${relativePath}`, import.meta.url)), 'utf8')

const includes = (source, needle, message) =>
  assert.ok(source.includes(needle), `${message}\n缺少片段: ${needle}`)

const excludes = (source, needle, message) =>
  assert.ok(!source.includes(needle), `${message}\n仍存在不该出现的片段: ${needle}`)

describe('详情页封面质感', () => {
  const header = read('src/views/Detail/components/DetailHeader.vue')

  it('封面使用多层渐变（底部承托 / 左侧聚焦 / 顶部压暗）', () => {
    includes(header, 'from-black/90 via-black/45 to-black/5', '底部承托渐变')
    includes(header, 'bg-gradient-to-r from-black/55', '左侧聚焦渐变')
    includes(header, 'top-0 h-24 bg-gradient-to-b from-black/35', '顶部压暗渐变')
  })

  it('无背景图时有优雅回退底色', () => {
    includes(header, 'from-slate-700 via-slate-900 to-black', '无图回退底色')
  })

  it('海报阴影 / 描边升级质感', () => {
    includes(header, 'rounded-xl shadow-2xl ring-1 ring-white/15', '海报质感')
  })
})

describe('记录页搜索结果交互', () => {
  const results = read('src/views/Record/components/SearchResults.vue')

  it('显示结果计数与回车提示', () => {
    includes(results, '找到 {{ results.length }} 个结果', '结果计数')
    includes(results, '选择第一个', '回车提示')
  })

  it('首条结果高亮为回车目标', () => {
    includes(results, "index === 0 && !isAlreadyAdded(result) ? 'ring-1 ring-blue-200/70'", '首条高亮')
  })

  it('悬停用位移而非整卡缩放，避免抖动', () => {
    includes(results, 'hover:-translate-y-0.5 hover:shadow-md', '悬停位移')
    excludes(results, 'hover:scale-[1.01]', '不应再用整卡缩放悬停')
  })
})

describe('豆瓣导入文案', () => {
  const panel = read('src/views/Import/components/DoubanImportPanel.vue')
  const notice = read('src/views/Import/components/ImportNotice.vue')

  it('补上「看过」列表需公开的前置提示', () => {
    includes(panel, '先确认豆瓣「看过」列表是公开的', '公开列表前置')
  })

  it('说明导入在本地完成、不上传账号', () => {
    includes(notice, '不会上传你的豆瓣账号或数据', '隐私说明')
  })
})

describe('设置弹窗尺寸与留白', () => {
  const settings = read('src/components/ui/SettingsModal.vue')

  it('面板尺寸已收敛', () => {
    includes(settings, 'max-w-[min(92vw,880px)] h-[min(84vh,720px)]', '面板尺寸')
  })

  it('设置分区改为扁平分组，去除嵌套卡片框', () => {
    excludes(settings, 'border border-gray-200/80 rounded-2xl p-5 bg-gray-50/40', '不应再用带框分区卡片')
    includes(settings, '扁平分组', '分区应为扁平分组')
  })
})
