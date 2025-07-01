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
        v-if="movie.type === 'tv' && movie.status !== 'completed' && canMarkEpisodeWatched"
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
import { computed } from 'vue';
import type { Movie } from '../../../types';

interface Props {
  movie: Movie;
}

interface Emits {
  (e: 'editRecord'): void;
  (e: 'markEpisodeWatched'): void;
  (e: 'updateMovieInfo'): void;
}

const props = defineProps<Props>();
defineEmits<Emits>();

// 计算是否可以标记这集已看
const canMarkEpisodeWatched = computed(() => {
  const movie = props.movie;
  if (!movie || movie.type !== 'tv') return false;

  const currentEpisode = movie.current_episode || 0;
  const currentSeason = movie.current_season || 1;

  // 获取当前季的最大集数
  let currentSeasonMaxEpisodes = movie.total_episodes || 0;
  if (movie.seasons_data && movie.seasons_data[currentSeason.toString()]) {
    currentSeasonMaxEpisodes = movie.seasons_data[currentSeason.toString()].episode_count;
  }

  // 如果已经是当前季的最后一集，则不能继续标记
  return currentEpisode < currentSeasonMaxEpisodes;
});
</script>
