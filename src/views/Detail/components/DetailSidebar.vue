<template>
  <div class="space-y-6">
    <!-- 操作按钮 -->
    <ActionButtons
      :movie="movie"
      @edit-record="$emit('editRecord')"
      @mark-episode-watched="$emit('markEpisodeWatched')"
      @update-movie-info="$emit('updateMovieInfo')"
    />

    <!-- 详细信息 -->
    <MovieDetails
      :movie="movie"
      :format-date="formatDate"
    />

    <!-- 删除记录 -->
    <DeleteSection @delete-record="$emit('deleteRecord')" />
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
