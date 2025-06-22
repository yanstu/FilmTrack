<template>
  <div class="card p-6">
    <h3 class="text-lg font-semibold text-gray-900 mb-4">操作</h3>
    <div class="space-y-3">
      <button 
        @click="$emit('editRecord')"
        class="w-full flex items-center justify-center px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors duration-200 font-medium"
      >
        编辑记录
      </button>

      <button 
        v-if="movie.type === 'tv' && movie.status !== 'completed'" 
        @click="$emit('markEpisodeWatched')"
        class="w-full flex items-center justify-center px-4 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors duration-200 font-medium"
      >
        这集已看
      </button>

      <button 
        @click="$emit('updateMovieInfo')"
        class="w-full flex items-center justify-center px-4 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors duration-200 font-medium"
      >
        刷新影视信息
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Movie } from '../../../types';

interface Props {
  movie: Movie;
}

interface Emits {
  (e: 'editRecord'): void;
  (e: 'markEpisodeWatched'): void;
  (e: 'updateMovieInfo'): void;
}

defineProps<Props>();
defineEmits<Emits>();
</script>
