<template>
  <div class="relative h-96 overflow-hidden animate-fade-in">
    <!-- 背景图 -->
    <div class="absolute inset-0">
      <CachedImage
        v-if="backdropImages.length > 0"
        :src="getBackdropUrl(backdropImages[currentBackdropIndex])"
        :alt="movie.title"
        class-name="w-full h-full object-cover animate-scale-in"
        fallback="/placeholder-poster.svg"
      />
      <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>
    </div>

    <!-- 返回按钮 -->
    <div class="absolute top-6 left-6 z-10 animate-slide-in-left" style="animation-delay: 0.1s;">
      <button
        @click="$emit('goBack')"
        class="p-2 bg-black/50 backdrop-blur-sm text-white rounded-full hover:bg-black/70 transition-all duration-200 hover:scale-110"
      >
        <ArrowLeftIcon class="w-6 h-6" />
      </button>
    </div>

    <!-- 主要信息 -->
    <div class="absolute bottom-0 left-0 right-0 p-6 text-white">
      <div class="flex items-end space-x-6">
        <!-- 海报 -->
        <div class="flex-shrink-0 cursor-pointer animate-slide-in-left" style="animation-delay: 0.2s;" @click="$emit('showPosterPreview')">
          <CachedImage
            :src="getImageUrl(movie?.poster_path)"
            :alt="movie?.title"
            class-name="w-48 h-72 object-cover rounded-lg shadow-xl hover:opacity-90 transition-all duration-300 hover:scale-105"
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
          <div class="animate-fade-in-up" style="animation-delay: 0.15s;">
            <RatingComparison :movie="movie" />
          </div>

          <!-- 播放源显示 -->
          <div v-if="movie.watch_source" class="animate-fade-in-up" style="animation-delay: 0.2s;">
            <WatchSource
              :watch-source="movie.watch_source"
              :is-valid-url="isValidUrl"
              @open-link="$emit('openExternalLink', $event)"
            />
          </div>
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

<style scoped>
/* 淡入动画 */
@keyframes fade-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

/* 缩放淡入动画 */
@keyframes scale-in {
  from {
    opacity: 0;
    transform: scale(1.05);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

/* 左侧滑入动画 */
@keyframes slide-in-left {
  from {
    opacity: 0;
    transform: translateX(-20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

/* 上滑淡入动画 */
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

.animate-fade-in {
  animation: fade-in 0.4s ease-out forwards;
}

.animate-scale-in {
  animation: scale-in 0.6s ease-out forwards;
}

.animate-slide-in-left {
  animation: slide-in-left 0.4s ease-out forwards;
  opacity: 0;
}

.animate-fade-in-up {
  animation: fade-in-up 0.4s ease-out forwards;
  opacity: 0;
}
</style>
