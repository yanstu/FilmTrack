/**
 * Naive UI插件配置
 */
import type { App } from 'vue';
import {
  create,
  createDiscreteApi
} from 'naive-ui';

// 创建Naive UI实例
const naive = create({
  components: []
});

/**
 * 注册Naive UI插件
 * @param app Vue应用实例
 */
export function registerNaiveUI(app: App): void {
  app.use(naive);
}

/**
 * 创建离散API
 * 不需要注册为插件，可以直接在组件中使用
 */
export function useDiscreteApi() {
  return createDiscreteApi(['message', 'notification', 'dialog', 'loadingBar']);
} 