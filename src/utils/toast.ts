import { ref } from 'vue';

/**
 * 全局 Toast 服务（单例）
 *
 * 用法：
 * ```ts
 * import { toast } from '@/utils/toast'
 * toast.success('已保存')
 * toast.info('已复制到剪贴板')
 * toast.warning('网络较慢')
 * toast.error('保存失败', { duration: 6000 })
 * ```
 *
 * 在 `App.vue` 挂载 `<ToastStack />` 后会自动渲染。
 */
export type ToastTone = 'success' | 'info' | 'warning' | 'error';

export interface ToastOptions {
  /** 提示色调（决定图标与配色），默认根据方法名 */
  tone?: ToastTone;
  /** 自定义标题；不传时根据 tone 选默认中文 */
  title?: string;
  /** 自动关闭毫秒；0 = 不自动关闭 */
  duration?: number;
  /** 次要提示文字（小灰字） */
  hint?: string;
}

export interface ToastItem extends Required<Omit<ToastOptions, 'hint'>> {
  id: number;
  message: string;
  hint?: string;
}

const DEFAULT_DURATIONS: Record<ToastTone, number> = {
  success: 2400,
  info: 2800,
  warning: 4000,
  error: 5000,
};

const DEFAULT_TITLES: Record<ToastTone, string> = {
  success: '已完成',
  info: '提示',
  warning: '注意',
  error: '出错了',
};

const MAX_STACK = 5;

const stack = ref<ToastItem[]>([]);
let nextId = 1;

function push(tone: ToastTone, message: string, options: ToastOptions = {}): number {
  const id = nextId++;
  const item: ToastItem = {
    id,
    tone,
    message,
    title: options.title ?? DEFAULT_TITLES[tone],
    duration: options.duration ?? DEFAULT_DURATIONS[tone],
    hint: options.hint,
  };
  stack.value = [...stack.value, item];
  // 控制栈深，避免大量动作堆积
  if (stack.value.length > MAX_STACK) {
    stack.value = stack.value.slice(stack.value.length - MAX_STACK);
  }
  return id;
}

function dismiss(id: number) {
  stack.value = stack.value.filter((t) => t.id !== id);
}

function clearAll() {
  stack.value = [];
}

export const toast = {
  success: (message: string, options: ToastOptions = {}) => push('success', message, options),
  info: (message: string, options: ToastOptions = {}) => push('info', message, options),
  warning: (message: string, options: ToastOptions = {}) => push('warning', message, options),
  error: (message: string, options: ToastOptions = {}) => push('error', message, options),
  dismiss,
  clearAll,
};

/** 供组件读取的响应式栈引用 */
export function useToastStack() {
  return { stack, dismiss };
}
