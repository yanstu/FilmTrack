/**
 * FilmTrack 应用入口文件
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
import { tmdbAPI } from './utils/api';

// 初始化浏览器控制
initBrowserControl();

// 执行缓存健康检查
tmdbAPI.performCacheHealthCheck();

// 初始化插件系统
initializePlugins();

// 创建应用实例
const app = createApp(App);

// 注册所有插件
registerPlugins(app);

// 挂载应用
app.mount('#app');
