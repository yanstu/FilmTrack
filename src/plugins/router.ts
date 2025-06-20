/**
 * Router插件配置
 */
import type { App } from 'vue';
import router from '../router';

/**
 * 注册Router插件
 * @param app Vue应用实例
 */
export function registerRouter(app: App): void {
  app.use(router);
}

/**
 * 获取Router实例
 * 在插件系统外部使用
 */
export function getRouter() {
  return router;
} 