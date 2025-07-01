<template>
  <div class="mb-4 animate-fade-in-up" style="animation-delay: 0.05s;">
    <h1
      class="text-4xl font-bold mb-2 cursor-pointer hover:text-blue-200 transition-all duration-200 max-w-fit movie-title-shadow"
      @click="$emit('copyTitle', movie.title)"
      title="点击复制标题"
    >
      {{ movie.title }}
    </h1>
    <p
      v-if="movie.original_title && movie.original_title !== movie.title"
      class="text-xl text-gray-300 cursor-pointer hover:text-blue-200 transition-all duration-200 max-w-fit movie-subtitle-shadow"
      @click="$emit('copyTitle', movie.original_title)"
      title="点击复制原标题"
    >
      {{ movie.original_title }}
    </p>
  </div>

  <div class="flex items-center space-x-6 mb-4 animate-fade-in-up" style="animation-delay: 0.1s;">
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

<style scoped>
/* 标题阴影效果 */
.movie-title-shadow {
  text-shadow:
    0 1px 3px rgba(0, 0, 0, 0.8),
    0 2px 6px rgba(0, 0, 0, 0.6);
}

.movie-subtitle-shadow {
  text-shadow:
    0 1px 2px rgba(0, 0, 0, 0.7),
    0 2px 4px rgba(0, 0, 0, 0.5);
}

/* 淡入上滑动画 */
@keyframes fade-in-up {
  from {
    opacity: 0;
    transform: translateY(15px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-fade-in-up {
  animation: fade-in-up 0.4s ease-out forwards;
  opacity: 0;
}

/* 悬停缩放效果 */
.hover\:scale-105:hover {
  transform: scale(1.05);
}
</style>