<template>
  <div class="lg:col-span-2 space-y-8">
    <!-- 简介 -->
    <div v-if="movie.overview" class="card p-6">
      <h2 class="text-xl font-semibold text-gray-900 mb-4">剧情简介</h2>
      <p class="text-gray-700 leading-relaxed">{{ movie.overview }}</p>
    </div>

    <!-- 个人笔记 -->
    <div v-if="movie.notes" class="card p-6">
      <h2 class="text-xl font-semibold text-gray-900 mb-4">个人笔记</h2>
      <div class="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-r-lg">
        <p class="text-gray-700">{{ movie.notes }}</p>
      </div>
    </div>

    <!-- 观看进度 (电视剧) -->
    <WatchProgress
      v-if="movie.type === 'tv'"
      :movie="movie"
      :watch-progress="watchProgress"
      :get-progress-color="getProgressColor"
    />
  </div>
</template>

<script setup lang="ts">
import WatchProgress from './WatchProgress.vue';
import type { Movie } from '../../../types';
import type { WatchProgress as WatchProgressType } from '../types';

interface Props {
  movie: Movie;
  watchProgress: WatchProgressType;
  getProgressColor: (progress: number) => string;
}

defineProps<Props>();
</script>
