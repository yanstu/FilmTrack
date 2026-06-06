<template>
  <div class="relative h-72 sm:h-80 lg:h-96 overflow-hidden animate-fade-in">
    <!-- 背景图 + 多层渐变（提升质感、保证文字可读） -->
    <div class="absolute inset-0">
      <CachedImage
        v-if="backdropImages.length > 0"
        :src="getBackdropUrl(backdropImages[currentBackdropIndex])"
        :alt="movie.title"
        class-name="w-full h-full object-cover animate-scale-in"
      />
      <!-- 无背景图时的优雅回退底色，避免纯黑空洞 -->
      <div v-else class="absolute inset-0 bg-gradient-to-br from-slate-700 via-slate-900 to-black"></div>
      <!-- 底部加深：承托标题与信息 -->
      <div class="absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-black/5"></div>
      <!-- 左侧加深：聚焦主信息、增强左右层次 -->
      <div class="absolute inset-0 bg-gradient-to-r from-black/55 via-black/10 to-transparent"></div>
      <!-- 顶部轻压：让返回按钮更清晰 -->
      <div class="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/35 to-transparent"></div>
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
    <div class="absolute bottom-0 left-0 right-0 p-4 sm:p-6 text-white">
      <div class="flex items-end gap-4 sm:gap-6">
        <!-- 海报 -->
        <div class="flex-shrink-0 cursor-pointer animate-slide-in-left" style="animation-delay: 0.2s;" @click="$emit('showPosterPreview')">
          <CachedImage
            :src="getImageUrl(movie?.poster_path)"
            :alt="movie?.title"
            class-name="w-28 h-[10.5rem] sm:w-40 sm:h-60 lg:w-48 lg:h-72 object-cover rounded-xl shadow-2xl ring-1 ring-white/15 transition-all duration-300 hover:scale-[1.03] hover:ring-white/30"
          />
        </div>

        <!-- 基本信息 -->
        <div class="flex-1 min-w-0 pb-2 sm:pb-4">
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

import type { DetailHeaderProps, DetailHeaderEmits } from '../types';

type Props = DetailHeaderProps;
type Emits = DetailHeaderEmits;

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
