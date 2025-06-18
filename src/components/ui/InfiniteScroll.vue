<template>
  <div class="infinite-scroll-container">
    <!-- 主要内容插槽 -->
    <slot></slot>

    <!-- 加载更多指示器 -->
    <div 
      v-if="loading && items.length > 0" 
      class="flex items-center justify-center py-8"
    >
      <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
      <span class="ml-3 text-gray-600">{{ loadingText }}</span>
    </div>

    <!-- 到底了提示 -->
    <div 
      v-else-if="!hasMore && items.length > 0" 
      class="text-center py-8"
    >
      <p class="text-gray-500">{{ endText }}</p>
    </div>

    <!-- 错误状态 -->
    <div 
      v-if="error" 
      class="text-center py-8"
    >
      <p class="text-red-600 mb-4">{{ error }}</p>
      <button 
        @click="$emit('retry')"
        class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        {{ retryText }}
      </button>
    </div>

    <!-- 手动加载更多按钮 -->
    <div 
      v-if="showLoadMoreButton && hasMore && !loading" 
      class="text-center py-8"
    >
      <button 
        @click="$emit('loadMore')"
        class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        {{ loadMoreText }}
      </button>
    </div>

    <!-- 空状态 -->
    <div 
      v-if="isEmpty" 
      class="text-center py-16"
    >
      <slot name="empty">
        <div class="text-gray-500">
          <component 
            v-if="emptyIcon" 
            :is="emptyIcon" 
            :size="48" 
            class="mx-auto mb-4 text-gray-400" 
          />
          <p class="text-lg">{{ emptyText }}</p>
          <p v-if="emptySubtext" class="text-sm mt-2">{{ emptySubtext }}</p>
        </div>
      </slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  items: any[];
  loading?: boolean;
  hasMore?: boolean;
  error?: string | null;
  showLoadMoreButton?: boolean;
  loadingText?: string;
  endText?: string;
  retryText?: string;
  loadMoreText?: string;
  emptyText?: string;
  emptySubtext?: string;
  emptyIcon?: any;
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  hasMore: true,
  error: null,
  showLoadMoreButton: false,
  loadingText: '加载更多...',
  endText: '已显示全部结果',
  retryText: '重试',
  loadMoreText: '加载更多',
  emptyText: '暂无数据',
  emptySubtext: '',
  emptyIcon: null
});

const emit = defineEmits<{
  retry: [];
  loadMore: [];
}>();

const isEmpty = computed(() => {
  return props.items.length === 0 && !props.loading;
});
</script>

<style scoped>
.infinite-scroll-container {
  @apply w-full;
}
</style> 