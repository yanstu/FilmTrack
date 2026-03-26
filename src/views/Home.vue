<template>
  <div class="h-full bg-gradient-to-br from-blue-50/50 via-white to-purple-50/50 relative">
    <div class="h-full overflow-y-auto">
    <div class="max-w-7xl mx-auto p-6 space-y-8">
      <!-- 页面标题和快速操作 -->
      <div class="flex items-center justify-between animate-fade-in-up" style="animation-delay: 0ms;">
        <div>
          <h1 class="text-3xl font-bold text-gray-900 mb-2">影迹</h1>
          <p class="text-gray-600">记录观影足迹，不再错过每一集精彩</p>
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
        
        <div v-if="loadingStats" class="flex items-center justify-center py-8">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span class="ml-3 text-gray-600">加载统计数据...</span>
        </div>
        
        <div v-else-if="statsError" class="text-center py-8">
          <p class="text-red-600 mb-4">{{ statsError }}</p>
          <button @click="loadStatistics" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            重试
          </button>
        </div>
        
        <div v-else class="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
          <div class="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-4 text-white">
            <div class="flex items-center">
              <FilmIcon class="w-8 h-8 mr-3" />
              <div>
                <p class="text-blue-100 text-sm">总电影数</p>
                <p class="text-2xl font-bold">{{ statistics.total_movies }}</p>
              </div>
            </div>
          </div>
          
          <div class="bg-gradient-to-r from-green-500 to-green-600 rounded-lg p-4 text-white">
            <div class="flex items-center">
              <CheckCircleIcon class="w-8 h-8 mr-3" />
              <div>
                <p class="text-green-100 text-sm">已完成</p>
                <p class="text-2xl font-bold">{{ statistics.completed_movies }}</p>
              </div>
            </div>
          </div>
          
          <div class="bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-lg p-4 text-white">
            <div class="flex items-center">
              <StarIcon class="w-8 h-8 mr-3" />
              <div>
                <p class="text-yellow-100 text-sm">平均评分</p>
                <p class="text-2xl font-bold">{{ statistics.average_rating > 0 ? formatRating(statistics.average_rating / 2) : '0.0' }}</p>
              </div>
            </div>
          </div>
          
          <div class="bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-lg p-4 text-white">
            <div class="flex items-center">
              <CalendarIcon class="w-8 h-8 mr-3" />
              <div>
                <p class="text-indigo-100 text-sm">本月观看</p>
                <p class="text-2xl font-bold">{{ statistics.movies_this_month }}</p>
              </div>
            </div>
          </div>
          
          <div class="bg-gradient-to-r from-pink-500 to-pink-600 rounded-lg p-4 text-white">
            <div class="flex items-center">
              <TrendingUpIcon class="w-8 h-8 mr-3" />
              <div>
                <p class="text-pink-100 text-sm">今年观看</p>
                <p class="text-2xl font-bold">{{ statistics.movies_this_year }}</p>
              </div>
            </div>
          </div>
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

        <div v-if="loadingReminders" class="flex items-center justify-center py-8 text-gray-600">
          <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <span class="ml-3">加载更新提醒...</span>
        </div>

        <div v-else-if="reminderError" class="text-center py-8">
          <p class="text-red-600 mb-4">{{ reminderError }}</p>
          <button @click="refreshReminders" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            重试
          </button>
        </div>

        <div v-else-if="reminderGroups.length === 0" class="text-center py-12">
          <BellRingIcon class="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p class="text-gray-500 mb-2">近期没有即将更新的剧集</p>
          <p class="text-gray-400 text-sm">记录更多正在播出的电视剧即可收到提醒</p>
        </div>

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
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div
                v-for="item in group.items"
                :key="`${item.movie_id}-${item.air_date}-${item.episode_number ?? 'na'}`"
                class="border border-gray-100 rounded-lg p-4 hover:border-blue-200 hover:shadow-md transition-all duration-200 cursor-pointer bg-gray-50/60"
                @click="navigateToDetail(item.movie_id)"
              >
                <div class="flex items-start space-x-4">
                  <div class="w-16 h-24 rounded-md overflow-hidden bg-gray-200 flex-shrink-0">
                    <CachedImage
                      :src="getMovieImageURL(item.poster_path)"
                      :alt="item.title"
                      class-name="w-full h-full object-cover"
                    />
                  </div>
                  <div class="flex-1 update-reminder-info">
                    <p class="text-base font-semibold text-gray-900 mb-1 truncate">{{ item.title }}</p>
                    <p class="text-sm text-blue-600 font-medium">{{ formatEpisodeLabel(item.season_number, item.episode_number) }}</p>
                    <p v-if="item.episode_name" class="text-sm text-gray-600 mt-1 truncate">{{ item.episode_name }}</p>
                    <!-- <p class="text-xs text-gray-400 mt-2">{{ getRelativeDayLabel(item.air_date) || '即将播出' }}</p> -->
                  </div>
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
        
        <div v-if="loadingWatching" class="flex items-center justify-center py-12">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span class="ml-3 text-gray-600">加载追剧数据...</span>
        </div>
        
        <div v-else-if="watchingError" class="text-center py-12">
          <p class="text-red-600 mb-4">{{ watchingError }}</p>
          <button @click="() => loadWatchingMovies()" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            重试
          </button>
        </div>
        
        <div v-else-if="watchingMovies.length === 0" class="text-center py-12">
          <FilmIcon class="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p class="text-gray-500 text-lg mb-2">目前没有正在追剧的作品</p>
          <p class="text-gray-400 text-sm mb-6">开始追剧吧！</p>
          <router-link
            to="/record"
            class="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
          >
            <PlusIcon class="w-5 h-5 mr-2" />
            添加新作品
          </router-link>
        </div>
        
        <div v-else class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
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
        
        <div v-if="loadingHistory" class="flex items-center justify-center py-8">
          <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <span class="ml-3 text-gray-600">加载重刷记录...</span>
        </div>
        
        <div v-else-if="historyError" class="text-center py-8">
          <p class="text-red-600 mb-4">{{ historyError }}</p>
          <button @click="loadReplayHistory" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            重试
          </button>
        </div>
        
        <div v-else-if="recentHistory.length === 0" class="text-center py-8">
          <ClockIcon class="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p class="text-gray-500 mb-2">暂无重刷记录</p>
        </div>
        
        <div v-else class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
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
import { formatRating, getStatusLabel, getStatusBadgeClass } from '../utils/constants'
import { APP_CONFIG } from '../../config/app.config'
import { 
  PlusIcon,
  FilmIcon,
  CheckCircleIcon,
  StarIcon,
  CalendarIcon,
  TrendingUpIcon,
  ClockIcon,
  BellRingIcon
} from 'lucide-vue-next'
import CachedImage from '../components/ui/CachedImage.vue'
import { useHomeData } from './Home/composables/useHomeData'

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
  getMovieImageURL,
  navigateToDetail,
  getTotalWatchedEpisodes,
  formatReminderDate,
  formatEpisodeLabel,
  loadStatistics,
  loadWatchingMovies,
  loadReplayHistory,
  refreshReminders,
  initializeData
} = useHomeData()

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

.update-reminder-info {
  display: flex;
  height: -webkit-fill-available;
  flex-direction: column;
  justify-content: space-around
}
</style>
