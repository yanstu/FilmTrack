/**
 * Pinia插件配置
 */
import type { App } from 'vue';
import { createPinia } from 'pinia';

// 创建Pinia实例
const pinia = createPinia();

/**
 * 注册Pinia插件
 * @param app Vue应用实例
 */
export function registerPinia(app: App): void {
  app.use(pinia);
}

/**
 * 获取Pinia实例
 * 在插件系统外部使用
 */
export function getPinia() {
  return pinia;
} 