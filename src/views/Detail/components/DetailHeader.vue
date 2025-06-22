<template>
  <div class="relative h-96 overflow-hidden">
    <!-- 背景图 -->
    <div class="absolute inset-0">
      <CachedImage 
        v-if="backdropImages.length > 0"
        :src="getBackdropUrl(backdropImages[currentBackdropIndex])"
        :alt="movie.title"
        class-name="w-full h-full object-cover" 
        fallback="/placeholder-poster.svg" 
      />
      <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>
    </div>

    <!-- 返回按钮 -->
    <div class="absolute top-6 left-6 z-10">
      <button 
        @click="$emit('goBack')"
        class="p-2 bg-black/50 backdrop-blur-sm text-white rounded-full hover:bg-black/70 transition-colors duration-200"
      >
        <ArrowLeftIcon class="w-6 h-6" />
      </button>
    </div>

    <!-- 主要信息 -->
    <div class="absolute bottom-0 left-0 right-0 p-6 text-white">
      <div class="flex items-end space-x-6">
        <!-- 海报 -->
        <div class="flex-shrink-0 cursor-pointer" @click="$emit('showPosterPreview')">
          <CachedImage
            :src="getImageUrl(movie?.poster_path)"
            :alt="movie?.title"
            class-name="w-48 h-72 object-cover rounded-lg shadow-xl hover:opacity-90 transition-opacity"
            fallback="/placeholder-poster.svg" 
          />
        </div>

        <!-- 基本信息 -->
        <div class="flex-1 pb-4">
          <MovieBasicInfo
            :movie="movie"
            @copy-title="$emit('copyTitle', $event)"
          />

          <!-- 评分对比 -->
          <RatingComparison :movie="movie" />

          <!-- 播放源显示 -->
          <WatchSource 
            v-if="movie.watch_source"
            :watch-source="movie.watch_source"
            :is-valid-url="isValidUrl"
            @open-link="$emit('openExternalLink', $event)"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ArrowLeft as ArrowLeftIcon } from 'lucide-vue-next';
import CachedImage from '../../../components/ui/CachedImage.vue';
import MovieBasicInfo from './MovieBasicInfo.vue';
import RatingComparison from './RatingComparison.vue';
import WatchSource from './WatchSource.vue';
import type { Movie } from '../../../types';

interface Props {
  movie: Movie;
  backdropImages: string[];
  currentBackdropIndex: number;
  getImageUrl: (path: string | undefined) => string;
  getBackdropUrl: (path: string | undefined) => string;
  isValidUrl: (string: string) => boolean;
}

interface Emits {
  (e: 'goBack'): void;
  (e: 'showPosterPreview'): void;
  (e: 'copyTitle', title: string): void;
  (e: 'openExternalLink', url: string): void;
}

defineProps<Props>();
defineEmits<Emits>();
</script>
