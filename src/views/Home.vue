<template>
  <div class="h-full bg-gradient-to-br from-blue-50/50 via-white to-purple-50/50 relative">
    <div class="h-full overflow-y-auto">
    <div class="max-w-7xl mx-auto p-6 space-y-8">
      <!-- 页面标题和快速操作 -->
      <div class="flex items-center justify-between animate-fade-in-up" style="animation-delay: 0ms;">
        <div>
          <h1 class="text-3xl font-bold text-gray-900 mb-2">影迹</h1>
          <p class="text-gray-600">管理你的电影、剧集和追剧进度</p>
        </div>
        <div class="flex space-x-3">
          <router-link
            to="/record"
            class="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
          >
            <PlusIcon class="w-5 h-5 mr-2" />
            添加影视
          </router-link>
        </div>
      </div>

      <!-- 统计概览 -->
      <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6 animate-fade-in-up" style="animation-delay: 100ms;">
        <h2 class="text-xl font-semibold text-gray-900 mb-6">统计概览</h2>
        
        <div v-if="loadingStats" class="grid gap-4 sm:gap-5 [grid-template-columns:repeat(auto-fit,minmax(160px,1fr))]">
          <div v-for="i in 5" :key="`stat-sk-${i}`" class="stats-card stats-card-blue">
            <div class="stats-card-content gap-3">
              <Skeleton variant="circle" />
              <div class="flex-1 space-y-2">
                <Skeleton variant="line" width="60%" />
                <Skeleton variant="line" width="40%" height="18px" />
              </div>
            </div>
          </div>
        </div>

        <EmptyState
          v-else-if="statsError"
          tone="danger"
          title="统计数据没能加载出来"
          :description="statsError"
          action-label="重试"
          @action="loadStatistics"
        />
        
        <div v-else class="grid gap-4 sm:gap-5 [grid-template-columns:repeat(auto-fit,minmax(160px,1fr))]">
          <div class="stats-card stats-card-blue">
            <div class="stats-card-content">
              <div class="stats-card-icon-wrap">
                <FilmIcon class="stats-card-icon" />
              </div>
              <div>
                <p class="stats-card-label">总电影数</p>
                <p class="stats-card-value">{{ statistics.total_movies }}</p>
              </div>
            </div>
          </div>
          
          <div class="stats-card stats-card-green">
            <div class="stats-card-content">
              <div class="stats-card-icon-wrap">
                <CheckCircleIcon class="stats-card-icon" />
              </div>
              <div>
                <p class="stats-card-label">已完成</p>
                <p class="stats-card-value">{{ statistics.completed_movies }}</p>
              </div>
            </div>
          </div>
          
          <div class="stats-card stats-card-yellow">
            <div class="stats-card-content">
              <div class="stats-card-icon-wrap">
                <StarIcon class="stats-card-icon" />
              </div>
              <div>
                <p class="stats-card-label">平均评分</p>
                <p class="stats-card-value">{{ statistics.average_rating > 0 ? formatRating(statistics.average_rating / 2) : '0.0' }}</p>
              </div>
            </div>
          </div>
          
          <div class="stats-card stats-card-indigo">
            <div class="stats-card-content">
              <div class="stats-card-icon-wrap">
                <CalendarIcon class="stats-card-icon" />
              </div>
              <div>
                <p class="stats-card-label">本月观看</p>
                <p class="stats-card-value">{{ statistics.movies_this_month }}</p>
              </div>
            </div>
          </div>
          
          <div class="stats-card stats-card-pink">
            <div class="stats-card-content">
              <div class="stats-card-icon-wrap">
                <TrendingUpIcon class="stats-card-icon" />
              </div>
              <div>
                <p class="stats-card-label">今年观看</p>
                <p class="stats-card-value">{{ statistics.movies_this_year }}</p>
              </div>
            </div>
          </div>
      </div>
    </div>

      <!-- 观影待办 -->
      <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6 animate-fade-in-up" style="animation-delay: 125ms;">
        <div class="flex items-center justify-between mb-6">
          <div>
            <h2 class="text-xl font-semibold text-gray-900">观影待办</h2>
            <p class="text-gray-500 text-sm mt-1">接下来想看什么，先记下来</p>
          </div>
          <router-link
            to="/library"
            class="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            打开影视库
          </router-link>
        </div>

        <div
          v-if="loadingWatching || loadingReminders"
          class="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(260px,1fr))]"
        >
          <div v-for="i in 3" :key="`todo-sk-${i}`" class="todo-card-skeleton">
            <Skeleton variant="line" width="35%" height="14px" />
            <Skeleton variant="line" width="80%" height="16px" />
            <Skeleton variant="line" width="50%" />
            <Skeleton variant="line" width="65%" />
          </div>
        </div>

        <EmptyState
          v-else-if="actionItems.length === 0"
          tone="info"
          title="现在没有待办"
          description="开始追剧或补几条在看记录后，再回来看看。"
          hint="也可以从命令面板（⌘K）直接打开任意作品"
        />

        <div v-else class="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(260px,1fr))]">
          <button
            v-for="item in actionItems"
            :key="`${item.type}-${item.movieId}`"
            type="button"
            class="todo-card text-left"
            @click="navigateToDetail(item.movieId)"
          >
            <div class="todo-card-header">
              <span class="todo-card-tag" :class="`todo-card-tag-${item.type}`">{{ getActionTypeLabel(item.type) }}</span>
              <span class="todo-card-link">{{ item.actionLabel }}</span>
            </div>
            <div class="todo-card-title">{{ item.title }}</div>
            <div class="todo-card-subtitle">{{ item.subtitle }}</div>
            <div class="todo-card-reason">{{ item.reason }}</div>
          </button>
        </div>
      </div>

      <!-- 更新提醒 -->
      <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6 animate-fade-in-up" style="animation-delay: 150ms;">
        <div class="flex items-center justify-between mb-6">
          <div class="flex items-center space-x-3">
            <div class="p-2 rounded-full bg-blue-50 text-blue-600">
              <BellRingIcon class="w-5 h-5" />
            </div>
            <div>
              <h2 class="text-xl font-semibold text-gray-900">更新提醒</h2>
              <p class="text-gray-500 text-sm">未来7天内预计播出的剧集</p>
            </div>
          </div>
          <button
            class="inline-flex items-center px-3 py-2 text-sm font-medium text-blue-600 border border-blue-100 rounded-lg hover:bg-blue-50 transition-colors duration-200 disabled:opacity-60"
            @click="refreshReminders"
            :disabled="loadingReminders"
          >
            <svg v-if="loadingReminders" class="animate-spin h-4 w-4 mr-2 text-blue-600" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a10 10 0 00-10 10h4z"></path>
            </svg>
            <span>{{ loadingReminders ? '刷新中...' : '刷新提醒' }}</span>
          </button>
        </div>

        <div
          v-if="loadingReminders"
          class="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(248px,1fr))]"
        >
          <div v-for="i in 4" :key="`rm-sk-${i}`" class="update-reminder-skeleton">
            <Skeleton variant="block" width="64px" height="96px" />
            <div class="flex-1 space-y-2">
              <Skeleton variant="line" width="70%" height="14px" />
              <Skeleton variant="line" width="40%" />
              <Skeleton variant="line" width="55%" />
            </div>
          </div>
        </div>

        <EmptyState
          v-else-if="reminderError"
          tone="danger"
          title="提醒没能加载出来"
          :description="reminderError"
          action-label="重试"
          :action-icon="RefreshCcwIcon"
          @action="refreshReminders"
        />

        <EmptyState
          v-else-if="reminderGroups.length === 0"
          tone="info"
          :icon="BellRingIcon"
          title="近期没有即将更新的剧集"
          description="记录更多正在播出的电视剧，影迹会自动整理出未来 7 天的播出表。"
          hint="今天有新集时会通过桌面通知提醒你（需要授予通知权限）"
        />

        <div v-else class="space-y-6">
          <div
            v-for="group in reminderGroups"
            :key="group.date"
            class="space-y-3"
          >
            <div class="flex items-center text-gray-700 font-medium">
              <CalendarIcon class="w-4 h-4 mr-2 text-blue-500" />
              <span>{{ formatReminderDate(group.date) }}</span>
            </div>
            <div class="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(248px,1fr))]">
              <div
                v-for="item in group.items"
                :key="`${item.movie_id}-${item.air_date}-${item.episode_number ?? 'na'}`"
                class="update-reminder-card"
                @click="navigateToDetail(item.movie_id)"
              >
                <div class="update-reminder-poster">
                  <CachedImage
                    :src="getMovieImageURL(item.poster_path)"
                    :alt="item.title"
                    class-name="w-full h-full object-cover"
                  />
                </div>
                <div class="update-reminder-info">
                  <p class="update-reminder-title">{{ item.title }}</p>
                  <div class="update-reminder-meta">
                    <span class="update-reminder-episode">{{ formatEpisodeLabel(item.season_number, item.episode_number) }}</span>
                    <span class="update-reminder-day">{{ getRelativeDayLabel(item.air_date) || '即将播出' }}</span>
                  </div>
                  <p v-if="item.episode_name" class="update-reminder-name">{{ item.episode_name }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 正在追剧 -->
      <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6 animate-fade-in-up" style="animation-delay: 200ms;">
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-xl font-semibold text-gray-900">正在追剧</h2>
        </div>
        
        <div
          v-if="loadingWatching"
          class="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(132px,1fr))]"
        >
          <div v-for="i in 6" :key="`wt-sk-${i}`" class="space-y-2">
            <Skeleton variant="poster" />
            <Skeleton variant="line" width="80%" />
          </div>
        </div>

        <EmptyState
          v-else-if="watchingError"
          tone="danger"
          title="追剧数据没能加载出来"
          :description="watchingError"
          action-label="重试"
          @action="() => loadWatchingMovies()"
        />

        <EmptyState
          v-else-if="watchingMovies.length === 0"
          tone="info"
          :icon="FilmIcon"
          title="还没有在追的作品"
          description="挑一部开始，观看进度会自动显示在这里。"
          action-label="添加新作品"
          :action-icon="PlusIcon"
          hint="也可以按 ⌘/Ctrl+3 直接跳到添加记录页"
          @action="navigateToRecord"
        />
        
        <div v-else class="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(132px,1fr))]">
          <div
            v-for="movie in watchingMovies"
            :key="movie.id"
            @click="navigateToDetail(movie.id)"
            class="group cursor-pointer"
          >
            <div class="relative aspect-[2/3] rounded-lg overflow-hidden bg-gray-200 group-hover:shadow-lg transition-shadow duration-200">
              <CachedImage
                :src="getMovieImageURL(movie.poster_path)"
                :alt="movie.title"
                class-name="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
              />
              <div class="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent">
                <div class="absolute bottom-0 left-0 right-0 p-3">
                  <p class="text-white text-sm font-medium truncate">{{ movie.title }}</p>
                  <div v-if="movie.type === 'tv'" class="mt-1">
                    <p class="text-white text-xs">
                      {{ getTotalWatchedEpisodes(movie) }}/{{ movie.total_episodes || '?' }} 集
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 最近重刷记录 -->
      <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6 animate-fade-in-up" style="animation-delay: 300ms;">
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-xl font-semibold text-gray-900">最近观看</h2>
          <router-link
            to="/history"
            class="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            查看全部
          </router-link>
        </div>
        
        <div
          v-if="loadingHistory"
          class="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(132px,1fr))]"
        >
          <div v-for="i in 6" :key="`hist-sk-${i}`" class="space-y-2">
            <Skeleton variant="poster" />
            <Skeleton variant="line" width="80%" />
          </div>
        </div>

        <EmptyState
          v-else-if="historyError"
          tone="danger"
          title="最近观看没能加载出来"
          :description="historyError"
          action-label="重试"
          @action="loadReplayHistory"
        />

        <EmptyState
          v-else-if="recentHistory.length === 0"
          tone="info"
          :icon="ClockIcon"
          title="还没有最近观看记录"
          description="标记完成或重刷一部作品后，最近观看就会出现在这里。"
        />
        
        <div v-else class="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(132px,1fr))]">
          <div
            v-for="movie in recentHistory"
            :key="movie.id"
            @click="navigateToDetail(movie.id)"
            class="group cursor-pointer"
          >
            <div class="relative aspect-[2/3] rounded-lg overflow-hidden bg-gray-200 group-hover:shadow-lg transition-shadow duration-200">
              <CachedImage
                :src="getMovieImageURL(movie.poster_path)"
                :alt="movie.title"
                class-name="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
              />
              <div class="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent">
                <div class="absolute bottom-0 left-0 right-0 p-3">
                  <p class="text-white text-sm font-medium truncate">{{ movie.title }}</p>
                  <div class="flex items-center justify-between mt-1">
                    <span :class="getStatusBadgeClass(movie.status)" class="text-xs px-2 py-1 rounded">
                      {{ getStatusLabel(movie.status) }}
                    </span>
                    <div v-if="movie.personal_rating" class="flex items-center">
                      <StarIcon class="w-3 h-3 text-yellow-400 mr-1" />
                      <span class="text-white text-xs">{{ formatRating(movie.personal_rating) }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { formatRating, getStatusLabel, getStatusBadgeClass } from '../utils/constants'
import { APP_CONFIG } from '../../config/app.config'
import {
  Plus as PlusIcon,
  Film as FilmIcon,
  CheckCircle as CheckCircleIcon,
  Star as StarIcon,
  Calendar as CalendarIcon,
  TrendingUp as TrendingUpIcon,
  Clock as ClockIcon,
  BellRing as BellRingIcon,
  RefreshCcw as RefreshCcwIcon,
} from 'lucide-vue-next'
import CachedImage from '../components/ui/CachedImage.vue'
import Skeleton from '../components/common/Skeleton.vue'
import EmptyState from '../components/common/EmptyState.vue'
import { useHomeData } from './Home/composables/useHomeData'

const router = useRouter()
const navigateToRecord = () => router.push('/record')

const {
  movieStore,
  loadingStats,
  loadingWatching,
  loadingHistory,
  loadingReminders,
  statsError,
  watchingError,
  historyError,
  reminderError,
  statistics,
  watchingMovies,
  recentHistory,
  reminderGroups,
  actionItems,
  getMovieImageURL,
  navigateToDetail,
  getTotalWatchedEpisodes,
  getRelativeDayLabel,
  formatReminderDate,
  formatEpisodeLabel,
  loadStatistics,
  loadWatchingMovies,
  loadReplayHistory,
  refreshReminders,
  initializeData
} = useHomeData()

const getActionTypeLabel = (type: string) => {
  const labels: Record<string, string> = {
    continue: '继续追剧',
    resume: '恢复进度',
    upcoming: '新集提醒',
    review: '待复核'
  }

  return labels[type] || '待处理'
}

onMounted(() => {
  // 延迟执行，确保组件完全挂载
  setTimeout(() => {
    initializeData();
  }, 100);
})
</script>

<style scoped>
.animate-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* 页面进入动画 */
.animate-fade-in-up {
  animation: fadeInUp 0.4s ease-out both;
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

/* 悬停效果 */
.group:hover .group-hover\:scale-105 {
  transform: scale(1.05);
}

/* 卡片悬停阴影 */
.group-hover\:shadow-lg:hover {
  box-shadow: 0 10px 25px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
}

.update-reminder-card {
  display: flex;
  align-items: center;
  gap: 0.9rem;
  padding: 0.7rem;
  border: 1px solid rgba(243, 244, 246, 1);
  border-radius: 0.85rem;
  background: rgba(249, 250, 251, 0.6);
  cursor: pointer;
  transition: border-color 200ms ease, box-shadow 200ms ease, transform 200ms ease;
}

.update-reminder-card:hover {
  border-color: rgba(191, 219, 254, 1);
  box-shadow: 0 12px 26px -20px rgba(15, 23, 42, 0.45);
  transform: translateY(-2px);
}

.update-reminder-poster {
  width: 3.5rem;
  height: 5.25rem;
  flex-shrink: 0;
  border-radius: 0.5rem;
  overflow: hidden;
  background: #e5e7eb;
}

/* 海报图无论来自哪一层组件都铺满裁切，消除内联基线留白 */
.update-reminder-poster :deep(img) {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.update-reminder-info {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 0.3rem;
}

.update-reminder-title {
  font-size: 0.92rem;
  font-weight: 600;
  color: #111827;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.update-reminder-meta {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.update-reminder-episode {
  font-size: 0.8rem;
  font-weight: 600;
  color: #2563eb;
  white-space: nowrap;
}

.update-reminder-name {
  font-size: 0.78rem;
  color: #6b7280;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.update-reminder-day {
  flex-shrink: 0;
  font-size: 0.7rem;
  font-weight: 600;
  color: #2563eb;
  background: rgba(219, 234, 254, 0.7);
  border-radius: 999px;
  padding: 0.05rem 0.45rem;
  white-space: nowrap;
}

.stats-card {
  position: relative;
  overflow: hidden;
  border-radius: 1rem;
  padding: 1rem;
  color: #fff;
  box-shadow: 0 14px 32px -22px rgba(15, 23, 42, 0.8);
  transition:
    transform 220ms ease,
    box-shadow 220ms ease,
    filter 220ms ease;
}

.stats-card::before {
  content: '';
  position: absolute;
  inset: auto -25% -65% auto;
  width: 8rem;
  height: 8rem;
  border-radius: 9999px;
  background: rgba(255, 255, 255, 0.18);
  filter: blur(6px);
  transition:
    transform 220ms ease,
    opacity 220ms ease;
}

.stats-card::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.18), transparent 45%);
  opacity: 0;
  transition: opacity 220ms ease;
}

.stats-card:hover {
  transform: translateY(-6px);
  box-shadow: 0 22px 40px -24px rgba(15, 23, 42, 0.65);
  filter: saturate(1.06);
}

.stats-card:hover::before {
  transform: scale(1.18);
}

.stats-card:hover::after {
  opacity: 1;
}

.stats-card-content {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
}

.stats-card-icon-wrap {
  display: inline-flex;
  margin-right: 0.75rem;
  border-radius: 9999px;
  padding: 0.7rem;
  background: rgba(255, 255, 255, 0.14);
  backdrop-filter: blur(8px);
  transition:
    transform 220ms ease,
    background-color 220ms ease,
    box-shadow 220ms ease;
}

.stats-card:hover .stats-card-icon-wrap {
  transform: scale(1.14) rotate(-4deg);
  background: rgba(255, 255, 255, 0.22);
  box-shadow: 0 10px 24px -16px rgba(255, 255, 255, 0.9);
}

.stats-card-icon {
  width: 2rem;
  height: 2rem;
  transition: transform 220ms ease;
}

.stats-card:hover .stats-card-icon {
  transform: scale(1.1);
}

.stats-card-label {
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.82);
}

.stats-card-value {
  font-size: 1.5rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  transition: transform 220ms ease;
}

.stats-card:hover .stats-card-value {
  transform: translateY(-1px);
}

.stats-card-blue {
  background: linear-gradient(135deg, #2563eb, #1d4ed8);
}

.stats-card-green {
  background: linear-gradient(135deg, #16a34a, #15803d);
}

.stats-card-yellow {
  background: linear-gradient(135deg, #f59e0b, #d97706);
}

.stats-card-indigo {
  background: linear-gradient(135deg, #6366f1, #4338ca);
}

.stats-card-pink {
  background: linear-gradient(135deg, #ec4899, #db2777);
}

.todo-card {
  position: relative;
  overflow: hidden;
  border-radius: 1.25rem;
  border: 1px solid rgba(226, 232, 240, 0.9);
  background:
    radial-gradient(circle at top right, rgba(191, 219, 254, 0.3), transparent 34%),
    linear-gradient(145deg, rgba(255, 255, 255, 0.98), rgba(248, 250, 252, 0.96));
  padding: 1rem;
  transition:
    transform 220ms ease,
    border-color 220ms ease,
    box-shadow 220ms ease;
}

.todo-card:hover {
  transform: translateY(-4px);
  border-color: rgba(96, 165, 250, 0.55);
  box-shadow: 0 18px 34px -24px rgba(15, 23, 42, 0.45);
}

.todo-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.85rem;
  gap: 0.75rem;
}

.todo-card-tag {
  display: inline-flex;
  align-items: center;
  border-radius: 9999px;
  padding: 0.25rem 0.65rem;
  font-size: 0.72rem;
  font-weight: 600;
}

.todo-card-tag-continue {
  background: rgba(219, 234, 254, 0.95);
  color: #1d4ed8;
}

.todo-card-tag-resume {
  background: rgba(254, 240, 138, 0.95);
  color: #a16207;
}

.todo-card-tag-upcoming {
  background: rgba(220, 252, 231, 0.95);
  color: #15803d;
}

.todo-card-link {
  font-size: 0.78rem;
  font-weight: 600;
  color: #2563eb;
}

.todo-card-title {
  font-size: 1rem;
  font-weight: 600;
  color: #0f172a;
}

.todo-card-subtitle {
  margin-top: 0.35rem;
  font-size: 0.88rem;
  color: #1d4ed8;
}

.todo-card-reason {
  margin-top: 0.75rem;
  font-size: 0.8rem;
  line-height: 1.45;
  color: #64748b;
}

/* —— 骨架占位 —— */
.todo-card-skeleton {
  border-radius: 1.25rem;
  border: 1px solid rgba(226, 232, 240, 0.7);
  background: rgba(255, 255, 255, 0.7);
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.update-reminder-skeleton {
  display: flex;
  align-items: center;
  gap: 0.9rem;
  padding: 0.7rem;
  border: 1px solid rgba(243, 244, 246, 1);
  border-radius: 0.85rem;
  background: rgba(249, 250, 251, 0.6);
}
</style>
