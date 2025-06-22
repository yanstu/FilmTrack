<template>
  <div class="card p-6">
    <h2 class="text-xl font-semibold text-gray-900 mb-4">观看进度</h2>
    <div class="space-y-4">
      <div class="flex items-center justify-between">
        <span class="text-gray-600">当前集数</span>
        <span class="font-semibold">{{ watchProgress.current }}/{{ watchProgress.total || '?' }}</span>
      </div>
      <div class="w-full bg-gray-200 rounded-full h-3">
        <div 
          :class="[
            'h-3 rounded-full transition-all duration-300',
            getProgressColor(watchProgress.percentage)
          ]" 
          :style="{ width: `${watchProgress.percentage}%` }"
        ></div>
      </div>
      <div class="flex justify-between text-sm text-gray-500">
        <span>{{ watchProgress.percentage }}% 完成</span>
        <span v-if="movie.current_season">第 {{ movie.current_season }} 季</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Movie } from '../../../types';
import type { WatchProgress } from '../types';

interface Props {
  movie: Movie;
  watchProgress: WatchProgress;
  getProgressColor: (progress: number) => string;
}

defineProps<Props>();
</script>
