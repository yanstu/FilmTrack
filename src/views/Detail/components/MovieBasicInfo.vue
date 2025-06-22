<template>
  <div class="mb-4">
    <h1 
      class="text-4xl font-bold mb-2 cursor-pointer hover:text-blue-200 transition-colors max-w-fit" 
      @click="$emit('copyTitle', movie.title)" 
      title="点击复制标题"
    >
      {{ movie.title }}
    </h1>
    <p 
      v-if="movie.original_title && movie.original_title !== movie.title" 
      class="text-xl text-gray-300 cursor-pointer hover:text-blue-200 transition-colors max-w-fit"
      @click="$emit('copyTitle', movie.original_title)"
      title="点击复制原标题"
    >
      {{ movie.original_title }}
    </p>
  </div>

  <div class="flex items-center space-x-6 mb-4">
    <span class="text-lg">{{ movie.year }}</span>
    <span class="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-sm">
      {{ getTypeLabel(movie.type) }}
    </span>
    <span 
      v-if="movie.status" 
      :class="[
        'px-3 py-1 rounded-full text-sm font-medium',
        getStatusBadgeClass(movie.status)
      ]"
    >
      {{ getStatusLabel(movie.status) }}
    </span>
    <span 
      v-if="movie.air_status" 
      class="px-3 py-1 bg-blue-500/80 text-white rounded-full text-sm"
    >
      {{ getAirStatusLabel(movie.air_status) }}
    </span>
  </div>
</template>

<script setup lang="ts">
import { getTypeLabel, getStatusLabel, getStatusBadgeClass, getAirStatusLabel } from '../../../utils/constants';
import type { Movie } from '../../../types';

interface Props {
  movie: Movie;
}

interface Emits {
  (e: 'copyTitle', title: string): void;
}

defineProps<Props>();
defineEmits<Emits>();
</script>
