/**
 * FilmTrackPro 应用入口文件
 * @author yanstu
 */

import { createApp } from 'vue';
import App from './App.vue';
import './styles/main.css';

// 导入插件系统
import { registerPlugins, initializePlugins } from './plugins';

// 导入浏览器控制工具
import { initBrowserControl } from './utils/browser';

// 导入缓存管理
import { setupImageCacheLifecycle } from './utils/imageCache';
import { performTMDbCacheHealthCheck } from './utils/tmdbCacheMaintenance';
import { APP_CONFIG } from '../config/app.config';
import { isMacOS, isWindows } from './utils/platform';
import StorageService, { StorageKey } from './utils/storage';

// 一次性迁移：把旧默认片单 fongmi 迁移到新内置「精选可用源」(jingxuan)，
// 让默认变更对老用户也即时生效（迁移后用户仍可在设置里自行切回）。
(() => {
  const MIGRATION_MARK = `${StorageKey.SETTINGS}-jingxuan-default-migrated`;
  try {
    if (localStorage.getItem(MIGRATION_MARK)) {
      return;
    }
    const saved = StorageService.get<{ videoSource?: { activeProfileId?: string } }>(StorageKey.SETTINGS);
    if (saved?.videoSource?.activeProfileId === 'fongmi') {
      saved.videoSource.activeProfileId = 'jingxuan';
      StorageService.set(StorageKey.SETTINGS, saved);
    }
    localStorage.setItem(MIGRATION_MARK, '1');
  } catch {
    // 迁移失败不影响启动
  }
})();

// 标记运行平台，供样式做 macOS / Windows 差异化适配
document.documentElement.classList.add(
  isMacOS() ? 'platform-mac' : isWindows() ? 'platform-win' : 'platform-other'
);

// 屏蔽默认右键菜单，但在输入框/文本域内保留（以支持复制粘贴）
window.addEventListener('contextmenu', (event) => {
  const target = event.target as HTMLElement | null;
  if (target && target.closest('input, textarea, [contenteditable="true"]')) {
    return;
  }
  event.preventDefault();
});

// 初始化浏览器控制
initBrowserControl();

// 执行缓存健康检查
performTMDbCacheHealthCheck(APP_CONFIG.tmdb.request.cacheTimeInHours);
setupImageCacheLifecycle();

// 初始化插件系统
initializePlugins();

// 创建应用实例
const app = createApp(App);

// 注册所有插件
registerPlugins(app);

// 挂载应用
app.mount('#app');
