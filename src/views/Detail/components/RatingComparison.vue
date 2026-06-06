<template>
  <div class="flex items-center space-x-8">
    <!-- TMDb 评分 -->
    <div v-if="movie.tmdb_rating" class="flex items-center">
      <span class="text-sm text-gray-300 mr-2">TMDb</span>
      <div class="flex text-yellow-400 mr-2">
        <StarIcon 
          v-for="i in 5" 
          :key="i" 
          :class="[
            'w-4 h-4',
            movie.tmdb_rating >= i * 2 ? 'fill-current' : 'text-gray-500'
          ]" 
          fill="currentColor" 
        />
      </div>
      <span class="text-lg font-semibold">{{ movie.tmdb_rating.toFixed(1) }}</span>
    </div>

    <!-- 个人评分 -->
    <div v-if="movie.personal_rating" class="flex items-center">
      <span class="text-sm text-gray-300 mr-2">个人</span>
      <div class="flex text-yellow-400 mr-2">
        <StarIcon 
          v-for="i in 5" 
          :key="i" 
          :class="[
            'w-4 h-4',
            movie.personal_rating >= i ? 'fill-current' :
              movie.personal_rating >= i - 0.5 ? 'fill-current opacity-50' : 'text-gray-500'
          ]" 
          fill="currentColor" 
        />
      </div>
      <span class="text-lg font-semibold">{{ formatRating(movie.personal_rating) }}/5.0</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Star as StarIcon } from 'lucide-vue-next';
import { formatRating } from '../../../utils/constants';
import type { Movie } from '../../../types';

import type { BaseDetailProps } from '../types';

type Props = BaseDetailProps;

defineProps<Props>();
</script>
