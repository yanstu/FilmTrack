<template>
  <div class="mt-4">
    <!-- 结果计数 + 回车提示 -->
    <div class="mb-2 flex items-center justify-between px-1">
      <span class="text-xs font-medium text-gray-500">找到 {{ results.length }} 个结果</span>
      <span class="hidden items-center gap-1 text-xs text-gray-400 sm:inline-flex">
        <kbd class="rounded border border-gray-200 bg-gray-50 px-1.5 py-0.5 font-sans text-[11px] leading-none text-gray-500">Enter</kbd>
        选择第一个
      </span>
    </div>

    <div class="space-y-2">
      <div
        v-for="(result, index) in results"
        :key="result.id"
        @click="$emit('resultClick', result)"
        :class="[
          'group flex items-center gap-4 rounded-xl border p-3 cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md',
          isAlreadyAdded(result)
            ? 'border-green-200/60 bg-green-50/60 hover:bg-green-50/90'
            : 'border-gray-100/70 bg-white/60 hover:border-blue-200 hover:bg-white',
          index === 0 && !isAlreadyAdded(result) ? 'ring-1 ring-blue-200/70' : ''
        ]"
      >
        <img
          :src="getImageUrl(result.poster_path)"
          :alt="result.title || result.name"
          class="h-24 w-16 flex-shrink-0 rounded-lg object-cover shadow-sm ring-1 ring-black/5 transition-transform duration-200 group-hover:scale-[1.04]"
        />
        <div class="min-w-0 flex-1">
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <h3 class="truncate font-semibold text-gray-900">{{ result.title || result.name }}</h3>
              <p class="mt-0.5 text-sm text-gray-600">
                {{ getYear(result.release_date || result.first_air_date) }} ·
                {{ result.media_type === 'movie' ? '电影' : '电视剧' }}
              </p>
              <div class="mt-1 flex items-center">
                <StarIcon :size="14" class="mr-1 fill-yellow-400 text-yellow-400" />
                <span class="text-sm text-gray-600">{{ result.vote_average?.toFixed(1) || 'N/A' }}</span>
              </div>
            </div>

            <!-- 右侧状态：已添加 / 首条回车提示 -->
            <div class="flex flex-shrink-0 flex-col items-end gap-1">
              <template v-if="isAlreadyAdded(result)">
                <span class="inline-flex items-center rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800">
                  <svg class="mr-1 h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                  </svg>
                  已添加
                </span>
                <span class="text-xs text-gray-500">点击查看详情</span>
              </template>
              <span
                v-else-if="index === 0"
                class="hidden items-center gap-1 text-[11px] font-medium text-blue-500 sm:inline-flex"
              >
                <kbd class="rounded border border-blue-200 bg-blue-50 px-1.5 py-0.5 font-sans leading-none">Enter</kbd>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Star as StarIcon } from 'lucide-vue-next';
import { getYear } from '../../../utils/constants';
import type { SearchResultsProps, SearchResultsEmits } from '../types';

type Props = SearchResultsProps;
type Emits = SearchResultsEmits;

defineProps<Props>();
defineEmits<Emits>();
</script>
