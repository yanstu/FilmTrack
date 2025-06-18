<template>
  <div class="h-full bg-gray-50/50 backdrop-blur-xl">
    <!-- 搜索头部 -->
    <div class="px-8 py-6 bg-white/80 backdrop-blur-xl border-b border-gray-200/50">
      <div class="w-full">
        <h1 class="text-2xl font-bold text-gray-900 mb-6">影视库</h1>
        
        <!-- 搜索和筛选区域 -->
        <div class="flex flex-col lg:flex-row lg:items-center space-y-4 lg:space-y-0 lg:space-x-6 w-full">
          <!-- 搜索输入框 -->
          <div class="relative flex-1">
            <SearchIcon 
              :size="20" 
              class="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none z-10" 
            />
            <input
              v-model="searchQuery"
              type="text"
              placeholder="搜索影视作品标题，支持拼音首字母..."
              class="w-full pl-12 pr-4 py-3 rounded-xl bg-white/80 backdrop-blur-sm 
                     border border-gray-200/50 text-gray-900 placeholder-gray-500
                     focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100
                     hover:border-gray-300/70 hover:bg-white/90 transition-all duration-200"
              @input="handleSearchInput"
            />
          </div>
          
          <!-- 筛选区域 -->
          <div class="flex items-center space-x-3 flex-shrink-0">
            <!-- 类型筛选 -->
            <div class="w-32">
              <HeadlessSelect
                v-model="selectedType"
                :options="TYPE_OPTIONS"
                placeholder="类型"
                @update:modelValue="handleFilterChange"
              />
            </div>

            <!-- 状态筛选 -->
            <div class="w-32">
              <HeadlessSelect
                v-model="selectedStatus"
                :options="STATUS_OPTIONS"
                placeholder="状态"
                @update:modelValue="handleFilterChange"
              />
            </div>

            <!-- 视图切换 -->
            <div class="flex bg-gray-100/80 backdrop-blur-sm rounded-xl p-1">
              <button
                @click="viewMode = 'grid'"
                class="p-2 rounded-lg transition-all duration-200"
                :class="viewMode === 'grid' ? 'bg-white shadow-sm' : 'hover:bg-white/50'"
              >
                <GridIcon :size="18" class="text-gray-600" />
              </button>
              <button
                @click="viewMode = 'list'"
                class="p-2 rounded-lg transition-all duration-200"
                :class="viewMode === 'list' ? 'bg-white shadow-sm' : 'hover:bg-white/50'"
              >
                <ListIcon :size="18" class="text-gray-600" />
              </button>
            </div>
          </div>
        </div>

        <!-- 搜索统计 -->
        <div v-if="!infiniteScroll.isEmpty.value && searchQuery" class="mt-4">
          <p class="text-sm text-gray-600">
            找到 <span class="font-medium">{{ infiniteScroll.total.value || filteredItems.length }}</span> 个结果
            <span v-if="searchQuery">关于 "<span class="font-medium">{{ searchQuery }}</span>"</span>
          </p>
        </div>
      </div>
    </div>

    <!-- 搜索结果 -->
    <div class="p-8">
      <div class="max-w-7xl mx-auto">
        <!-- 加载状态 -->
        <div v-if="infiniteScroll.loading.value && infiniteScroll.items.value.length === 0" 
             class="flex items-center justify-center h-64">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>

        <!-- 空状态 -->
        <div v-else-if="infiniteScroll.isEmpty.value" class="text-center py-16">
          <SearchIcon :size="48" class="mx-auto text-gray-400 mb-4" />
          <p class="text-gray-600 text-lg">{{ searchQuery ? '未找到相关影视作品' : '您的影视库是空的' }}</p>
          <p class="text-gray-500 text-sm mt-2">{{ searchQuery ? '尝试使用不同的关键词或拼音首字母搜索' : '开始添加您的第一部影视作品' }}</p>
        </div>

        <!-- 网格视图 -->
        <div v-else-if="viewMode === 'grid'" class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          <div
            v-for="movie in infiniteScroll.items.value"
            :key="movie.id"
            class="group cursor-pointer"
            @click="navigateToDetail(movie.id)"
          >
            <div class="bg-white/80 backdrop-blur-sm rounded-2xl p-4 border border-gray-200/50 
                        hover:bg-white/90 hover:border-gray-300/50 transition-all duration-300 
                        hover:shadow-xl hover:shadow-blue-500/10 hover:-translate-y-1">
              <div class="aspect-[2/3] mb-4 overflow-hidden rounded-xl">
                <img
                  :src="getImageURL(movie.poster_path)"
                  :alt="movie.title"
                  class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  @error="handleImageError"
                />
              </div>
              <h3 class="font-semibold text-gray-900 mb-1 line-clamp-2">{{ movie.title }}</h3>
              <p class="text-sm text-gray-600 mb-2">{{ movie.year }}</p>
              <div class="flex items-center justify-between">
                <span
                  class="px-2 py-1 rounded-full text-xs font-medium"
                  :class="getStatusBadgeClass(movie.status)"
                >
                  {{ getStatusLabel(movie.status) }}
                </span>
                <div v-if="movie.user_rating" class="flex items-center space-x-1">
                  <StarIcon :size="14" class="text-yellow-400 fill-yellow-400" />
                  <span class="text-sm text-gray-600">{{ movie.user_rating }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 列表视图 -->
        <div v-else class="space-y-4">
          <div
            v-for="movie in infiniteScroll.items.value"
            :key="movie.id"
            class="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-200/50 
                   hover:bg-white/90 hover:border-gray-300/50 transition-all duration-200 
                   hover:shadow-lg hover:shadow-blue-500/5 cursor-pointer"
            @click="navigateToDetail(movie.id)"
          >
            <div class="flex items-start space-x-4">
              <CachedImage
                :src="getImageURL(movie.poster_path)"
                :alt="movie.title"
                class-name="w-20 h-30 object-cover rounded-xl shadow-sm"
                fallback="/placeholder-poster.svg"
              />
              
              <div class="flex-1">
                <div class="flex items-start justify-between">
                  <div>
                    <h3 class="text-lg font-semibold text-gray-900">{{ movie.title }}</h3>
                    <p class="text-gray-600 text-sm mt-1">{{ movie.original_title }}</p>
                    <div class="flex items-center space-x-4 mt-2">
                      <span class="text-sm text-gray-500">{{ movie.year }}</span>
                      <span class="text-sm text-gray-500">{{ getTypeLabel(movie.type) }}</span>
                      <div v-if="movie.user_rating" class="flex items-center space-x-1">
                        <StarIcon :size="14" class="text-yellow-400 fill-yellow-400" />
                        <span class="text-sm text-gray-600">{{ movie.user_rating }}/5</span>
                      </div>
                    </div>
                  </div>
                  
                  <span
                    class="px-3 py-1 rounded-full text-xs font-medium"
                    :class="getStatusBadgeClass(movie.status)"
                  >
                    {{ getStatusLabel(movie.status) }}
                  </span>
                </div>
                
                <p v-if="movie.overview" class="text-gray-700 text-sm mt-3 line-clamp-2">
                  {{ movie.overview }}
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- 加载更多指示器 -->
        <div v-if="infiniteScroll.loading.value && infiniteScroll.items.value.length > 0" 
             class="flex items-center justify-center py-8">
          <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <span class="ml-3 text-gray-600">加载更多...</span>
        </div>

        <!-- 到底了 -->
        <div v-else-if="!infiniteScroll.hasMore.value && infiniteScroll.items.value.length > 0" 
             class="text-center py-8">
          <p class="text-gray-500">已显示全部结果</p>
        </div>

        <!-- 错误状态 -->
        <div v-if="infiniteScroll.error.value" class="text-center py-8">
          <p class="text-red-600 mb-4">{{ infiniteScroll.error.value }}</p>
          <button 
            @click="infiniteScroll.refresh()"
            class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            重试
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useMovieStore } from '../stores/movie';
import { debounce, tmdbAPI } from '../utils/api';
import { STATUS_OPTIONS, TYPE_OPTIONS, getStatusLabel, getTypeLabel, getStatusBadgeClass } from '../utils/constants';
import { fuzzySearch, type SearchResult } from '../utils/search';
import { useInfiniteScroll, type LoadFunction } from '../composables/useInfiniteScroll';
import HeadlessSelect from '../components/ui/HeadlessSelect.vue';
import { 
  Search as SearchIcon,
  Grid3x3 as GridIcon,
  List as ListIcon,
  Star as StarIcon
} from 'lucide-vue-next';
import CachedImage from '../components/ui/CachedImage.vue';

interface MovieRecord {
  id: string;
  title: string;
  original_title?: string;
  type: string;
  status: string;
  user_rating?: number;
  year?: string;
  overview?: string;
  poster_path?: string;
}

const router = useRouter();
const route = useRoute();
const movieStore = useMovieStore();

// 响应式状态
const searchQuery = ref('');
const selectedType = ref('');
const selectedStatus = ref('');
const viewMode = ref<'grid' | 'list'>('grid');
const allMovies = ref<MovieRecord[]>([]);

// 计算过滤后的数据
const filteredItems = computed(() => {
  let results = [...allMovies.value];

  // 按类型筛选
  if (selectedType.value) {
    results = results.filter(movie => movie.type === selectedType.value);
  }

  // 按状态筛选
  if (selectedStatus.value) {
    results = results.filter(movie => movie.status === selectedStatus.value);
  }

  // 模糊搜索
  if (searchQuery.value.trim()) {
    const searchResults = fuzzySearch(results, searchQuery.value, {
      searchFields: ['title', 'original_title'],
      enablePinyin: true,
      minLength: 1
    });
    return searchResults.map(result => result.item);
  }

  return results;
});

// 无限滚动加载函数
const loadMovies: LoadFunction<MovieRecord> = async (page: number, pageSize: number) => {
  try {
    // 如果是第一页，先加载所有数据
    if (page === 1 && allMovies.value.length === 0) {
      const response = await movieStore.fetchMovies();
      if (response?.success) {
        allMovies.value = movieStore.movies;
      }
    }

    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const items = filteredItems.value.slice(startIndex, endIndex);
    const hasMore = endIndex < filteredItems.value.length;

    return {
      data: items,
      hasMore,
      total: filteredItems.value.length
    };
  } catch (error) {
    console.error('加载影视数据失败:', error);
    throw error;
  }
};

// 使用无限滚动
const infiniteScroll = useInfiniteScroll(loadMovies, {
  pageSize: 20,
  threshold: 200,
  immediate: true
});

// 处理搜索输入
const handleSearchInput = debounce(() => {
  infiniteScroll.refresh();
}, 300);

// 处理筛选器变化
const handleFilterChange = () => {
  infiniteScroll.refresh();
};

// 导航到详情页
const navigateToDetail = (movieId: string) => {
  router.push({ name: 'Detail', params: { id: movieId } });
};

// 获取图片URL
const getImageURL = (path: string | undefined) => {
  return tmdbAPI.getImageURL(path, 'w342');
};

// 处理图片错误
const handleImageError = (event: Event) => {
  const img = event.target as HTMLImageElement;
  img.src = '/placeholder-poster.svg';
};

// 监听筛选条件变化
watch([selectedType, selectedStatus], () => {
  infiniteScroll.refresh();
});

// 监听搜索查询变化
watch(searchQuery, () => {
  infiniteScroll.refresh();
});

// 初始化
onMounted(() => {
  // 从查询参数初始化筛选器
  if (route.query.status) {
    selectedStatus.value = route.query.status as string;
  }
  if (route.query.type) {
    selectedType.value = route.query.type as string;
  }
  if (route.query.query) {
    searchQuery.value = route.query.query as string;
  }
});
</script>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style> 