<template>
  <div>
    <!-- 加载状态：首次加载用骨架占位（更像桌面应用） -->
    <div
      v-if="loading && itemCount === 0"
      class="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(160px,1fr))] mt-2"
    >
      <div v-for="i in 10" :key="`lib-sk-${i}`" class="space-y-2">
        <Skeleton variant="poster" />
        <Skeleton variant="line" width="80%" />
        <Skeleton variant="line" width="50%" />
      </div>
    </div>

    <!-- 空状态：区分"无任何内容"与"搜索无结果" -->
    <EmptyState
      v-else-if="isEmpty && !error"
      :tone="searchQuery ? 'warning' : 'info'"
      :icon="searchQuery ? SearchIcon : FilmIcon"
      :title="emptyMessage"
      :description="emptySubMessage"
      :action-label="actionLabel"
      :action-icon="actionIcon"
      :hint="hint"
      @action="handleAction"
    />

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
    <EmptyState
      v-if="error"
      tone="danger"
      title="影视库没能加载出来"
      :description="error"
      action-label="重试"
      :action-icon="RefreshCcwIcon"
      @action="$emit('retry')"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import {
  Film as FilmIcon,
  Plus as PlusIcon,
  RefreshCcw as RefreshCcwIcon,
  Search as SearchIcon,
  X as XIcon,
} from 'lucide-vue-next';
import Skeleton from '../../../components/common/Skeleton.vue';
import EmptyState from '../../../components/common/EmptyState.vue';
import type { LibraryStatesProps, LibraryStatesEmits } from '../types';

type Props = LibraryStatesProps;
type Emits = LibraryStatesEmits;

const props = defineProps<Props>();
defineEmits<Emits>();

const router = useRouter();

const emptyMessage = computed(() =>
  props.searchQuery ? '没找到相关作品' : '影视库还是空的'
);

const emptySubMessage = computed(() =>
  props.searchQuery
    ? '换个关键词试试，影迹支持拼音首字母搜索。'
    : '从添加第一部作品开始，慢慢就有了自己的片单。'
);

const actionLabel = computed(() => (props.searchQuery ? '清除搜索' : '去添加'));
const actionIcon = computed(() => (props.searchQuery ? XIcon : PlusIcon));
const hint = computed(() =>
  props.searchQuery ? undefined : '也可以从豆瓣一键导入历史观影记录'
);

const handleAction = () => {
  if (props.searchQuery) {
    window.dispatchEvent(new CustomEvent('library-clear-search'));
  } else {
    router.push('/record');
  }
};
</script>
