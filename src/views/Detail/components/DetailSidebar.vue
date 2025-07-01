<template>
  <div class="space-y-6">
    <!-- 操作按钮 -->
    <div class="animate-slide-in-right" style="animation-delay: 0.1s;">
      <ActionButtons
        :movie="movie"
        @edit-record="$emit('editRecord')"
        @mark-episode-watched="$emit('markEpisodeWatched')"
        @update-movie-info="$emit('updateMovieInfo')"
      />
    </div>

    <!-- 详细信息 -->
    <div class="animate-slide-in-right" style="animation-delay: 0.15s;">
      <MovieDetails
        :movie="movie"
        :format-date="formatDate"
      />
    </div>

    <!-- 删除记录 -->
    <div class="animate-slide-in-right" style="animation-delay: 0.2s;">
      <DeleteSection @delete-record="$emit('deleteRecord')" />
    </div>
  </div>
</template>

<script setup lang="ts">
import ActionButtons from './ActionButtons.vue';
import MovieDetails from './MovieDetails.vue';
import DeleteSection from './DeleteSection.vue';
import type { Movie } from '../../../types';

interface Props {
  movie: Movie;
  formatDate: (dateString: string) => string;
}

interface Emits {
  (e: 'editRecord'): void;
  (e: 'markEpisodeWatched'): void;
  (e: 'updateMovieInfo'): void;
  (e: 'deleteRecord'): void;
}

defineProps<Props>();
defineEmits<Emits>();
</script>

<style scoped>
/* 右侧滑入动画 */
@keyframes slide-in-right {
  from {
    opacity: 0;
    transform: translateX(20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.animate-slide-in-right {
  animation: slide-in-right 0.4s ease-out forwards;
  opacity: 0;
}
</style>
