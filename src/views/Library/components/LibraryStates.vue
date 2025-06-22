<template>
  <div>
    <!-- 加载状态 -->
    <div 
      v-if="loading && itemCount === 0"
      class="flex items-center justify-center h-64"
    >
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>

    <!-- 空状态 -->
    <div v-else-if="isEmpty" class="text-center py-16">
      <SearchIcon :size="48" class="mx-auto text-gray-400 mb-4" />
      <p class="text-gray-600 text-lg">{{ emptyMessage }}</p>
      <p class="text-gray-500 text-sm mt-2">{{ emptySubMessage }}</p>
    </div>

    <!-- 加载更多指示器 -->
    <div 
      v-if="loading && itemCount > 0"
      class="flex items-center justify-center py-8"
    >
      <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
      <span class="ml-3 text-gray-600">加载更多...</span>
    </div>

    <!-- 到底了 -->
    <div 
      v-else-if="!hasMore && itemCount > 0"
      class="text-center py-8"
    >
      <p class="text-gray-500">已显示全部结果</p>
    </div>

    <!-- 错误状态 -->
    <div v-if="error" class="text-center py-8">
      <p class="text-red-600 mb-4">{{ error }}</p>
      <button
        @click="$emit('retry')"
        class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        重试
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Search as SearchIcon } from 'lucide-vue-next';

interface Props {
  loading: boolean;
  isEmpty: boolean;
  hasMore: boolean;
  itemCount: number;
  error?: string;
  searchQuery?: string;
}

interface Emits {
  (e: 'retry'): void;
}

const props = defineProps<Props>();
defineEmits<Emits>();

const emptyMessage = computed(() => {
  return props.searchQuery ? '未找到相关影视作品' : '您的影视库是空的';
});

const emptySubMessage = computed(() => {
  return props.searchQuery 
    ? '尝试使用不同的关键词或拼音首字母搜索' 
    : '开始添加您的第一部影视作品';
});
</script>
