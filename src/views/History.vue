<template>
  <div class="h-full flex flex-col bg-gradient-to-br from-gray-50 via-white to-blue-50">
    <!-- 顶部区域 -->
    <div class="shrink-0 z-20 bg-white/70 backdrop-blur-lg border-b border-gray-200/30 animate-fade-in-down" style="animation-delay: 150ms;">
      <div class="px-6 py-6">
        <!-- 页面标题和统计 -->
        <div class="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h1 class="text-3xl font-bold text-gray-900 mb-2">观看历史</h1>
            <p class="text-gray-600">追踪你的观影足迹，记录每一段美好时光</p>
          </div>

          <!-- 统计卡片 -->
          <div class="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
            <div class="stat-tile">
              <div class="stat-ico stat-ico-blue"><FilmIcon :size="18" /></div>
              <div class="stat-meta">
                <div class="stat-num">{{ stats.total }}</div>
                <div class="stat-cap">总数</div>
              </div>
            </div>
            <div class="stat-tile">
              <div class="stat-ico stat-ico-green"><CheckCircleIcon :size="18" /></div>
              <div class="stat-meta">
                <div class="stat-num">{{ stats.completed }}</div>
                <div class="stat-cap">已看完</div>
              </div>
            </div>
            <div class="stat-tile">
              <div class="stat-ico stat-ico-orange"><PlayCircleIcon :size="18" /></div>
              <div class="stat-meta">
                <div class="stat-num">{{ stats.watching }}</div>
                <div class="stat-cap">在看</div>
              </div>
            </div>
            <div class="stat-tile">
              <div class="stat-ico stat-ico-purple"><StarIcon :size="18" /></div>
              <div class="stat-meta">
                <div class="stat-num">{{ stats.avgRating.toFixed(1) }}</div>
                <div class="stat-cap">平均评分</div>
              </div>
            </div>
          </div>
        </div>

        <div class="mt-6 grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1.5fr)_repeat(2,minmax(0,180px))_auto]">
          <TextField
            v-model="searchQuery"
            placeholder="搜标题、原名或笔记"
            :leading-icon="SearchIcon"
            @update:model-value="applyFilters"
          />

          <HeadlessSelect
            v-model="selectedType"
            :options="historyTypeOptions"
            placeholder="全部类型"
            @update:model-value="applyFilters"
          />

          <HeadlessSelect
            v-model="selectedStatus"
            :options="historyStatusOptions"
            placeholder="全部状态"
            @update:model-value="applyFilters"
          />

          <button
            v-if="activeFilterCount > 0"
            type="button"
            class="history-reset-button"
            @click="resetFilters"
          >
            重置
          </button>
        </div>
      </div>
    </div>

    <!-- 主要内容区域 -->
    <div id="scroll-container" class="flex-1 min-h-0 overflow-y-auto px-6 py-8 animate-fade-in-up" style="animation-delay: 150ms;">
      <!-- 观看活跃度热力图 -->
      <WatchHeatmap v-if="movieStore.movies.length > 0" :movies="movieStore.movies" class="mb-8" />

      <!-- 错误状态 -->
      <div v-if="loadError" class="text-center py-8">
        <div class="text-red-600 mb-4">{{ loadError }}</div>
        <button @click="refresh" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          重新加载
        </button>
      </div>

      <!-- 时间轴内容 -->
      <div class="history-content" v-else-if="groupedMovies.length > 0">
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
                      <CachedImage :src="getImageURL(movie.poster_path)" :alt="movie.title" class-name="poster-image"/>
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
                          <span class="rating-value">{{ formatRating(movie.personal_rating / 2) }}/5.0</span>
                        </div>
                      </div>

                      <!-- 进度信息 -->
                      <div v-if="movie.type === 'tv' && (movie.current_episode || movie.total_episodes)" class="progress-info">
                        <div class="progress-text">
                          第 {{ getTotalWatchedEpisodes(movie) }}/{{ movie.total_episodes || '?' }} 集
                        </div>
                        <div v-if="movie.total_episodes" class="progress-bar">
                          <div class="progress-fill"
                            :style="{ width: `${getWatchProgress(movie)}%` }"></div>
                        </div>
                      </div>

                      <!-- 笔记 -->
                      <div v-if="movie.notes" class="movie-notes">
                        <p>{{ movie.notes }}</p>
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
      <div v-else-if="hasInitialized && (isEmpty || filteredMovies.length === 0)" class="empty-state">
        <div class="empty-icon">
          <svg class="w-20 h-20 text-gray-400 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 class="empty-title">{{ activeFilterCount > 0 ? '没找到符合条件的记录' : '还没有历史记录' }}</h3>
        <p class="empty-description">
          {{ activeFilterCount > 0 ? '换个关键词，或者把筛选条件放宽一点。' : '添加第一条记录，慢慢就有了自己的观看时间线。' }}
        </p>
        <button v-if="activeFilterCount > 0" type="button" class="empty-action" @click="resetFilters">
          重置
        </button>
        <router-link v-else to="/record" class="empty-action">
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
import {
  Search as SearchIcon,
  Film as FilmIcon,
  CheckCircle as CheckCircleIcon,
  PlayCircle as PlayCircleIcon,
  Star as StarIcon
} from 'lucide-vue-next';
import { formatRating, getTypeLabel, getStatusLabel, getStatusBadgeClass } from '../utils/constants';
import CachedImage from '../components/ui/CachedImage.vue';
import HeadlessSelect from '../components/ui/HeadlessSelect.vue';
import TextField from '../components/ui/TextField.vue';
import WatchHeatmap from './History/components/WatchHeatmap.vue';
import { useMovieStore } from '../stores/movie';
import { useHistoryData } from './History/composables/useHistoryData';
import { useHistoryView } from './History/composables/useHistoryView';

const movieStore = useMovieStore();

const {
  stats,
  items: movies,
  loading,
  error: loadError,
  hasMore,
  isEmpty,
  hasInitialized,
  refresh
} = useHistoryData();

const {
  groupedMovies,
  filteredMovies,
  searchQuery,
  selectedType,
  selectedStatus,
  activeFilterCount,
  historyTypeOptions,
  historyStatusOptions,
  navigateToDetail,
  getImageURL,
  getTotalWatchedEpisodes,
  getWatchProgress,
  formatGroupDate,
  applyFilters,
  resetFilters
} = useHistoryView(movies);

</script>

<style scoped>
/* 统计磁贴：图标芯片 + 数字 + 标签 */
.stat-tile {
  @apply flex items-center gap-3 rounded-2xl border border-gray-200/60 bg-white/80 backdrop-blur-sm p-3.5 transition-all duration-300 hover:-translate-y-0.5 hover:border-gray-300/70 hover:shadow-md;
}

.stat-ico {
  @apply flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl;
}

.stat-ico-blue {
  @apply bg-blue-50 text-blue-600;
}

.stat-ico-green {
  @apply bg-emerald-50 text-emerald-600;
}

.stat-ico-orange {
  @apply bg-orange-50 text-orange-600;
}

.stat-ico-purple {
  @apply bg-purple-50 text-purple-600;
}

.stat-meta {
  @apply min-w-0;
}

/* 数字等宽，避免不同位数时左右跳动 */
.stat-num {
  @apply text-xl font-bold leading-tight text-gray-900;
  font-variant-numeric: tabular-nums;
}

.stat-cap {
  @apply mt-0.5 text-xs text-gray-500;
}

.history-reset-button {
  @apply rounded-xl border border-transparent bg-gray-900 px-4 py-3 text-sm font-medium text-white transition-colors duration-200 hover:bg-gray-800;
}

.history-content {
  padding-top: 0;
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
  top: 0;
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
