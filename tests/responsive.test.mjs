import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

/**
 * 响应式布局回归测试
 *
 * 说明：本项目测试链路是纯逻辑 / 字符串断言（无 jsdom，无法计算真实 CSS），
 * 因此这里通过「读取 .vue 源文件 + 断言响应式契约」来守护这一轮响应式改造：
 *  - 确认新的流式自适应栅格 / 断点类已就位；
 *  - 确认此前导致「某个窗口宽度恰好难看 / 溢出」的魔法数与硬断点已移除。
 * 任何人误改回硬编码布局都会在 `npm test` 时立刻失败。
 */

const read = (relativePath) =>
  readFileSync(fileURLToPath(new URL(`../${relativePath}`, import.meta.url)), 'utf8')

const expectIncludes = (source, needle, message) => {
  assert.ok(source.includes(needle), `${message}\n缺少片段: ${needle}`)
}

const expectExcludes = (source, needle, message) => {
  assert.ok(!source.includes(needle), `${message}\n仍存在不该出现的片段: ${needle}`)
}

describe('首页 Home.vue 流式自适应栅格', () => {
  const home = read('src/views/Home.vue')

  it('统计概览使用 auto-fit 流式栅格，而不是阶梯硬断点', () => {
    expectIncludes(
      home,
      '[grid-template-columns:repeat(auto-fit,minmax(160px,1fr))]',
      '统计卡片应使用 auto-fit 流式栅格'
    )
    expectExcludes(home, 'sm:grid-cols-3 lg:grid-cols-5', '统计卡片不应再使用旧的硬断点列数')
  })

  it('追剧 / 最近观看海报墙使用 auto-fill 流式栅格', () => {
    const posterMatches = home.split('[grid-template-columns:repeat(auto-fill,minmax(132px,1fr))]').length - 1
    assert.ok(posterMatches >= 2, '正在追剧与最近观看都应使用 132px 流式海报栅格')
    expectExcludes(home, '2xl:grid-cols-7', '海报墙不应再使用旧的 2xl:grid-cols-7 硬断点')
  })

  it('更新提醒与观影待办使用各自的流式栅格', () => {
    expectIncludes(
      home,
      '[grid-template-columns:repeat(auto-fill,minmax(248px,1fr))]',
      '更新提醒应使用 248px 流式栅格'
    )
    expectIncludes(
      home,
      '[grid-template-columns:repeat(auto-fill,minmax(260px,1fr))]',
      '观影待办应使用 260px 流式栅格'
    )
  })
})

describe('历史 History.vue 健壮列布局', () => {
  const history = read('src/views/History.vue')

  it('根容器改为 flex 列布局，头部不再绝对覆盖内容', () => {
    expectIncludes(history, 'h-full flex flex-col', '历史页应使用 flex 列布局')
    expectIncludes(
      history,
      'id="scroll-container" class="flex-1 min-h-0 overflow-y-auto',
      '内容区应为可伸缩的滚动容器并保留 #scroll-container 供无限滚动使用'
    )
  })

  it('头部标题与统计随宽自适应堆叠', () => {
    expectIncludes(history, 'flex flex-col gap-5 xl:flex-row', '头部应窄宽堆叠、宽屏并排')
    expectIncludes(history, 'grid grid-cols-2 gap-3 sm:grid-cols-4', '统计卡片应 2 列起步、宽到 4 列')
    expectExcludes(history, 'grid grid-cols-4 gap-4 grid-rows-1', '统计卡片不应固定 4 列')
  })

  it('移除与固定头部高度耦合的魔法数', () => {
    expectExcludes(history, 'padding-top: 12.5rem', '不应再用固定 padding-top 撑开头部高度')
    expectExcludes(history, 'top: 13.2rem', '粘性日期不应再依赖固定 13.2rem 偏移')
    expectExcludes(history, 'calc(100% - 10px)', '头部不应再硬编码滚动条宽度')
  })
})

describe('影视库 Library/index.vue 健壮列布局', () => {
  const library = read('src/views/Library/index.vue')

  it('根容器改为 flex 列布局，保留无限滚动容器', () => {
    expectIncludes(library, 'h-full flex flex-col', '影视库应使用 flex 列布局')
    expectIncludes(library, 'id="scroll-container"', '应保留 #scroll-container 供无限滚动使用')
    expectIncludes(library, 'flex-1 min-h-0 pb-8 px-8', '内容区应为可伸缩滚动容器')
  })

  it('移除绝对覆盖 + pt-48 的魔法数', () => {
    expectExcludes(library, 'absolute inset-0 pt-0', '不应再绝对覆盖整页')
    expectExcludes(library, 'pt-48', '不应再用 pt-48 给头部预留固定高度')
  })
})

describe('影视库网格 / 列表视图自适应', () => {
  const gridView = read('src/views/Library/components/GridView.vue')
  const listView = read('src/views/Library/components/ListView.vue')

  it('网格视图改为流式自适应栅格，移除多档硬断点', () => {
    expectIncludes(
      gridView,
      '[grid-template-columns:repeat(auto-fill,minmax(140px,1fr))]',
      '影视库网格应使用 140px 流式自适应栅格'
    )
    expectExcludes(gridView, 'xs:grid-cols-3', '网格不应再使用 xs 硬断点列数')
    expectExcludes(gridView, '2xl:grid-cols-7', '网格不应再使用 2xl:grid-cols-7 硬断点')
  })

  it('列表视图海报使用有效高度类，修复 h-30 无效类', () => {
    expectIncludes(listView, 'w-20 h-[7.5rem]', '列表海报应使用有效的 7.5rem 高度（2:3 比例）')
    expectExcludes(listView, 'w-20 h-30', '列表海报不应再使用无效的 h-30 类')
  })
})

describe('详情页头图与标题随宽自适应', () => {
  const header = read('src/views/Detail/components/DetailHeader.vue')
  const basicInfo = read('src/views/Detail/components/MovieBasicInfo.vue')

  it('头图高度与海报尺寸随断点缩放', () => {
    expectIncludes(header, 'relative h-72 sm:h-80 lg:h-96', '头图高度应随宽自适应')
    expectIncludes(
      header,
      'w-28 h-[10.5rem] sm:w-40 sm:h-60 lg:w-48 lg:h-72',
      '海报应随断点缩放并保持 2:3 比例'
    )
    expectIncludes(header, 'flex-1 min-w-0', '信息列应允许收缩，避免海报挤压标题')
    expectExcludes(header, 'w-48 h-72 object-cover rounded-lg shadow-xl', '海报不应再固定为 w-48 h-72')
  })

  it('标题字号随断点缩放、信息标签可换行', () => {
    expectIncludes(basicInfo, 'text-2xl sm:text-3xl lg:text-4xl', '标题字号应随宽自适应')
    expectIncludes(basicInfo, 'flex flex-wrap items-center gap-x-6', '元信息标签应允许换行')
  })
})

describe('设置弹窗 SettingsModal 窄宽不溢出', () => {
  const settings = read('src/components/ui/SettingsModal.vue')

  it('窄宽时为 flex 列、宽屏切换为侧栏网格', () => {
    expectIncludes(settings, 'flex h-full min-h-0 flex-col', '设置弹窗窄宽应为 flex 列')
    // 宽屏切换为侧栏网格（侧栏宽度可调，不绑定具体像素）
    expectIncludes(settings, 'lg:grid lg:grid-cols-[', '宽屏应切换为侧栏网格')
    expectIncludes(settings, '_minmax(0,1fr)]', '内容列应允许弹性占据剩余宽度')
  })

  it('窄宽时导航转横向、面板占满剩余高度可滚动', () => {
    expectIncludes(settings, 'overflow-x-auto', '窄宽导航应横向滚动')
    expectIncludes(settings, 'lg:flex-col', '宽屏导航恢复纵向')
    // 窄宽隐藏导航描述以节省高度（颜色/字号 token 可自由调整，只要 hidden+lg:block 即可）
    expectIncludes(settings, 'settings-nav-description', '应有导航描述节点')
    expectIncludes(settings, 'hidden text-[11px] text-gray-400 lg:block', '窄宽应隐藏导航描述')
    expectIncludes(settings, 'min-w-0 min-h-0 flex-1 overflow-y-auto', '面板应占满剩余高度并可滚动')
  })
})
