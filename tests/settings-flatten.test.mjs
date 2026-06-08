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

describe('设置弹窗：扁平化 + 去嵌套卡片 + 压缩留白', () => {
  const settings = read('src/components/ui/SettingsModal.vue')

  it('Modal 内不再叠加额外灰底（去掉 bg-gray-50/70）', () => {
    excludes(settings, 'bg-gray-50/70', '不应再有外层灰底背景')
    excludes(settings, 'bg-gray-50/40', '不应再有分区灰底背景')
  })

  it('左侧导航无 border + shadow 卡片框，只用轻分隔线', () => {
    const navStyleBlockMatch = settings.match(/\.settings-nav\s*\{[\s\S]*?\}/)
    assert.ok(navStyleBlockMatch, '应能找到 .settings-nav 样式块')
    const navStyle = navStyleBlockMatch[0]
    excludes(navStyle, 'rounded-2xl', '导航不应再用大圆角容器')
    excludes(navStyle, 'shadow-sm', '导航不应再有阴影')
    excludes(navStyle, 'bg-white', '导航不应再有独立白底')
    includes(navStyle, 'border-r', '导航与内容应只用细分隔线区分')
  })

  it('右侧内容面板去掉 border / shadow / 圆角白卡', () => {
    const panelStyleMatch = settings.match(/\.settings-panel\s*\{[\s\S]*?\}/)
    assert.ok(panelStyleMatch, '应能找到 .settings-panel 样式块')
    const panelStyle = panelStyleMatch[0]
    excludes(panelStyle, 'rounded-2xl', '内容面板不应再是圆角白卡')
    excludes(panelStyle, 'border ', '内容面板不应再有边框')
    excludes(panelStyle, 'shadow-sm', '内容面板不应再有阴影')
    includes(panelStyle, 'overflow-y-auto', '内容面板应可独立滚动')
  })

  it('分区标题改为安静的小帽体（uppercase + 灰色），不再用带下划线的强标题', () => {
    const titleStyleMatch = settings.match(/\.setting-section-title\s*\{[\s\S]*?\}/)
    assert.ok(titleStyleMatch, '应能找到 .setting-section-title 样式块')
    const titleStyle = titleStyleMatch[0]
    includes(titleStyle, 'uppercase', '标题应为 uppercase 小帽体')
    includes(titleStyle, 'tracking-[', '应有字距增加')
    excludes(titleStyle, 'border-b', '标题不应再用下划线分隔（靠 section 间距与 item 极薄边）')
  })

  it('条目间用极薄边而不是粗 border-b，每条紧凑些', () => {
    includes(settings, '.setting-item + .setting-item', '应改为相邻兄弟边')
    includes(settings, 'py-2.5', '条目应使用更紧凑的纵向间距')
    excludes(settings, '@apply flex items-center justify-between py-3;', '不应保留旧的 py-3 条目间距')
  })

  it('存储信息从"两个白卡"改为键值行排列', () => {
    const infoItemMatch = settings.match(/\.setting-info-item\s*\{[\s\S]*?\}/)
    assert.ok(infoItemMatch, '应能找到 .setting-info-item 样式块')
    const infoItem = infoItemMatch[0]
    excludes(infoItem, 'bg-white', '存储信息项不应再是白卡')
    excludes(infoItem, 'rounded-lg', '存储信息项不应再是圆角卡片')
    includes(infoItem, 'border-b border-gray-100', '应改为键值行间细线分隔')
  })

  it('版本徽章从蓝色胶囊改为轻量 mono 文字', () => {
    const pillMatch = settings.match(/\.version-pill\s*\{[\s\S]*?\}/)
    assert.ok(pillMatch, '应能找到 .version-pill 样式块')
    const pillStyle = pillMatch[0]
    excludes(pillStyle, 'rounded-full', '版本徽章不应再是胶囊')
    excludes(pillStyle, 'bg-blue-50', '版本徽章不应再用蓝色底')
    excludes(pillStyle, 'border-blue-100', '版本徽章不应再有蓝色边框')
    includes(pillStyle, 'text-gray-500', '应改为低饱和的标签灰')
  })

  it('保留扁平化、无嵌套卡片、紧凑留白的注释自描述', () => {
    includes(settings, '扁平化', '应在样式头注释中点明扁平化目标')
    includes(settings, '无嵌套卡片', '应说明去嵌套卡片')
    includes(settings, '紧凑留白', '应说明压缩留白')
  })
})
