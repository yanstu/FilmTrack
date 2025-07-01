<template>
  <div class="movie-card bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-all duration-300 group cursor-pointer">
    <!-- 海报区域 -->
    <div class="relative aspect-[2/3] overflow-hidden">
      <CachedImage
        :src="getImageURL(movie.poster_path || '')"
        :alt="movie.title"
        class-name="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        fallback="/placeholder-poster.svg"
      />
      
      <!-- 状态徽章 -->
      <div class="absolute top-2 left-2">
        <span :class="[
          'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium backdrop-blur-sm',
          getStatusBadgeClass(movie.status)
        ]">
          {{ getStatusLabel(movie.status) }}
        </span>
      </div>

      <!-- 评分徽章 -->
      <div v-if="movie.personal_rating" class="absolute top-2 right-2">
        <div class="flex items-center bg-black/70 backdrop-blur-sm text-white px-2 py-1 rounded-full text-xs">
          <svg class="w-3 h-3 text-yellow-400 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
          </svg>
          {{ movie.personal_rating }}
        </div>
      </div>

      <!-- 悬停操作层 -->
      <div class="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
        <div class="flex space-x-2">
          <button
            @click.stop="$emit('edit', movie)"
            class="p-2 bg-white/20 backdrop-blur-sm rounded-full text-white hover:bg-white/30 transition-colors duration-200"
            title="编辑"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
            </svg>
          </button>
          <button
            @click.stop="$emit('delete', movie.id)"
            class="p-2 bg-red-500/20 backdrop-blur-sm rounded-full text-white hover:bg-red-500/30 transition-colors duration-200"
            title="删除"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- 信息区域 -->
    <div class="p-4">
      <div class="mb-2">
        <h3 class="font-semibold text-gray-900 truncate text-lg leading-tight">
          {{ movie.title }}
        </h3>
        <p v-if="movie.original_title && movie.original_title !== movie.title" 
           class="text-sm text-gray-500 truncate mt-1">
          {{ movie.original_title }}
        </p>
      </div>

      <div class="flex items-center justify-between text-sm text-gray-600 mb-3">
        <span>{{ movie.year || 'N/A' }}</span>
        <span class="px-2 py-1 bg-gray-100 rounded-full text-xs">
          {{ getTypeLabel(movie.type) }}
        </span>
      </div>

      <!-- TMDb 评分 -->
      <div v-if="movie.tmdb_rating" class="flex items-center justify-between mb-2">
        <span class="text-sm text-gray-600">TMDb</span>
        <div class="flex items-center">
          <div class="flex text-yellow-400 mr-1">
            <svg v-for="i in 5" :key="i" :class="[
              'w-3 h-3',
              movie.tmdb_rating >= i * 2 ? 'fill-current' : 'text-gray-300'
            ]" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
            </svg>
          </div>
          <span class="text-sm font-medium text-gray-700">{{ movie.tmdb_rating.toFixed(1) }}</span>
        </div>
      </div>

      <!-- 观看进度 (仅电视剧) -->
      <div v-if="movie.type === 'tv' && (movie.current_episode || movie.total_episodes)" class="mb-2">
        <div class="flex items-center justify-between text-xs text-gray-600 mb-1">
          <span>观看进度</span>
          <span>{{ getTotalWatchedEpisodes() }}/{{ movie.total_episodes || '?' }}</span>
        </div>
        <div class="w-full bg-gray-200 rounded-full h-1.5">
          <div
            class="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
            :style="{ width: `${getWatchProgress()}%` }"
          ></div>
        </div>
      </div>

      <!-- 最后更新时间 -->
      <div class="text-xs text-gray-400 mt-2">
        {{ formatDate(movie.date_updated) }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { tmdbAPI } from '../../utils/api';
import { APP_CONFIG } from '../../../config/app.config';
import type { ParsedMovie } from '../../types';
import { getStatusLabel, formatRating, getTypeLabel, getStatusBadgeClass } from '../../utils/constants';
import { Star as StarIcon } from 'lucide-vue-next';
import CachedImage from '../ui/CachedImage.vue';

interface Props {
  movie: ParsedMovie;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  edit: [movie: ParsedMovie];
  delete: [id: string];
  click: [movie: ParsedMovie];
}>();

// 计算属性
const getWatchProgress = () => {
  const movie = props.movie;
  if (!movie || movie.type !== 'tv') return 0;

  // 计算累计观看集数（与详情页逻辑一致）
  let totalWatchedEpisodes = 0;
  const totalEpisodes = movie.total_episodes || 0;

  if (movie.seasons_data && movie.current_season) {
    // 使用seasons_data计算累计集数
    const seasons = Object.values(movie.seasons_data)
      .sort((a, b) => a.season_number - b.season_number);

    for (const season of seasons) {
      if (season.season_number < movie.current_season) {
        // 前面的季全部看完
        totalWatchedEpisodes += season.episode_count;
      } else if (season.season_number === movie.current_season) {
        // 当前季看了部分
        totalWatchedEpisodes += movie.current_episode || 0;
        break;
      }
    }
  } else {
    // 回退到传统方式
    totalWatchedEpisodes = movie.current_episode || 0;
  }

  if (totalEpisodes === 0) return 0;
  return Math.round((totalWatchedEpisodes / totalEpisodes) * 100);
};

// 获取累计观看集数
const getTotalWatchedEpisodes = () => {
  const movie = props.movie;
  if (!movie || movie.type !== 'tv') return 0;

  let totalWatchedEpisodes = 0;

  if (movie.seasons_data && movie.current_season) {
    // 使用seasons_data计算累计集数
    const seasons = Object.values(movie.seasons_data)
      .sort((a, b) => a.season_number - b.season_number);

    for (const season of seasons) {
      if (season.season_number < movie.current_season) {
        // 前面的季全部看完
        totalWatchedEpisodes += season.episode_count;
      } else if (season.season_number === movie.current_season) {
        // 当前季看了部分
        totalWatchedEpisodes += movie.current_episode || 0;
        break;
      }
    }
  } else {
    // 回退到传统方式
    totalWatchedEpisodes = movie.current_episode || 0;
  }

  return totalWatchedEpisodes;
};

// 方法
const getImageURL = (path: string | undefined) => {
  return tmdbAPI.getImageURL(path);
};

const formatDate = (dateString: string) => {
  const now = new Date();
  const date = new Date(dateString);
  const diffTime = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return '今天';
  if (diffDays === 1) return '昨天';
  if (diffDays < 7) return `${diffDays}天前`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}周前`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}个月前`;
  return `${Math.floor(diffDays / 365)}年前`;
};

const handleImageError = () => {
  // 处理图片加载错误
};
</script>

<style scoped>
.movie-card {
  transform: translateY(0);
  transition: all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}

.movie-card:hover {
  transform: translateY(-8px);
}

/* 图片加载占位符 */
img {
  background: linear-gradient(45deg, #f3f4f6 25%, transparent 25%), 
              linear-gradient(-45deg, #f3f4f6 25%, transparent 25%), 
              linear-gradient(45deg, transparent 75%, #f3f4f6 75%), 
              linear-gradient(-45deg, transparent 75%, #f3f4f6 75%);
  background-size: 20px 20px;
  background-position: 0 0, 0 10px, 10px -10px, -10px 0px;
}
</style> 