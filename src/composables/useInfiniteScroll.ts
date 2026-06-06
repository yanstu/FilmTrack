/**
 * 无限滚动组合式函数
 * 提供无限滚动功能，替代传统分页
 */

import { ref, computed, onMounted, onUnmounted, nextTick, type Ref } from 'vue';

/**
 * 无限滚动配置选项
 */
export interface InfiniteScrollOptions {
  /** 每页加载的数据量 */
  pageSize?: number;
  /** 触发加载的距离底部的距离（像素） */
  threshold?: number;
  /** 是否立即加载第一页 */
  immediate?: boolean;
  /** 滚动容器的选择器，默认为 window */
  container?: string | HTMLElement;
  /** 防抖延迟（毫秒） */
  debounce?: number;
}

/**
 * 加载函数类型
 */
export type LoadFunction<T> = (page: number, pageSize: number) => Promise<{
  data: T[];
  hasMore: boolean;
  total?: number;
}>;

/**
 * 默认配置
 */
const defaultOptions: Required<Omit<InfiniteScrollOptions, 'container'>> = {
  pageSize: 20,
  threshold: 200,
  immediate: true,
  debounce: 100
};

/**
 * 无限滚动组合式函数
 */
export function useInfiniteScroll<T>(
  loadFunction: LoadFunction<T>,
  options: InfiniteScrollOptions = {}
) {
  const config = { ...defaultOptions, ...options };
  
  // 响应式状态
  const items: Ref<T[]> = ref([]);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const hasMore = ref(true);
  const currentPage = ref(0);
  const total = ref<number | undefined>(undefined);
  
  // 计算属性
  const isEmpty = computed(() => items.value.length === 0 && !loading.value);
  const canLoadMore = computed(() => hasMore.value && !loading.value && !error.value);
  
  // 滚动容器引用
  let scrollContainer: HTMLElement | Window = window;
  let isDestroyed = false;
  
  // 防抖定时器
  let debounceTimer: number | null = null;
  
  /**
   * 获取滚动容器
   */
  const getScrollContainer = (): HTMLElement | Window => {
    if (!config.container) return window;
    
    if (typeof config.container === 'string') {
      const element = document.querySelector(config.container) as HTMLElement;
      return element || window;
    }
    
    return config.container;
  };
  
  /**
   * 检查是否需要加载更多数据
   */
  const checkShouldLoad = (): boolean => {
    if (!canLoadMore.value) return false;

    try {
      if (scrollContainer === window) {
        const scrollY = window.pageYOffset || document.documentElement.scrollTop;
        const innerHeight = window.innerHeight;
        const scrollHeight = Math.max(
          document.body.scrollHeight,
          document.documentElement.scrollHeight
        );

        const distanceFromBottom = scrollHeight - (scrollY + innerHeight);
        return distanceFromBottom <= config.threshold;
      } else {
        const element = scrollContainer as HTMLElement;
        if (!element) return false;

        const { scrollTop, clientHeight, scrollHeight } = element;
        const distanceFromBottom = scrollHeight - (scrollTop + clientHeight);
        return distanceFromBottom <= config.threshold;
      }
    } catch (error) {
      console.warn('检查滚动位置时出错:', error);
      return false;
    }
  };
  
  /**
   * 滚动事件处理器
   */
  const handleScroll = () => {
    if (isDestroyed) return;
    
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    
    debounceTimer = window.setTimeout(() => {
      if (checkShouldLoad()) {
        loadMore();
      }
    }, config.debounce);
  };
  
  /**
   * 加载更多数据
   */
  const loadMore = async () => {
    if (!canLoadMore.value) return;
    
    loading.value = true;
    error.value = null;
    
    try {
      const nextPage = currentPage.value + 1;
      const result = await loadFunction(nextPage, config.pageSize);
      
      // 检查组件是否已销毁
      if (isDestroyed) return;
      
      items.value = [...items.value, ...result.data];
      hasMore.value = result.hasMore;
      currentPage.value = nextPage;
      
      if (result.total !== undefined) {
        total.value = result.total;
      }
      
      // 如果没有更多数据，移除滚动监听
      if (!result.hasMore) {
        removeScrollListener();
      }
      
    } catch (err) {
      console.error('加载数据失败:', err);
      error.value = err instanceof Error ? err.message : '加载失败';
    } finally {
      loading.value = false;
    }
  };
  
  /**
   * 重置状态
   */
  const reset = () => {
    items.value = [];
    currentPage.value = 0;
    hasMore.value = true;
    error.value = null;
    total.value = undefined;
    
    // 重新添加滚动监听
    addScrollListener();
    
    // 如果配置了立即加载，则加载第一页
    if (config.immediate) {
      nextTick(() => loadMore());
    }
  };
  
  /**
   * 刷新数据（重新加载第一页）
   */
  const refresh = async () => {
    removeScrollListener();
    reset();
  };
  
  /**
   * 添加滚动监听
   */
  const addScrollListener = () => {
    removeScrollListener(); // 先移除旧的监听器
    scrollContainer = getScrollContainer();

    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', handleScroll, { passive: true });

      // 立即检查一次是否需要加载
      nextTick(() => {
        if (checkShouldLoad()) {
          loadMore();
        }
      });
    }
  };
  
  /**
   * 移除滚动监听
   */
  const removeScrollListener = () => {
    if (scrollContainer) {
      scrollContainer.removeEventListener('scroll', handleScroll);
    }
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
  };
  
  /**
   * 手动触发加载更多
   */
  const triggerLoad = () => {
    if (canLoadMore.value) {
      loadMore();
    }
  };
  
  /**
   * 添加单个项目到列表
   */
  const addItem = (item: T, position: 'start' | 'end' = 'end') => {
    if (position === 'start') {
      items.value = [item, ...items.value];
    } else {
      items.value = [...items.value, item];
    }
  };
  
  /**
   * 移除指定项目
   */
  const removeItem = (predicate: (item: T, index: number) => boolean) => {
    const index = items.value.findIndex(predicate);
    if (index > -1) {
      items.value = items.value.filter((_, i) => i !== index);
    }
  };
  
  /**
   * 更新指定项目
   */
  const updateItem = (predicate: (item: T, index: number) => boolean, updater: (item: T) => T) => {
    const index = items.value.findIndex(predicate);
    if (index > -1) {
      const newItems = [...items.value];
      newItems[index] = updater(newItems[index]);
      items.value = newItems;
    }
  };
  
  // 生命周期
  onMounted(() => {
    addScrollListener();
    
    if (config.immediate) {
      nextTick(() => loadMore());
    }
  });
  
  onUnmounted(() => {
    isDestroyed = true;
    removeScrollListener();
  });
  
  return {
    // 状态
    items: computed(() => items.value),
    loading: computed(() => loading.value),
    error: computed(() => error.value),
    hasMore: computed(() => hasMore.value),
    currentPage: computed(() => currentPage.value),
    total: computed(() => total.value),
    
    // 计算属性
    isEmpty,
    canLoadMore,
    
    // 方法
    loadMore,
    reset,
    refresh,
    triggerLoad,
    addItem,
    removeItem,
    updateItem
  };
}

