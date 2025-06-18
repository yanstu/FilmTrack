<template>
  <div class="h-full overflow-auto bg-gradient-to-br from-blue-50/30 via-white to-purple-50/30">
    <div class="max-w-4xl mx-auto p-6">
      <!-- 页面标题 -->
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-gray-900 mb-2">添加影视记录</h1>
        <p class="text-gray-600">记录你的观影体验，构建个人影视库</p>
      </div>

      <!-- 搜索影视作品区域 -->
      <div class="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-200/50 mb-6">
        <h2 class="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <SearchIcon :size="20" class="mr-2 text-purple-600" />
          搜索影视作品
        </h2>
        
                      <div class="relative">
          <input
            v-model="tmdbSearchQuery"
            @input="handleTMDbSearch"
            @keydown.enter="selectFirstResult"
            type="text"
            placeholder="搜索电影或电视剧，支持中英文..."
            class="w-full px-4 py-3 pl-12 rounded-xl bg-white/80 backdrop-blur-sm 
                   border border-gray-200/50 text-gray-900 placeholder-gray-500
                   focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100
                   hover:border-gray-300/70 hover:bg-white/90 transition-all duration-200"
          />
          <SearchIcon :size="20" class="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
          
          <!-- 搜索快捷提示 -->
          <div v-if="!tmdbSearchQuery && showSearchTips" 
               class="absolute z-50 w-full mt-1 bg-white rounded-xl shadow-lg border border-gray-200 p-4">
            <p class="text-sm text-gray-600 mb-2">搜索提示：</p>
            <ul class="text-xs text-gray-500 space-y-1">
              <li>• 支持中文名称：如"流浪地球"、"星际穿越"</li>
              <li>• 支持英文原名：如"Interstellar"、"Avatar"</li>
              <li>• 支持年份搜索：如"2023电影"</li>
              <li>• 按回车键选择第一个结果</li>
            </ul>
          </div>
        </div>
              
        <!-- 搜索状态提示 -->
        <div v-if="tmdbSearchLoading" class="mt-4 p-4 rounded-xl bg-blue-50/60 border border-blue-200/50">
          <div class="flex items-center text-blue-600">
            <svg class="animate-spin -ml-1 mr-3 h-5 w-5" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            正在搜索影视作品...
          </div>
        </div>
        
        <!-- 无搜索结果提示 -->
        <div v-else-if="tmdbSearchQuery && !tmdbSearchLoading && tmdbResults.length === 0" class="mt-4 p-4 rounded-xl bg-gray-50/60 border border-gray-200/50">
          <div class="text-center text-gray-500">
            <SearchIcon :size="24" class="mx-auto mb-2 text-gray-400" />
            <p>未找到相关影视作品</p>
            <p class="text-sm mt-1">请尝试使用不同的关键词搜索</p>
          </div>
        </div>
              
        <!-- 搜索结果 -->
        <div v-else-if="tmdbResults.length > 0" class="mt-4 space-y-2">
                <div
                  v-for="result in tmdbResults"
                  :key="result.id"
                  @click="handleTMDbResultClick(result)"
            :class="[
              'flex items-center p-4 rounded-xl border cursor-pointer transition-all duration-200 hover:shadow-md hover:scale-[1.01]',
              isAlreadyAdded(result) 
                ? 'bg-green-50/60 hover:bg-green-50/80 border-green-200/50' 
                : 'bg-white/60 hover:bg-white/80 border-gray-100/50'
            ]"
                >
                  <img
                    :src="getImageURL(result.poster_path)"
                    :alt="result.title || result.name"
              class="w-16 h-24 object-cover rounded-lg shadow-sm"
                  />
            <div class="ml-4 flex-1">
              <div class="flex items-start justify-between">
                <div>
                  <h3 class="font-semibold text-gray-900">{{ result.title || result.name }}</h3>
                  <p class="text-sm text-gray-600">
                    {{ getYear(result.release_date || result.first_air_date) }} · 
                    {{ result.media_type === 'movie' ? '电影' : '电视剧' }}
                  </p>
                  <div class="flex items-center mt-1">
                    <StarIcon :size="14" class="text-yellow-400 fill-yellow-400 mr-1" />
                    <span class="text-sm text-gray-600">{{ result.vote_average?.toFixed(1) || 'N/A' }}</span>
                  </div>
                </div>
                <!-- 已添加标识 -->
                <div v-if="isAlreadyAdded(result)" class="flex flex-col items-end">
                  <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 mb-1">
                    <svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                    </svg>
                    已添加
                  </span>
                  <span class="text-xs text-gray-500">点击查看详情</span>
                </div>
              </div>
                  </div>
                </div>
              </div>
            </div>

      <!-- 影视信息和用户记录 -->
      <div v-if="form.tmdb_id" class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <!-- 封面图片 -->
        <div class="lg:col-span-1">
          <div class="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-200/50">
            <div class="aspect-[2/3] rounded-xl overflow-hidden bg-gray-100 cursor-pointer hover:shadow-lg transition-all duration-200" @click="showImagePreview">
              <CachedImage
                :src="getImageURL(form.poster_path)"
                :alt="form.title"
                class-name="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                fallback="/placeholder-poster.svg"
              />
            </div>
              </div>
            </div>

        <!-- 影视信息 -->
        <div class="lg:col-span-2">
          <div class="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-200/50">
            <h2 class="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <FilmIcon :size="20" class="mr-2 text-blue-600" />
              影视信息
            </h2>
            
            <div class="space-y-4">
              <!-- 标题信息 -->
              <div>
                <h3 class="text-xl font-bold text-gray-900">{{ form.title }}</h3>
                <p v-if="form.original_title && form.original_title !== form.title" 
                   class="text-sm text-gray-600 mt-1">{{ form.original_title }}</p>
              </div>

              <!-- 基本信息 -->
              <div class="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span class="text-gray-500">类型：</span>
                  <span class="text-gray-900">{{ getTypeLabel(form.type) }}</span>
                </div>
              <div>
                  <span class="text-gray-500">年份：</span>
                  <span class="text-gray-900">{{ form.year || '暂无' }}</span>
                </div>
                <div v-if="form.type === 'tv'">
                  <span class="text-gray-500">总集数：</span>
                  <span class="text-gray-900">{{ form.total_episodes || '未知' }}</span>
                </div>
                <div v-if="form.type === 'tv'">
                  <span class="text-gray-500">播出状态：</span>
                  <span class="text-gray-900">{{ getAirStatusLabel(form.air_status) }}</span>
                </div>
              </div>

              <!-- 评分信息 -->
              <div class="grid grid-cols-2 gap-4">
              <div>
                  <label class="block text-sm text-gray-500 mb-1">TMDb评分</label>
                  <div class="flex items-center space-x-2">
                    <StarIcon :size="16" class="text-yellow-400 fill-yellow-400" />
                    <span class="text-lg font-semibold text-gray-900">
                      {{ form.tmdb_rating ? form.tmdb_rating.toFixed(1) : '暂无' }}
                    </span>
              </div>
            </div>
              <div>
                  <label class="block text-sm text-gray-500 mb-1">个人评分</label>
                  <div class="flex items-center space-x-2">
                    <StarIcon :size="16" class="text-yellow-400 fill-yellow-400" />
                    <span class="text-lg font-semibold text-gray-900">
                      {{ form.personal_rating ? form.personal_rating.toFixed(1) : '暂无' }}
                    </span>
                  </div>
                </div>
              </div>

              <!-- 简介 -->
              <div v-if="form.overview">
                <label class="block text-sm text-gray-500 mb-2">简介</label>
                <p class="text-sm text-gray-700 leading-relaxed">{{ form.overview }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 用户记录区域 -->
      <div v-if="form.tmdb_id" class="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-200/50 mb-8">
        <h2 class="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <ClipboardIcon :size="20" class="mr-2 text-green-600" />
          用户记录
        </h2>
        
        <div class="space-y-6">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">观看状态</label>
              <HeadlessSelect
                v-model="form.status"
                :options="statusOptions"
                placeholder="选择观看状态"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">个人评分</label>
              <div class="flex items-center h-[48px] px-4 py-3 rounded-xl bg-white/80 backdrop-blur-sm border border-gray-200/50">
                <StarRating
                  v-model="form.personal_rating"
                  :allow-half="true"
                  :show-value="true"
                  :show-reset="false"
                  :size="20"
                />
              </div>
              </div>
            </div>

          <!-- 集数记录（仅电视剧时显示） -->
          <div v-if="form.type === 'tv'" class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">当前季数</label>
              <input
                v-model.number="form.current_season"
                type="number"
                min="1"
                :max="form.total_seasons || 999"
                placeholder="1"
                class="w-full px-4 py-3 rounded-xl bg-white/80 backdrop-blur-sm 
                       border border-gray-200/50 text-gray-900 placeholder-gray-500
                       focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100
                       hover:border-gray-300/70 hover:bg-white/90 transition-all duration-200"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">当前集数</label>
              <div class="flex space-x-2">
                <input
                  v-model.number="form.current_episode"
                  type="number"
                  min="0"
                  :max="form.total_episodes || 999"
                  placeholder="1"
                  class="flex-1 px-4 py-3 rounded-xl bg-white/80 backdrop-blur-sm 
                         border border-gray-200/50 text-gray-900 placeholder-gray-500
                         focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100
                         hover:border-gray-300/70 hover:bg-white/90 transition-all duration-200"
                />
                <button
                  v-if="form.total_episodes"
                  @click="setToLastEpisode"
                  type="button"
                  class="px-4 py-3 bg-white text-gray-500 rounded-xl hover:bg-gray-50 hover:text-gray-600 transition-colors text-sm whitespace-nowrap border border-gray-300 shadow-sm"
                >
                  最后一集
                </button>
              </div>
            </div>
          </div>

          <!-- 观看源/平台 -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">观看源/平台</label>
            <input
              v-model="form.watch_source"
              type="text"
              placeholder="如：Netflix、爱奇艺、电影院等"
              class="w-full px-4 py-3 rounded-xl bg-white/80 backdrop-blur-sm 
                     border border-gray-200/50 text-gray-900 placeholder-gray-500
                     focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100
                     hover:border-gray-300/70 hover:bg-white/90 transition-all duration-200"
            />
          </div>

          <!-- 观看笔记 -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">观看笔记</label>
            <textarea
              v-model="form.notes"
              rows="4"
              placeholder="记录您的观看感受..."
              class="w-full px-4 py-3 rounded-xl bg-white/80 backdrop-blur-sm 
                     border border-gray-200/50 text-gray-900 placeholder-gray-500
                     focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100
                     hover:border-gray-300/70 hover:bg-white/90 transition-all duration-200 resize-none"
            ></textarea>
          </div>
        </div>
      </div>

      <!-- 底部按钮区域 -->
      <div v-if="form.tmdb_id" class="flex justify-end items-center space-x-3 pt-4 border-t border-gray-200/50">
        <button
          @click="handleReset"
          class="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 
                 font-medium rounded-xl transition-colors duration-200"
        >
          重置
        </button>
        <button
          @click="handleSubmit"
          :disabled="!canSubmit || isSubmitting"
          class="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 
                 text-white font-medium rounded-xl transition-colors duration-200"
        >
          {{ isSubmitting ? '添加中...' : '添加记录' }}
        </button>
      </div>
    </div>

    <!-- 图片预览模态框 -->
    <Modal
      :is-open="imagePreviewVisible"
      type="info"
      title="封面预览"
      :message="''"
      confirm-text="关闭"
      @close="imagePreviewVisible = false"
      @confirm="imagePreviewVisible = false"
      :large="true"
    >
      <template #content>
        <div class="flex justify-center">
          <CachedImage
            :src="getImageURL(form.poster_path, 'w780')"
            :alt="form.title"
            class-name="max-w-full max-h-[70vh] object-contain rounded-lg shadow-lg"
            fallback="/placeholder-poster.svg"
          />
        </div>
      </template>
    </Modal>

    <!-- 提示对话框 -->
    <Modal
      :is-open="dialog.visible"
      :type="dialog.type"
      :title="dialog.title"
      :message="dialog.message"
      :show-cancel="dialog.type === 'confirm'"
      @close="dialog.visible = false"
      @confirm="dialog.onConfirm"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useMovieStore } from '../stores/movie';
import { tmdbAPI, debounce } from '../utils/api';
import { APP_CONFIG } from '../../config/app.config';
import { getAirStatusLabel, getYear, getTypeLabel, getStatusLabel, getStatusBadgeClass } from '../utils/constants';
import type { TMDbMovie, TMDbMovieDetail } from '../types';
import HeadlessSelect from '../components/ui/HeadlessSelect.vue';
import StarRating from '../components/ui/StarRating.vue';
import Modal from '../components/ui/Modal.vue';
import { 
  Search as SearchIcon,
  Film as FilmIcon,
  Clipboard as ClipboardIcon,
  Star as StarIcon
} from 'lucide-vue-next';
import CachedImage from '../components/ui/CachedImage.vue';

const router = useRouter();
const movieStore = useMovieStore();

// 响应式状态
const tmdbSearchQuery = ref('');
const tmdbResults = ref<TMDbMovie[]>([]);
const tmdbSearchLoading = ref(false);
const isSubmitting = ref(false);
const imagePreviewVisible = ref(false);
const showSearchTips = ref(false);

// 对话框状态
const dialog = ref({
  visible: false,
  type: 'info' as 'success' | 'error' | 'warning' | 'info' | 'confirm',
  title: '',
  message: '',
  onConfirm: () => {}
});

// 表单数据
const form = ref({
  title: '',
  original_title: '',
  type: '' as 'movie' | 'tv' | '',
  year: undefined as number | undefined,
  status: 'watching',
  personal_rating: 0,
  watch_source: '',
  overview: '',
  notes: '',
  watched_date: new Date().toISOString().split('T')[0], // 默认当天
  tmdb_id: undefined as number | undefined,
  tmdb_rating: undefined as number | undefined,
  poster_path: '',
  total_episodes: undefined as number | undefined,
  total_seasons: undefined as number | undefined,
  current_episode: 1,
  current_season: 1,
  air_status: ''
});

// 计算属性
const canSubmit = computed(() => {
  return form.value.title && form.value.status && form.value.tmdb_id;
});

// 下拉选项配置
const statusOptions = [
  ...Object.entries(APP_CONFIG.features.watchStatus).map(([key, label]) => ({
    value: key,
    label
  }))
];

// 工具函数
const getImageURL = (path: string | null, size: string = 'w500'): string => {
  return tmdbAPI.getImageURL(path, size);
};

const setToLastEpisode = () => {
  if (form.value.total_episodes) {
    form.value.current_episode = form.value.total_episodes;
  }
};

// 方法
const selectFirstResult = () => {
  if (tmdbResults.value.length > 0) {
    selectTMDbResult(tmdbResults.value[0]);
  }
};

const handleTMDbSearch = debounce(async () => {
  if (tmdbSearchQuery.value.length < 2) {
    tmdbResults.value = [];
    tmdbSearchLoading.value = false;
    return;
  }

  tmdbSearchLoading.value = true;
  try {
    const response = await tmdbAPI.searchMulti(tmdbSearchQuery.value);
    tmdbResults.value = (response.results || [])
      .filter(item => item.media_type === 'movie' || item.media_type === 'tv')
      .slice(0, 5);
  } catch (error) {
    console.error('TMDb 搜索失败:', error);
    tmdbResults.value = [];
  } finally {
    tmdbSearchLoading.value = false;
  }
}, 300);

const selectTMDbResult = async (result: TMDbMovie) => {
  try {
    // 获取详细信息
    let detail: any;
    if (result.media_type === 'movie') {
      detail = await tmdbAPI.getMovieDetails(result.id);
    } else {
      detail = await tmdbAPI.getTVDetails(result.id);
    }

    form.value.title = detail.title || detail.name || '';
    form.value.original_title = detail.original_title || detail.original_name || '';
    form.value.type = result.media_type === 'movie' ? 'movie' : 'tv';
    form.value.year = getYear(detail.release_date || detail.first_air_date);
    form.value.overview = detail.overview || '';
    form.value.tmdb_id = detail.id;
    form.value.tmdb_rating = detail.vote_average;
    form.value.poster_path = detail.poster_path;

    // 电视剧特有信息
    if (result.media_type === 'tv') {
      form.value.total_episodes = detail.number_of_episodes;
      form.value.total_seasons = detail.number_of_seasons;
      form.value.air_status = detail.status;
    }

    // 主动缓存图片
    if (detail.poster_path) {
      const imageUrl = tmdbAPI.getImageURL(detail.poster_path, 'w500');
      try {
        // 动态导入并缓存图片
        const { prefetchImages } = await import('../utils/imageCache');
        await prefetchImages([imageUrl]);
        console.log('图片已预缓存:', imageUrl);
      } catch (error) {
        console.warn('预缓存图片失败:', error);
      }
    }

    tmdbSearchQuery.value = '';
    tmdbResults.value = [];
  } catch (error) {
    console.error('获取详细信息失败:', error);
    showDialog('error', '错误', '获取影视详细信息失败，请重试');
  }
};

const showImagePreview = () => {
  if (form.value.poster_path) {
    imagePreviewVisible.value = true;
  }
};

const handleSubmit = async () => {
  if (!canSubmit.value) {
    showDialog('warning', '提示', '请填写必填字段');
    return;
  }

  isSubmitting.value = true;

  try {
    const movieData = {
      tmdb_id: form.value.tmdb_id!,
      type: form.value.type as 'movie' | 'tv',
      status: form.value.status as any,
      personal_rating: form.value.personal_rating || undefined,
      notes: form.value.notes || undefined,
      watch_source: form.value.watch_source || undefined,
      current_episode: form.value.current_episode || undefined,
      current_season: form.value.current_season || undefined
    };

    console.log('准备添加影视数据:', movieData);
    const response = await movieStore.addMovie(movieData);
    console.log('addMovie响应:', response);
    
    if (response.success) {
      showDialog('success', '成功', '影视作品添加成功！', () => {
        router.push({ name: 'Home' });
      });
    } else {
      // 显示具体的错误信息
      const errorMessage = response.error || '添加失败，未知错误';
      console.error('添加失败:', errorMessage);
      showDialog('error', '添加失败', errorMessage);
    }
  } catch (error: any) {
    console.error('添加影视作品失败:', error);
    const errorMessage = error?.message || error?.toString() || '添加失败，请重试';
    showDialog('error', '添加失败', errorMessage);
  } finally {
    isSubmitting.value = false;
  }
};

const handleReset = () => {
  form.value = {
    title: '',
    original_title: '',
    type: '',
    year: undefined,
    status: 'watching',
    personal_rating: 0,
    watch_source: '',
    overview: '',
    notes: '',
    watched_date: new Date().toISOString().split('T')[0],
    tmdb_id: undefined,
    tmdb_rating: undefined,
    poster_path: '',
    total_episodes: undefined,
    total_seasons: undefined,
    current_episode: 1,
    current_season: 1,
    air_status: ''
  };
  tmdbSearchQuery.value = '';
  tmdbResults.value = [];
};

const showDialog = (type: typeof dialog.value.type, title: string, message: string, onConfirm?: () => void) => {
  dialog.value = {
    visible: true,
    type,
    title,
    message,
    onConfirm: onConfirm || (() => {})
  };
};

const isAlreadyAdded = (result: TMDbMovie): boolean => {
  return movieStore.movies.some(movie => movie.tmdb_id === result.id);
};

const handleTMDbResultClick = async (result: TMDbMovie) => {
  // 检查是否已经添加过
  const existingMovie = movieStore.movies.find(movie => movie.tmdb_id === result.id);
  
  if (existingMovie) {
    // 如果已添加，跳转到详情页
    router.push({ name: 'Detail', params: { id: existingMovie.id } });
  } else {
    // 如果未添加，正常选择
    await selectTMDbResult(result);
  }
};

onMounted(async () => {
  // 确保加载影视作品数据用于重复检测
  if (!movieStore.hasMovies) {
    await movieStore.fetchMovies();
  }
});

// 监听状态变化，如果选择已看且是电视剧，自动设置当前集数为最后一集
watch(() => form.value.status, (newStatus) => {
  if (newStatus === 'completed' && form.value.type === 'tv' && form.value.total_episodes) {
    form.value.current_episode = form.value.total_episodes;
  }
});
</script>

<style scoped>
.line-clamp-4 {
  display: -webkit-box;
  -webkit-line-clamp: 4;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style> 