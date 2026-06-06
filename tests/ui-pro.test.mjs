import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

/**
 * 本轮「上线级」改造契约：
 *  - 日期选择器 Teleport 到 body，避免被弹窗 overflow 裁切；
 *  - 片源/线路选择移到详情页播放面板，设置只管默认配置；
 *  - 评分图标升级为圆角星 + 琥珀金；
 *  - 去除「人机味」文案。
 */

const read = (relativePath) =>
  readFileSync(fileURLToPath(new URL(`../${relativePath}`, import.meta.url)), 'utf8')

const includes = (source, needle, message) =>
  assert.ok(source.includes(needle), `${message ?? '缺少片段'}: ${needle}`)

const excludes = (source, needle, message) =>
  assert.ok(!source.includes(needle), `${message ?? '存在不该出现的片段'}: ${needle}`)

describe('日期选择器 Teleport 不被弹窗裁切', () => {
  const df = read('src/components/ui/DateField.vue')

  it('日历 Teleport 到 body 并用 fixed 定位', () => {
    includes(df, '<Teleport to="body">', '应 Teleport 到 body')
    includes(df, "position: 'fixed'", '定位应为 fixed')
    includes(df, 'panelRef', '应有面板引用')
  })

  it('点击面板内部不会被误判为点击外部而关闭', () => {
    includes(df, 'insidePanel', '点击外部检测应排除面板自身')
  })
})

describe('片源/线路移到详情页，设置只管默认', () => {
  const panel = read('src/views/Detail/components/DetailPlayerPanel.vue')
  const settings = read('src/components/ui/SettingsModal.vue')

  it('详情播放面板提供片源与线路选择', () => {
    includes(panel, '片源', '应有片源选择')
    includes(panel, '线路', '应有线路选择')
    includes(panel, 'handleSelectSource', '应有片源切换处理')
    includes(panel, 'handleSelectLine', '应有线路切换处理')
  })

  it('设置弹窗不再含「当前影片」按影片选片源/线路', () => {
    excludes(settings, '当前影片', '设置不应再有当前影片片源/线路')
    excludes(settings, 'select-detail-source', '设置不应再发按影片选片源事件')
  })
})

describe('设置弹窗扁平化（少圈框）', () => {
  const settings = read('src/components/ui/SettingsModal.vue')

  it('分区为扁平分组而非嵌套卡片框', () => {
    includes(settings, '扁平分组', '分区应扁平化')
    excludes(settings, 'bg-gray-50/40', '不应再有分区卡片底色框')
  })
})

describe('评分图标升级为圆角星 + 琥珀金', () => {
  const star = read('src/components/ui/StarRating.vue')

  it('使用圆角星路径与琥珀金', () => {
    includes(star, '.563.563', '应为圆角星路径')
    includes(star, 'text-amber-400', '实星应为琥珀金')
  })
})

describe('去除人机味文案', () => {
  const home = read('src/views/Home.vue')
  const record = read('src/views/Record/index.vue')

  it('首页不再用「放在一个地方 / 放在这里」', () => {
    excludes(home, '放在一个地方', '首页副标题应自然')
    excludes(home, '放在这里', '待办副标题应自然')
  })

  it('记录页不再用生硬的「构建个人影视库」', () => {
    excludes(record, '构建个人影视库', '应更自然口语')
  })
})
