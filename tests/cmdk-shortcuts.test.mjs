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

describe('全局快捷键管理器（useShortcuts）', () => {
  const src = read('src/composables/useShortcuts.ts')

  it('提供集中注册的 useShortcuts 与可读化的 formatShortcut', () => {
    includes(src, 'export function useShortcuts', '应导出 useShortcuts')
    includes(src, 'formatShortcut', '应提供 formatShortcut 工具')
  })

  it('默认在输入框中不触发；区分 mac ⌘ 与其它平台 Ctrl', () => {
    includes(src, 'allowInInput', '应支持输入框过滤开关')
    includes(src, 'isMacOS', '应按平台决定 mod 键')
    includes(src, "'input, textarea, [contenteditable=\"true\"]'", '应通过 selector 判定输入框')
  })

  it('mod 键根据平台映射到 metaKey / ctrlKey', () => {
    includes(src, 'metaKey', '应识别 mac 的 metaKey')
    includes(src, 'ctrlKey', '应识别其它平台的 ctrlKey')
  })
})

describe('全局命令面板（CommandPalette）', () => {
  const src = read('src/components/common/CommandPalette.vue')

  it('监听 open-command-palette 事件、支持键盘导航', () => {
    includes(src, 'open-command-palette', '应监听打开事件')
    includes(src, 'ArrowDown', '应支持向下键')
    includes(src, 'ArrowUp', '应支持向上键')
    includes(src, "e.key === 'Enter'", '应支持回车执行')
    includes(src, "e.key === 'Escape'", '应支持 Esc 关闭')
  })

  it('包含页面跳转 / 设置 / 检查更新 等基础动作 + 作品搜索', () => {
    includes(src, "name: 'Home'", '应有跳首页')
    includes(src, "name: 'Library'", '应有跳影视库')
    includes(src, "name: 'Record'", '应有跳记录页')
    includes(src, "name: 'History'", '应有跳历史')
    includes(src, "name: 'Import'", '应有跳导入')
    includes(src, 'open-settings', '应有打开设置动作')
    includes(src, 'trigger-check-update', '应有检查更新动作')
    includes(src, 'movieStore.movies', '应能搜索作品')
  })

  it('搜索结果对命中词做高亮（mark 包裹）', () => {
    includes(src, '<mark>', '应对匹配文本加高亮')
  })
})

describe('快捷键帮助弹窗（ShortcutsHelp）', () => {
  const src = read('src/components/common/ShortcutsHelp.vue')

  it('列出全局 / 页面跳转 / 列表 三类快捷键', () => {
    includes(src, '打开命令面板', '应有命令面板说明')
    includes(src, '打开设置', '应有设置说明')
    includes(src, '快捷键帮助', '应有自指说明')
    includes(src, '首页', '应列出页面跳转')
    includes(src, '右键作品卡片', '应说明右键菜单')
  })
})

describe('App.vue 接入快捷键 / 命令面板 / 帮助 / 右键菜单 / 新版 toast', () => {
  const app = read('src/App.vue')

  it('挂载 CommandPalette / ShortcutsHelp / ContextMenu 三个全局组件', () => {
    includes(app, '<CommandPalette', '应挂载命令面板')
    includes(app, '<ShortcutsHelp', '应挂载帮助弹窗')
    includes(app, '<ContextMenu', '应挂载右键菜单容器')
  })

  it('使用 useShortcuts 注册 ⌘K / ⌘, / ⌘/ / ⌘1..5', () => {
    includes(app, 'useShortcuts(', '应通过 useShortcuts 注册')
    includes(app, "key: 'k'", '应有 ⌘K')
    includes(app, "key: '/'", '应有 ⌘/ 帮助')
    includes(app, "key: '1'", '应有跳首页')
    includes(app, "key: '5'", '应有跳导入')
  })

  it('监听托盘 / 命令面板派发的 trigger-check-update', () => {
    includes(app, "'trigger-check-update'", '应监听检查更新事件')
    includes(app, 'unlistenTriggerCheckUpdate', '应通过 Tauri listen 接收托盘事件')
  })

  it('ErrorToast 升级：传入 tone 与可选 retry', () => {
    includes(app, ':tone="globalErrorTone"', '应根据错误启发式设置 tone')
    includes(app, ':on-retry="globalErrorRetry"', '应允许带 retry 动作')
  })
})

describe('main.ts 全局右键放行带 data-context-menu 的元素', () => {
  const src = read('src/main.ts')

  it('保留输入框、放行 [data-context-menu]', () => {
    includes(src, "input, textarea, [contenteditable=\"true\"]", '应保留输入框系统菜单')
    includes(src, "[data-context-menu]", '应放行带标记的元素')
  })
})

describe('MovieCard 接入右键菜单', () => {
  const src = read('src/components/business/MovieCard.vue')

  it('卡片打上 data-context-menu 并拦截 contextmenu 事件', () => {
    includes(src, 'data-context-menu', '应标记右键容器')
    includes(src, '@contextmenu.prevent="handleContextMenu"', '应处理右键事件')
  })

  it('菜单项至少含：打开 / 编辑 / 复制 / TMDb / 删除（danger）', () => {
    includes(src, '打开详情', '应有打开详情项')
    includes(src, '编辑记录', '应有编辑项')
    includes(src, '复制标题', '应有复制项')
    includes(src, '在 TMDb 中打开', '应有 TMDb 项')
    includes(src, "danger: true", '删除应为危险样式')
  })
})

describe('Rust 托盘菜单增强', () => {
  const src = read('src-tauri/src/main.rs')

  it('增加 show_main / check_update 菜单项与对应处理', () => {
    includes(src, '"show_main"', '应有显示主窗菜单')
    includes(src, '"check_update"', '应有检查更新菜单')
    includes(src, 'tooltip("影迹 Pro', '应设置托盘 tooltip')
    includes(src, 'emit("trigger-check-update"', '应通过事件通知前端检查更新')
  })

  it('注册 tauri-plugin-notification', () => {
    includes(src, 'tauri_plugin_notification::init', '应注册通知插件')
  })
})

describe('桌面通知服务', () => {
  const src = read('src/services/desktop-notifications.ts')
  const home = read('src/views/Home/composables/useHomeData.ts')
  const cap = read('src-tauri/capabilities/main.json')
  const cargo = read('src-tauri/Cargo.toml')

  it('封装权限申请并支持按 key+日期去重', () => {
    includes(src, 'ensureNotificationPermission', '应提供权限申请')
    includes(src, 'sendDesktopNotification', '应提供发送函数')
    includes(src, "STORAGE_PREFIX = 'desktop-notification:'", '应有去重存储前缀')
  })

  it('首页加载提醒时尝试推送今日要播的剧（去重）', () => {
    includes(home, 'notifyTodayAirings', '首页应整理今日推送')
    includes(home, 'sendDesktopNotification', '应调用桌面通知')
    includes(home, 'tv-airings-', '应带日期化的去重 key')
  })

  it('Rust 依赖 + capability 已配置 notification', () => {
    includes(cargo, 'tauri-plugin-notification', 'Cargo.toml 应含 notification 依赖')
    includes(cap, 'notification:allow-notify', 'capability 应含 notify 权限')
    includes(cap, 'notification:allow-request-permission', 'capability 应含权限申请权限')
  })
})

describe('骨架屏与空态组件', () => {
  const sk = read('src/components/common/Skeleton.vue')
  const es = read('src/components/common/EmptyState.vue')
  const home = read('src/views/Home.vue')
  const lib = read('src/views/Library/components/LibraryStates.vue')

  it('Skeleton 提供 line / block / circle / poster / card 形态', () => {
    includes(sk, "variant?: 'line' | 'block' | 'circle' | 'poster' | 'card'", '应导出 5 种形态')
    includes(sk, '@keyframes shimmer', '应有 shimmer 动画')
    includes(sk, 'prefers-reduced-motion', '应支持减弱动效')
  })

  it('EmptyState 提供 tone / icon / actionLabel / hint / dense', () => {
    includes(es, "tone?: Tone", '应支持 tone')
    includes(es, 'actionLabel', '应支持行动按钮')
    includes(es, 'hint', '应支持二级提示')
    includes(es, 'dense', '应支持紧凑布局')
  })

  it('Home 接入 Skeleton 替代原 spinner、并使用 EmptyState 三态', () => {
    includes(home, "import Skeleton from '../components/common/Skeleton.vue'", '首页应导入 Skeleton')
    includes(home, "import EmptyState from '../components/common/EmptyState.vue'", '首页应导入 EmptyState')
    includes(home, 'variant="poster"', '正在追剧/最近观看应用海报骨架')
    includes(home, 'tone="danger"', '错误态应使用 danger')
    excludes(home, '加载统计数据...', '不应再保留旧的 spinner 文字')
  })

  it('LibraryStates 用 Skeleton 与 EmptyState 替代原占位', () => {
    includes(lib, 'Skeleton', '应使用骨架')
    includes(lib, 'EmptyState', '应使用空态组件')
    includes(lib, 'library-clear-search', '空态可触发"清除搜索"事件')
  })
})

describe('ErrorToast 升级：tone + retry + Teleport', () => {
  const src = read('src/components/common/ErrorToast.vue')
  const store = read('src/stores/app.ts')

  it('支持 tone(error/warning/info/success)、可选 retry 与 Teleport', () => {
    includes(src, "tone?: Tone", '应支持 tone')
    includes(src, 'onRetry', '应支持 retry 回调')
    includes(src, '<Teleport to="body">', '应 Teleport 到 body')
  })

  it('app store 暴露 errorTone / errorRetry，并扩展 setError 选项', () => {
    includes(store, 'errorTone', 'store 应有 errorTone')
    includes(store, 'errorRetry', 'store 应有 errorRetry')
    includes(store, 'ErrorOptions', '应导出 ErrorOptions 类型')
  })
})
