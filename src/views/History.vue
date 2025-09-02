<template>
  <div class="h-full bg-gradient-to-br from-gray-50 via-white to-blue-50 relative">
    <!-- 顶部区域 -->
    <div class="sticky top-0 z-20 bg-white/70 backdrop-blur-lg border-b border-gray-200/30 animate-fade-in-down" style="width: calc(100% - 10px);animation-delay: 150ms;">
      <div class="container px-6 py-6">
        <!-- 页面标题和统计 -->
        <div class="flex flex-row items-center justify-between gap-6">
          <div>
            <h1 class="text-3xl font-bold text-gray-900 mb-2">观看历史</h1>
            <p class="text-gray-600">追踪您的观影足迹，记录美好时光</p>
          </div>

          <!-- 统计卡片 -->
          <div class="grid grid-cols-4 gap-4 grid-rows-1">
            <div class="stat-card">
              <div class="text-2xl font-bold text-blue-600">{{ stats.total }}</div>
              <div class="text-sm text-gray-600">总数</div>
            </div>
            <div class="stat-card">
              <div class="text-2xl font-bold text-green-600">{{ stats.completed }}</div>
              <div class="text-sm text-gray-600">已看完</div>
            </div>
            <div class="stat-card">
              <div class="text-2xl font-bold text-orange-600">{{ stats.watching }}</div>
              <div class="text-sm text-gray-600">在看</div>
            </div>
            <div class="stat-card">
              <div class="text-2xl font-bold text-purple-600">{{ stats.avgRating.toFixed(1) }}</div>
              <div class="text-sm text-gray-600">平均评分</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 主要内容区域 -->
    <div id="scroll-container" class="container mx-auto px-6 py-8 absolute overflow-y-auto inset-0 animate-fade-in-up" style="animation-delay: 150ms;">
      <!-- 错误状态 -->
      <div v-if="loadError" class="text-center py-8">
        <div class="text-red-600 mb-4">{{ loadError }}</div>
        <button @click="refresh" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          重新加载
        </button>
      </div>

      <!-- 时间轴内容 -->
      <div class="pt-32" v-else-if="groupedMovies.length > 0">
        <div class="timeline-container">
          <div v-for="group in groupedMovies" :key="group.date" class="timeline-group">
            <!-- 日期分组标题 -->
            <div class="timeline-date">
              <div class="timeline-date-badge">
                {{ formatGroupDate(group.date) }}
              </div>
              <div class="timeline-count">{{ group.items.length }} 项记录</div>
            </div>

            <!-- 记录列表 -->
            <div class="timeline-items">
              <div v-for="movie in group.items" :key="movie.id" class="timeline-item"
                @click="navigateToDetail(movie.id)">
                <div class="timeline-marker"></div>
                <div class="timeline-content">
                  <div class="movie-card">
                    <div class="movie-poster">
                      <CachedImage :src="getImageURL(movie.poster_path)" :alt="movie.title" class-name="poster-image"
                        fallback="/placeholder-poster.svg" />
                      <div class="poster-overlay absolute">
                        <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </div>
                    </div>

                    <div class="movie-info">
                      <div class="movie-header">
                        <h3 class="movie-title">{{ movie.title }}</h3>
                        <div class="movie-meta">
                          <span class="movie-year">{{ movie.year }}</span>
                          <span class="separator">·</span>
                          <span class="movie-type">{{ getTypeLabel(movie.type) }}</span>
                        </div>
                      </div>

                      <div class="movie-status-row">
                        <span :class="['status-badge', getStatusBadgeClass(movie.status)]">
                          {{ getStatusLabel(movie.status) }}
                        </span>

                        <div v-if="movie.personal_rating" class="rating-display">
                          <span class="star">★</span>
                          <span class="rating-value">{{ formatRating(movie.personal_rating) }}/5.0</span>
                        </div>
                      </div>

                      <!-- 进度信息 -->
                      <div v-if="movie.type === 'tv' && movie.current_episode" class="progress-info">
                        <div class="progress-text">
                          第 {{ movie.current_episode }}/{{ movie.total_episodes || '?' }} 集
                        </div>
                        <div v-if="movie.total_episodes" class="progress-bar">
                          <div class="progress-fill"
                            :style="{ width: `${(movie.current_episode / movie.total_episodes) * 100}%` }"></div>
                        </div>
                      </div>

                      <!-- 笔记 -->
                      <div v-if="movie.notes" class="movie-notes">
                        <p>{{ movie.notes }}</p>
                      </div>

                      <div class="movie-footer">
                        <div class="update-time">
                          {{ formatTime(movie.updated_at) }}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 加载更多指示器 -->
        <div v-if="loading" class="text-center py-8">
          <div class="inline-flex items-center px-4 py-2 text-gray-600">
            <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-gray-600" xmlns="http://www.w3.org/2000/svg" fill="none"
              viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z">
              </path>
            </svg>
            加载中...
          </div>
        </div>

        <!-- 没有更多数据提示 -->
        <div v-else-if="!hasMore && movies.length > 0" class="text-center py-8">
          <p class="text-gray-500">已加载全部记录</p>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-else-if="isEmpty" class="empty-state">
        <div class="empty-icon">
          <svg class="w-20 h-20 text-gray-400 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 class="empty-title">暂无观看历史</h3>
        <p class="empty-description">开始观看影视作品后，这里会显示你的观看记录</p>
        <router-link to="/record" class="empty-action">
          <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          添加第一部作品
        </router-link>
      </div>

      <!-- 初始加载状态 -->
      <div v-else class="text-center py-8">
        <div class="inline-flex items-center px-4 py-2 text-gray-600">
          <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-gray-600" xmlns="http://www.w3.org/2000/svg" fill="none"
            viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z">
            </path>
          </svg>
          加载中...
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useMovieStore } from '../stores/movie';
import { useInfiniteScroll } from '../composables/useInfiniteScroll';
import { databaseAPI } from '../services/database-api';
import { tmdbAPI } from '../utils/api';
import { formatRating, getTypeLabel, getStatusLabel, getStatusBadgeClass } from '../utils/constants';
import { APP_CONFIG } from '../../config/app.config';
import type { Movie } from '../types';
import CachedImage from '../components/ui/CachedImage.vue';

const router = useRouter();
const movieStore = useMovieStore();

// 统计数据（从store获取，不影响无限滚动）
const stats = computed(() => {
  const movies = movieStore.movies;
  const completed = movies.filter(m => m.status === 'completed');
  const watching = movies.filter(m => m.status === 'watching');
  const ratings = movies.filter(m => m.personal_rating && m.personal_rating > 0).map(m => m.personal_rating!);

  return {
    total: movies.length,
    completed: completed.length,
    watching: watching.length,
    avgRating: ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0
  };
});

// 无限滚动数据加载函数
const loadMoviesPage = async (page: number, pageSize: number) => {
  try {
    const offset = (page - 1) * pageSize;

    // 首先获取总数
    const totalResult = await databaseAPI.getMovies();
    if (!totalResult.success || !totalResult.data) {
      throw new Error(totalResult.error || '获取数据失败');
    }
    const totalCount = totalResult.data.length;

    // 使用数据库API获取分页数据（已按updated_at DESC排序）
    const result = await databaseAPI.getMovies(undefined, pageSize, offset);
    if (!result.success || !result.data) {
      throw new Error(result.error || '获取数据失败');
    }

    const hasMore = offset + pageSize < totalCount;

    return {
      data: result.data,
      hasMore,
      total: totalCount
    };
  } catch (error) {
    console.error('加载历史数据失败:', error);
    throw error;
  }
};

// 使用无限滚动
const {
  items: movies,
  loading,
  error: loadError,
  hasMore,
  isEmpty,
  refresh
} = useInfiniteScroll(loadMoviesPage, {
  pageSize: 20,
  threshold: 200,
  immediate: false,
  container: '#scroll-container'
});

// 计算分组数据
const groupedMovies = computed(() => {
  const groups: { [key: string]: Movie[] } = {};

  movies.value.forEach(movie => {
    const date = new Date(movie.updated_at).toDateString();
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(movie);
  });

  return Object.keys(groups)
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
    .map(date => ({
      date,
      items: groups[date].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    }));
});

// 方法
const navigateToDetail = (id: string) => {
  router.push({ name: 'Detail', params: { id } });
};

const getImageURL = (path: string | undefined) => {
  return tmdbAPI.getImageURL(path);
};

const handleImageError = (event: Event) => {
  const target = event.target as HTMLImageElement;
  target.src = '/placeholder-poster.svg';
};

const formatTime = (dateString: string) => {
  return new Date(dateString).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit'
  });
};

const formatGroupDate = (dateString: string) => {
  const date = new Date(dateString);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) {
    return '今天';
  } else if (date.toDateString() === yesterday.toDateString()) {
    return '昨天';
  } else {
    // 检查是否是今年
    const isCurrentYear = date.getFullYear() === today.getFullYear();

    if (isCurrentYear) {
      // 今年的日期不显示年份
      return date.toLocaleDateString('zh-CN', {
        month: 'long',
        day: 'numeric',
        weekday: 'long'
      });
    } else {
      // 非今年的日期显示年份
      return date.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'long'
      });
    }
  }
};

// 初始化
onMounted(async () => {
  try {
    // 只加载统计数据，历史数据通过无限滚动加载
    await movieStore.fetchMovies();
  } catch (error) {
    console.error('加载统计数据失败:', error);
  }
});
</script>

<style scoped>
/* 统计卡片 */
.stat-card {
  @apply bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-xl p-4 text-center hover:shadow-lg transition-all duration-300;
}

/* 时间线视图样式 */
.timeline-container {
  @apply space-y-8 relative;
}

/* 主时间轴线 */
.timeline-container::before {
  content: '';
  @apply absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-blue-200 via-blue-300 to-transparent;
}

.timeline-group {
  @apply relative;
}

.timeline-date {
  @apply flex items-center justify-between mb-6 sticky z-10 bg-white/95 backdrop-blur-sm py-3 rounded-lg border border-gray-200/80 shadow-sm;
  top: 125px;
  padding-left: 1.5rem;
  padding-right: 1.5rem;
}

.timeline-date-badge {
  @apply text-base font-semibold text-gray-900 flex items-center;
}

.timeline-date-badge::before {
  content: '';
  @apply w-3 h-3 bg-blue-500 rounded-full mr-3 shadow-sm;
}

.timeline-count {
  @apply text-sm text-gray-500;
}

.timeline-items {
  @apply space-y-3 pl-6;
}

.timeline-item {
  @apply relative cursor-pointer;
}

.timeline-marker {
  @apply absolute -left-7 top-4 w-2 h-2 bg-blue-400 rounded-full ring-4 ring-white shadow-sm transition-all duration-200;
}

.timeline-item:hover .timeline-marker {
  @apply bg-blue-600 scale-125;
}

.timeline-content {
  @apply pl-4;
}

.movie-card {
  @apply bg-white/90 backdrop-blur-sm border border-gray-200/60 rounded-lg p-4 hover:shadow-md hover:border-gray-300/80 transition-all duration-200 flex space-x-4;
}

.movie-poster {
  @apply w-16 h-24 relative flex-shrink-0 overflow-hidden;
}

.poster-image {
  @apply w-full h-full object-cover rounded-md shadow-sm;
}

.poster-overlay {
  @apply absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity duration-200 rounded-md flex items-center justify-center;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
}

.movie-info {
  @apply flex-1 min-w-0;
}

.movie-header {
  @apply mb-2;
}

.movie-title {
  @apply text-base font-medium text-gray-900 truncate mb-1;
}

.movie-meta {
  @apply text-sm text-gray-500 flex items-center space-x-1;
}

.separator {
  @apply text-gray-400;
}

.movie-status-row {
  @apply flex items-center justify-between mb-2;
}

.status-badge {
  @apply inline-flex items-center px-2 py-1 rounded-md text-xs font-medium;
}

.rating-display {
  @apply flex items-center space-x-1;
}

.star {
  @apply text-yellow-500 text-sm;
}

.rating-value {
  @apply text-sm text-gray-600;
}

.progress-info {
  @apply mb-2;
}

.progress-text {
  @apply text-sm text-gray-600 mb-1;
}

.progress-bar {
  @apply w-full bg-gray-200 rounded-full h-1.5;
}

.progress-fill {
  @apply bg-blue-500 h-1.5 rounded-full transition-all duration-300;
}

.movie-notes {
  @apply mb-2 p-2 bg-gray-50/80 rounded-md;
}

.movie-notes p {
  @apply text-sm text-gray-700 line-clamp-2;
}

.movie-footer {
  @apply flex justify-end text-xs text-gray-400;
}

.update-time {
  @apply font-medium;
}

/* 空状态样式 */
.empty-state {
  @apply text-center py-36;
}

.empty-icon {
  @apply mx-auto mb-6;
}

.empty-title {
  @apply text-2xl font-semibold text-gray-900 mb-2;
}

.empty-description {
  @apply text-gray-600 mb-8 max-w-sm mx-auto;
}

.empty-action {
  @apply inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors duration-200 shadow-lg hover:shadow-xl;
}

/* 页面进入动画 */
.animate-fade-in-down {
  animation: fadeInDown 0.4s ease-out both;
}

.animate-fade-in-up {
  animation: fadeInUp 0.4s ease-out both;
}

@keyframes fadeInDown {
  from {
    opacity: 0;
    transform: translateY(-15px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.timeline-item {
  animation: fadeInUp 0.5s ease-out;
}
</style>