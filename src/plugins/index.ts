/**
 * 插件管理系统
 * 统一管理所有第三方插件的注册和配置
 */

import type { App } from 'vue';
import { registerNaiveUI } from './naive';
import { registerPinia } from './pinia';
import { registerRouter } from './router';

/**
 * 注册所有插件
 * @param app Vue应用实例
 */
export function registerPlugins(app: App): void {
  registerPinia(app);
  registerRouter(app);
  registerNaiveUI(app);
}

/**
 * 初始化插件系统
 * 在应用启动前执行一些初始化操作
 */
export function initializePlugins(): void {
  // 在这里可以执行一些全局初始化操作
} 