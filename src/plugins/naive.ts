/**
 * Naive UI插件配置
 */
import type { App } from 'vue';
import {
  createDiscreteApi
} from 'naive-ui';

/**
 * 注册Naive UI插件
 * @param _app Vue应用实例
 */
export function registerNaiveUI(_app: App): void {
  // Naive UI 2.0+ 不需要手动注册，组件可以直接使用
  // 这里保留函数以保持兼容性
}

/**
 * 创建离散API
 * 不需要注册为插件，可以直接在组件中使用
 */
export function useDiscreteApi() {
  return createDiscreteApi(['message', 'notification', 'dialog', 'loadingBar']);
} 