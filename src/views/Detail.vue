<template>
  <div class="h-full overflow-auto bg-gradient-to-br from-blue-50/50 via-white to-purple-50/50">
    <!-- 加载状态 -->
    <div v-if="isLoading" class="flex items-center justify-center h-full">
      <div class="text-center">
        <div class="w-12 h-12 border-4 border-gray-200 rounded-full animate-spin border-t-blue-600 mx-auto mb-4"></div>
        <p class="text-gray-600">加载中...</p>
      </div>
    </div>

    <!-- 电影不存在 -->
    <div v-else-if="!movie" class="flex items-center justify-center h-full">
      <div class="text-center">
        <svg class="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.664-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
        <h3 class="text-lg font-medium text-gray-900 mb-2">影视作品不存在</h3>
        <p class="text-gray-600 mb-4">请检查链接是否正确</p>
        <router-link to="/" class="btn btn-primary btn-md">返回首页</router-link>
      </div>
    </div>

    <!-- 详情内容 -->
    <div v-else class="max-w-6xl mx-auto">
      <!-- 顶部横幅 -->
      <div class="relative h-96 overflow-hidden">
        <!-- 背景图 -->
        <div class="absolute inset-0">
          <CachedImage v-if="backdropImages.length > 0"
            :src="getImageURL(backdropImages[currentBackdropIndex], 'w1280')" :alt="movie.title"
            class-name="w-full h-full object-cover" fallback="/placeholder-poster.svg" />
          <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>
        </div>

        <!-- 返回按钮 -->
        <div class="absolute top-6 left-6 z-10">
          <button @click="goBack"
            class="p-2 bg-black/50 backdrop-blur-sm text-white rounded-full hover:bg-black/70 transition-colors duration-200">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        </div>

        <!-- 主要信息 -->
        <div class="absolute bottom-0 left-0 right-0 p-6 text-white">
          <div class="flex items-end space-x-6">
            <!-- 海报 -->
            <div class="flex-shrink-0 cursor-pointer" @click="showPosterPreview">
              <CachedImage :src="getImageURL(movie.poster_path)" :alt="movie.title"
                class-name="w-48 h-72 object-cover rounded-lg shadow-xl hover:opacity-90 transition-opacity"
                fallback="/placeholder-poster.svg" />
            </div>

            <!-- 基本信息 -->
            <div class="flex-1 pb-4">
              <div class="mb-4">
                <h1 class="text-4xl font-bold mb-2">{{ movie.title }}</h1>
                <p v-if="movie.original_title && movie.original_title !== movie.title" class="text-xl text-gray-300">
                  {{ movie.original_title }}
                </p>
              </div>

              <div class="flex items-center space-x-6 mb-4">
                <span class="text-lg">{{ movie.year }}</span>
                <span class="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-sm">
                  {{ getTypeLabel(movie.type) }}
                </span>
                <span v-if="movie.status" :class="[
                  'px-3 py-1 rounded-full text-sm font-medium',
                  getStatusBadgeClass(movie.status)
                ]">
                  {{ getStatusLabel(movie.status) }}
                </span>
                <span v-if="movie.air_status" class="px-3 py-1 bg-blue-500/80 text-white rounded-full text-sm">
                  {{ getAirStatusLabel(movie.air_status) }}
                </span>
              </div>

              <!-- 评分对比 -->
              <div class="flex items-center space-x-8">
                <div v-if="movie.tmdb_rating" class="flex items-center">
                  <span class="text-sm text-gray-300 mr-2">TMDb</span>
                  <div class="flex text-yellow-400 mr-2">
                    <svg v-for="i in 5" :key="i" :class="[
                      'w-4 h-4',
                      movie.tmdb_rating >= i * 2 ? 'fill-current' : 'text-gray-500'
                    ]" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  </div>
                  <span class="text-lg font-semibold">{{ movie.tmdb_rating.toFixed(1) }}</span>
                </div>

                <div v-if="movie.personal_rating" class="flex items-center">
                  <span class="text-sm text-gray-300 mr-2">个人</span>
                  <div class="flex text-yellow-400 mr-2">
                    <svg v-for="i in 5" :key="i" :class="[
                      'w-4 h-4',
                      movie.personal_rating >= i ? 'fill-current' :
                        movie.personal_rating >= i - 0.5 ? 'fill-current opacity-50' : 'text-gray-500'
                    ]" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  </div>
                  <span class="text-lg font-semibold">{{ formatRating(movie.personal_rating) }}/5.0</span>
                </div>
              </div>

              <!-- 播放源显示 -->
              <div v-if="movie.watch_source" class="mt-2">
                <span class="text-sm text-gray-300">观看平台：</span>
                <div class="inline-flex items-center">
                  <LinkIcon v-if="isValidUrl(movie.watch_source)" class="w-4 h-4 text-white mr-1" />
                  <a v-if="isValidUrl(movie.watch_source)" @click="openExternalLink(movie.watch_source)"
                    class="text-white font-medium hover:text-blue-300 transition-colors cursor-pointer">
                    {{ movie.watch_source }}
                  </a>
                  <span v-else class="text-white font-medium">{{ movie.watch_source }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 详细内容区域 -->
      <div class="p-6">
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <!-- 主要内容 -->
          <div class="lg:col-span-2 space-y-8">
            <!-- 简介 -->
            <div v-if="movie.overview" class="card p-6">
              <h2 class="text-xl font-semibold text-gray-900 mb-4">剧情简介</h2>
              <p class="text-gray-700 leading-relaxed">{{ movie.overview }}</p>
            </div>

            <!-- 个人笔记 -->
            <div v-if="movie.notes" class="card p-6">
              <h2 class="text-xl font-semibold text-gray-900 mb-4">个人笔记</h2>
              <div class="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-r-lg">
                <p class="text-gray-700">{{ movie.notes }}</p>
              </div>
            </div>

            <!-- 观看进度 (电视剧) -->
            <div v-if="movie.type === 'tv'" class="card p-6">
              <h2 class="text-xl font-semibold text-gray-900 mb-4">观看进度</h2>
              <div class="space-y-4">
                <div class="flex items-center justify-between">
                  <span class="text-gray-600">当前集数</span>
                  <span class="font-semibold">{{ movie.current_episode || 0 }}/{{ movie.total_episodes || '?' }}</span>
                </div>
                <div class="w-full bg-gray-200 rounded-full h-3">
                  <div :class="[
                    'h-3 rounded-full transition-all duration-300',
                    getProgressColor(getWatchProgress())
                  ]" :style="{ width: `${getWatchProgress()}%` }"></div>
                </div>
                <div class="flex justify-between text-sm text-gray-500">
                  <span>{{ getWatchProgress() }}% 完成</span>
                  <span v-if="movie.current_season">第 {{ movie.current_season }} 季</span>
                </div>
              </div>
            </div>
          </div>

          <!-- 侧边栏信息 -->
          <div class="space-y-6">
            <!-- 操作按钮 -->
            <div class="card p-6">
              <h3 class="text-lg font-semibold text-gray-900 mb-4">操作</h3>
              <div class="space-y-3">
                <button @click="editRecord"
                  class="w-full flex items-center justify-center px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors duration-200 font-medium">
                  编辑记录
                </button>

                <button v-if="movie.type === 'tv' && movie.status !== 'completed'" @click="markEpisodeWatched"
                  class="w-full flex items-center justify-center px-4 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors duration-200 font-medium">
                  这集已看
                </button>

                <button @click="updateMovieInfo"
                  class="w-full flex items-center justify-center px-4 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors duration-200 font-medium">
                  刷新影视信息
                </button>
              </div>
            </div>

            <!-- 详细信息 -->
            <div class="card p-6">
              <h3 class="text-lg font-semibold text-gray-900 mb-4">详细信息</h3>
              <div class="space-y-3 text-sm">
                <div class="flex justify-between">
                  <span class="text-gray-600">添加日期</span>
                  <span class="font-medium">{{ formatDate(movie.date_added) }}</span>
                </div>
                <div v-if="movie.total_seasons" class="flex justify-between">
                  <span class="text-gray-600">总季数</span>
                  <span class="font-medium">{{ movie.total_seasons }}</span>
                </div>
                <div v-if="movie.runtime" class="flex justify-between">
                  <span class="text-gray-600">时长</span>
                  <span class="font-medium">{{ movie.runtime }} 分钟</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-600">TMDb ID</span>
                  <a :href="`https://www.themoviedb.org/${movie.type}/${movie.tmdb_id}`" target="_blank"
                    class="font-medium text-blue-600 hover:text-blue-800">
                    {{ movie.tmdb_id }}
                  </a>
                </div>
              </div>
            </div>

            <!-- 删除记录 -->
            <div class="card p-6 border-red-200">
              <button @click="deleteRecord"
                class="w-full flex items-center justify-center px-4 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors duration-200 font-medium">
                <TrashIcon class="w-4 h-4 mr-2" />
                删除记录
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 编辑记录模态框 -->
    <EditRecordModal :is-open="editModalVisible" :movie="movie" @close="editModalVisible = false"
      @save="handleSaveRecord" />

    <!-- 海报预览模态框 -->
    <Modal :is-open="posterPreviewVisible" type="info" title="海报预览" message="" confirm-text="关闭"
      @close="posterPreviewVisible = false" @confirm="posterPreviewVisible = false" :large="true">
      <template #content>
        <div class="flex justify-center">
          <CachedImage :src="getImageURL(movie?.poster_path, 'w780')" :alt="movie?.title"
            class-name="max-w-full max-h-[70vh] object-contain rounded-lg shadow-lg"
            fallback="/placeholder-poster.svg" />
        </div>
      </template>
    </Modal>

    <!-- 提示对话框 -->
    <Modal :is-open="dialog.visible" :type="dialog.type" :title="dialog.title" :message="dialog.message"
      :show-cancel="dialog.type === 'confirm'" @close="dialog.visible = false" @confirm="dialog.onConfirm" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useMovieStore } from '../stores/movie';
import { tmdbAPI } from '../utils/api';
import { APP_CONFIG } from '../../config/app.config';
import { getAirStatusLabel, formatRating, getTypeLabel, getStatusLabel, getStatusBadgeClass } from '../utils/constants';
import Modal from '../components/ui/Modal.vue';
import EditRecordModal from '../components/ui/EditRecordModal.vue';
import { LinkIcon, TrashIcon } from 'lucide-vue-next';
import { openUrl } from '@tauri-apps/plugin-opener';
import type { Movie } from '../types';
import CachedImage from '../components/ui/CachedImage.vue';

const route = useRoute();
const router = useRouter();
const movieStore = useMovieStore();

// 响应式状态
const isLoading = ref(true);
const movie = ref<Movie | null>(null);
const editModalVisible = ref(false);
const posterPreviewVisible = ref(false);
const backdropImages = ref<string[]>([]);
const currentBackdropIndex = ref(0);

// 计算属性
const getWatchProgress = () => {
  if (!movie.value?.current_episode || !movie.value?.total_episodes) return 0;
  return Math.round((movie.value.current_episode / movie.value.total_episodes) * 100);
};

// 方法
const goBack = () => {
  router.go(-1);
};

const getImageURL = (path: string | undefined, size: string = 'w500') => {
  return tmdbAPI.getImageURL(path, size);
};

const getProgressColor = (progress: number) => {
  if (progress < 25) return 'bg-red-500';
  if (progress < 50) return 'bg-orange-500';
  if (progress < 75) return 'bg-yellow-500';
  if (progress < 100) return 'bg-blue-500';
  return 'bg-green-500';
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('zh-CN');
};

const showPosterPreview = () => {
  posterPreviewVisible.value = true;
};

const isValidUrl = (string: string) => {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
};

// 操作方法
const editRecord = () => {
  editModalVisible.value = true;
};

const markEpisodeWatched = async () => {
  if (!movie.value || movie.value.type !== 'tv') return;

  try {
    const newCurrentEpisode = (movie.value.current_episode || 0) + 1;
    const totalEpisodes = movie.value.total_episodes || 0;

    // 确保更新的对象包含所有必要的字段，并且格式与数据库期待的一致
    const updatedMovie: Movie = {
      ...movie.value,
      current_episode: newCurrentEpisode,
      date_updated: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // 如果看到最后一集，将状态改为已看
    if (newCurrentEpisode >= totalEpisodes && totalEpisodes > 0) {
      updatedMovie.status = 'completed';
      showDialog('success', '恭喜完结！', `《${movie.value.title}》已全部看完，状态已更新为"已看"`);
    } else {
      showDialog('success', '成功', `已标记第 ${newCurrentEpisode} 集为已观看`);
    }

    console.log('准备更新电影数据:', updatedMovie);
    const result = await movieStore.updateMovie(updatedMovie);

    if (result.success) {
      // 更新本地状态
      movie.value = { ...updatedMovie };
      console.log('电影数据更新成功');
    } else {
      throw new Error(result.error || '更新失败');
    }
  } catch (error) {
    console.error('更新失败:', error);
    showDialog('error', '更新失败', `更新失败：${error.message || error}`);
  }
};

const updateMovieInfo = async () => {
  if (!movie.value?.tmdb_id) return;

  try {
    showDialog('info', '更新中', '正在从TMDb获取最新信息...');

    const details = movie.value.type === 'tv'
      ? await tmdbAPI.getTVDetails(movie.value.tmdb_id)
      : await tmdbAPI.getMovieDetails(movie.value.tmdb_id);

    const updatedMovie = {
      ...movie.value,
      title: details.title || details.name,
      overview: details.overview,
      poster_path: details.poster_path,
      backdrop_path: details.backdrop_path,
      tmdb_rating: details.vote_average,
      total_episodes: (details as any).number_of_episodes,
      total_seasons: (details as any).number_of_seasons,
      air_status: (details as any).status,
      updated_at: new Date().toISOString()
    };

    await movieStore.updateMovie(updatedMovie);
    movie.value = updatedMovie;

    // 重新加载背景图片
    if (movie.value.backdrop_path) {
      backdropImages.value = [movie.value.backdrop_path];
    }

    showDialog('success', '更新成功', '影视信息已更新');
  } catch (error) {
    console.error('更新失败:', error);
    showDialog('error', '更新失败', '获取最新信息失败，请重试');
  }
};

const handleSaveRecord = async (updatedMovie: Movie) => {
  try {
    updatedMovie.updated_at = new Date().toISOString();
    await movieStore.updateMovie(updatedMovie);
    movie.value = updatedMovie;
    editModalVisible.value = false;
    showDialog('success', '保存成功', '记录已更新');
  } catch (error) {
    console.error('保存失败:', error);
    showDialog('error', '保存失败', '保存失败，请重试');
  }
};

const deleteRecord = async () => {
  if (!movie.value) return;

  showDialog('confirm', '确认删除', `确定要删除《${movie.value.title}》的记录吗？此操作不可撤销。`, async () => {
    try {
      await movieStore.deleteMovie(movie.value!.id);
      router.push('/');
    } catch (error) {
      console.error('删除失败:', error);
      showDialog('error', '删除失败', '删除失败，请重试');
    }
  });
};

const loadBackdropImages = async () => {
  if (!movie.value?.tmdb_id) return;

  try {
    // 获取影视作品的剧照
    const endpoint = movie.value.type === 'tv'
      ? `/tv/${movie.value.tmdb_id}/images`
      : `/movie/${movie.value.tmdb_id}/images`;

    const response = await fetch(`https://api.themoviedb.org/3${endpoint}?api_key=06e492fa8930c108b57945b4fda6f397`);
    const data = await response.json();

    if (data.backdrops && data.backdrops.length > 0) {
      // 使用最佳质量的剧照，按投票数排序，取前3张
      backdropImages.value = data.backdrops
        .sort((a: any, b: any) => b.vote_average - a.vote_average)
        .slice(0, 3)
        .map((img: any) => img.file_path);
    } else if (movie.value.backdrop_path) {
      // 如果没有剧照，使用默认背景图片
      backdropImages.value = [movie.value.backdrop_path];
    }
  } catch (error) {
    console.log('获取剧照失败, 使用默认背景图片');
    if (movie.value.backdrop_path) {
      backdropImages.value = [movie.value.backdrop_path];
    }
  }
};

// 对话框状态
const dialog = ref({
  visible: false,
  type: 'info' as 'success' | 'error' | 'warning' | 'info' | 'confirm',
  title: '',
  message: '',
  onConfirm: () => { }
});

const showDialog = (type: typeof dialog.value.type, title: string, message: string, onConfirm?: () => void) => {
  dialog.value = {
    visible: true,
    type,
    title,
    message,
    onConfirm: onConfirm || (() => { dialog.value.visible = false; })
  };
};

const openExternalLink = (url: string) => {
  openUrl(url);
};

// 初始化
onMounted(async () => {
  const movieId = route.params.id as string;

  try {
    isLoading.value = true;

    // 获取电影信息
    await movieStore.fetchMovies();
    movie.value = movieStore.movies.find(m => m.id === movieId) || null;

    // 加载背景图片
    if (movie.value) {
      await loadBackdropImages();
    }
  } catch (error) {
    console.error('加载电影详情失败:', error);
  } finally {
    isLoading.value = false;
  }
});
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

/* 背景图片渐变遮罩 */
.bg-gradient-to-t {
  background: linear-gradient(to top, rgba(0, 0, 0, 0.8) 0%, rgba(0, 0, 0, 0.4) 50%, rgba(0, 0, 0, 0) 100%);
}

/* 返回按钮悬停效果 */
button:hover {
  transform: scale(1.05);
}
</style>