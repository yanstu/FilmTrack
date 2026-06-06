<template>
  <div class="tmdb-card bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-all duration-300 group">
    <!-- 海报区域 -->
    <div class="relative aspect-[2/3] overflow-hidden">
      <CachedImage
        :src="getImageURL(movie.poster_path || '')"
        :alt="movie.title || movie.name || ''"
        class-name="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
      />
      
      <!-- 类型徽章 -->
      <div class="absolute top-2 left-2">
        <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100/90 text-blue-800 border border-blue-200 backdrop-blur-sm">
          {{ getTypeLabel(movie.media_type) }}
        </span>
      </div>

      <!-- TMDb 评分徽章 -->
      <div v-if="movie.vote_average > 0" class="absolute top-2 right-2">
        <div class="flex items-center bg-black/70 backdrop-blur-sm text-white px-2 py-1 rounded-full text-xs">
          <svg class="w-3 h-3 text-yellow-400 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
          </svg>
          {{ movie.vote_average.toFixed(1) }}
        </div>
      </div>

      <!-- 悬停操作层 -->
      <div class="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
        <div class="text-center space-y-3">
          <button
            @click="handleAddToLibrary"
            :disabled="isAdding"
            class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 flex items-center space-x-2"
          >
            <svg v-if="!isAdding" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
            </svg>
            <svg v-else class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>{{ isAdding ? '添加中...' : '添加到库' }}</span>
          </button>
          
          <button
            @click="handleViewDetails"
            class="px-4 py-2 bg-white/20 backdrop-blur-sm text-white rounded-lg hover:bg-white/30 transition-colors duration-200 flex items-center space-x-2"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <span>查看详情</span>
          </button>
        </div>
      </div>

      <!-- 已在库中指示器 -->
      <div v-if="isInLibrary" class="absolute inset-0 bg-green-600/80 flex items-center justify-center">
        <div class="text-center text-white">
          <svg class="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <p class="text-sm font-medium">已在库中</p>
        </div>
      </div>
    </div>

    <!-- 信息区域 -->
    <div class="p-4">
      <div class="mb-2">
        <h3 class="font-semibold text-gray-900 truncate text-lg leading-tight">
          {{ movie.title || movie.name }}
        </h3>
        <p v-if="(movie.original_title || movie.original_name) && 
               (movie.original_title !== movie.title || movie.original_name !== movie.name)" 
           class="text-sm text-gray-500 truncate mt-1">
          {{ movie.original_title || movie.original_name }}
        </p>
      </div>

      <div class="flex items-center justify-between text-sm text-gray-600 mb-3">
        <span>{{ getYear(movie.release_date || movie.first_air_date) }}</span>
        <span class="flex items-center">
          <svg class="w-3 h-3 text-gray-400 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clip-rule="evenodd"/>
          </svg>
          {{ movie.popularity?.toFixed(0) || 'N/A' }}
        </span>
      </div>

      <!-- 简介 -->
      <div v-if="movie.overview" class="text-sm text-gray-600 mb-3">
        <p class="line-clamp-3">{{ movie.overview }}</p>
      </div>

      <!-- 语言信息 -->
      <div v-if="movie.original_title || movie.original_name" class="flex items-center justify-between text-xs text-gray-500 mb-2">
        <span>原名</span>
        <span>{{ movie.original_title || movie.original_name }}</span>
      </div>

      <!-- 成人内容标识 -->
      <div v-if="movie.adult" class="text-center">
        <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
          18+
        </span>
      </div>
    </div>

    <!-- 底部操作栏 -->
    <div class="px-4 pb-4">
      <button
        v-if="!isInLibrary"
        @click="handleQuickAdd"
        :disabled="isAdding"
        class="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 text-sm font-medium"
      >
        {{ isAdding ? '添加中...' : '快速添加' }}
      </button>
      
      <button
        v-else
        @click="$emit('view-in-library', movie)"
        class="w-full py-2 px-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200 text-sm font-medium"
      >
        在库中查看
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { tmdbAPI } from '../../utils/api';
import { APP_CONFIG } from '../../../config/app.config';
import type { TMDbMovie } from '../../types';
import CachedImage from '../ui/CachedImage.vue';

interface Props {
  movie: TMDbMovie;
  isInLibrary?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  isInLibrary: false
});

const emit = defineEmits<{
  add: [movie: TMDbMovie];
  'view-details': [movie: TMDbMovie];
  'view-in-library': [movie: TMDbMovie];
}>();

// 响应式状态
const isAdding = ref(false);

// 方法
const getImageURL = (path: string | undefined) => {
  return tmdbAPI.getImageURL(path);
};

const getTypeLabel = (mediaType: string | undefined) => {
  if (!mediaType) return '未知';
  
  const typeMap = {
    movie: '电影',
    tv: '电视剧',
    person: '人物'
  };
  
  return typeMap[mediaType as keyof typeof typeMap] || mediaType;
};

const getYear = (dateString: string | undefined): string => {
  return dateString ? new Date(dateString).getFullYear().toString() : 'N/A';
};

const handleAddToLibrary = async () => {
  if (isAdding.value || props.isInLibrary) return;
  
  isAdding.value = true;
  try {
    emit('add', props.movie);
    // 假设父组件会处理实际的添加逻辑
    // 这里可以添加成功提示
  } catch (error) {
    console.error('添加到库失败:', error);
    // 这里可以添加错误提示
  } finally {
    // 延迟重置状态以显示反馈
    setTimeout(() => {
      isAdding.value = false;
    }, 1000);
  }
};

const handleQuickAdd = async () => {
  await handleAddToLibrary();
};

const handleViewDetails = () => {
  emit('view-details', props.movie);
};

const handleImageError = () => {
  // 处理图片加载失败后的逻辑
  // 这里可以添加一些默认图片或者错误处理逻辑
};
</script>

<style scoped>
.tmdb-card {
  transform: translateY(0);
  transition: all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}

.tmdb-card:hover {
  transform: translateY(-4px);
}

/* 文本截断 */
.line-clamp-3 {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* 旋转动画 */
.animate-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
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

/* 渐变悬停效果 */
.group:hover .absolute {
  backdrop-filter: blur(4px);
}
</style> 