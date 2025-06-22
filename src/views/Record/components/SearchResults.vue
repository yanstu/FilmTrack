<template>
  <div class="mt-4 space-y-2">
    <div
      v-for="result in results"
      :key="result.id"
      @click="$emit('resultClick', result)"
      :class="[
        'flex items-center p-4 rounded-xl border cursor-pointer transition-all duration-200 hover:shadow-md hover:scale-[1.01]',
        isAlreadyAdded(result) 
          ? 'bg-green-50/60 hover:bg-green-50/80 border-green-200/50' 
          : 'bg-white/60 hover:bg-white/80 border-gray-100/50'
      ]"
    >
      <img
        :src="getImageUrl(result.poster_path)"
        :alt="result.title || result.name"
        class="w-16 h-24 object-cover rounded-lg shadow-sm"
      />
      <div class="ml-4 flex-1">
        <div class="flex items-start justify-between">
          <div>
            <h3 class="font-semibold text-gray-900">{{ result.title || result.name }}</h3>
            <p class="text-sm text-gray-600">
              {{ getYear(result.release_date || result.first_air_date) }} · 
              {{ result.media_type === 'movie' ? '电影' : '电视剧' }}
            </p>
            <div class="flex items-center mt-1">
              <StarIcon :size="14" class="text-yellow-400 fill-yellow-400 mr-1" />
              <span class="text-sm text-gray-600">{{ result.vote_average?.toFixed(1) || 'N/A' }}</span>
            </div>
          </div>
          <!-- 已添加标识 -->
          <div v-if="isAlreadyAdded(result)" class="flex flex-col items-end">
            <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 mb-1">
              <svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
              </svg>
              已添加
            </span>
            <span class="text-xs text-gray-500">点击查看详情</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Star as StarIcon } from 'lucide-vue-next';
import { getYear } from '../../../utils/constants';
import type { TMDbMovie } from '../../../types';

interface Props {
  results: TMDbMovie[];
  getImageUrl: (path: string | null) => string;
  isAlreadyAdded: (result: TMDbMovie) => boolean;
}

interface Emits {
  (e: 'resultClick', result: TMDbMovie): void;
}

defineProps<Props>();
defineEmits<Emits>();
</script>
