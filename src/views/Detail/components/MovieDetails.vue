<template>
  <div class="card p-6">
    <h3 class="text-lg font-semibold text-gray-900 mb-4">详细信息</h3>
    <div class="space-y-3 text-sm">
      <div class="flex justify-between">
        <span class="text-gray-600">添加日期</span>
        <span class="font-medium">{{ formatDate(movie.created_at) }}</span>
      </div>
      <div v-if="movie.total_seasons" class="flex justify-between">
        <span class="text-gray-600">总季数</span>
        <span class="font-medium">{{ movie.total_seasons }}</span>
      </div>
      <div v-if="movie.runtime" class="flex justify-between">
        <span class="text-gray-600">时长</span>
        <span class="font-medium">{{ movie.runtime }} 分钟</span>
      </div>

      <div class="flex justify-between">
        <span class="text-gray-600">TMDb ID</span>
        <a 
          :href="`https://www.themoviedb.org/${movie.type}/${movie.tmdb_id}`" 
          target="_blank"
          class="font-medium text-blue-600 hover:text-blue-800"
        >
          {{ movie.tmdb_id }}
        </a>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Movie } from '../../../types';

import type { DetailPropsWithFormat } from '../types';

type Props = DetailPropsWithFormat;

defineProps<Props>();
</script>
