import { onBeforeUnmount, ref, watch } from 'vue';
import type { Ref } from 'vue';

/**
 * 数字增长动画（桌面应用「打开页面 → 结算感」）
 *
 * - 输入 `target`（响应式数字），输出 `value`（动画显示数字）
 * - 默认 800ms ease-out cubic
 * - 自动尊重 `prefers-reduced-motion`：直接跳到终值
 * - 目标变化时平滑过渡到新值
 * - 组件卸载自动 cancel
 *
 * @example
 * ```ts
 * const total = computed(() => statistics.value.total_movies);
 * const animatedTotal = useCountUp(total);
 * // 模板里：{{ animatedTotal }}
 * ```
 */
export interface UseCountUpOptions {
  /** 动画时长（毫秒），默认 800ms */
  duration?: number;
  /** 进入延迟（毫秒），用于多卡片错峰（如 50ms × index） */
  delay?: number;
  /** 保留小数位（如评分 0.0 用 1），默认 0 */
  decimals?: number;
  /** 强制立即跳到终值（用于首次加载、reduced-motion） */
  immediate?: boolean;
}

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

const prefersReducedMotion = (): boolean => {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
};

const round = (value: number, decimals: number) => {
  if (decimals <= 0) return Math.round(value);
  const m = Math.pow(10, decimals);
  return Math.round(value * m) / m;
};

export function useCountUp(
  target: Ref<number>,
  options: UseCountUpOptions = {}
): Ref<number> {
  const { duration = 800, delay = 0, decimals = 0 } = options;
  const value = ref<number>(0);

  let rafId: number | null = null;
  let delayTimer: ReturnType<typeof setTimeout> | null = null;
  let startTime = 0;
  let fromValue = 0;
  let toValue = 0;

  const clear = () => {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    if (delayTimer !== null) {
      clearTimeout(delayTimer);
      delayTimer = null;
    }
  };

  const step = (now: number) => {
    const elapsed = now - startTime;
    if (elapsed >= duration) {
      value.value = round(toValue, decimals);
      rafId = null;
      return;
    }
    const t = easeOutCubic(elapsed / duration);
    value.value = round(fromValue + (toValue - fromValue) * t, decimals);
    rafId = requestAnimationFrame(step);
  };

  const animateTo = (to: number) => {
    clear();
    if (prefersReducedMotion() || options.immediate) {
      value.value = round(to, decimals);
      return;
    }
    fromValue = value.value;
    toValue = to;
    if (fromValue === toValue) {
      value.value = round(toValue, decimals);
      return;
    }
    const begin = () => {
      startTime = performance.now();
      rafId = requestAnimationFrame(step);
    };
    if (delay > 0) {
      delayTimer = setTimeout(begin, delay);
    } else {
      begin();
    }
  };

  watch(
    target,
    (next) => {
      const safeNext = Number.isFinite(next) ? next : 0;
      animateTo(safeNext);
    },
    { immediate: true }
  );

  onBeforeUnmount(() => clear());

  return value;
}
