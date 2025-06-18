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
              placeholder="搜索影视作品标题..."
              class="w-full pl-12 pr-4 py-3 rounded-xl bg-white/80 backdrop-blur-sm 
                     border border-gray-200/50 text-gray-900 placeholder-gray-500
                     focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100
                     hover:border-gray-300/70 hover:bg-white/90 transition-all duration-200"
              @input="handleSearch"
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
                @update:modelValue="handleSearch"
              />
        </div>

            <!-- 状态筛选 -->
            <div class="w-32">
              <HeadlessSelect
                v-model="selectedStatus"
                :options="STATUS_OPTIONS"
                placeholder="状态"
                @update:modelValue="handleSearch"
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
      </div>
    </div>

    <!-- 搜索结果 -->
    <div class="p-8">
      <div class="max-w-7xl mx-auto">
        <div v-if="loading" class="flex items-center justify-center h-64">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>

        <div v-else-if="searchResults.length === 0" class="text-center py-16">
          <SearchIcon :size="48" class="mx-auto text-gray-400 mb-4" />
                      <p class="text-gray-600 text-lg">{{ searchQuery ? '未找到相关影视作品' : '输入关键词开始搜索' }}</p>
            <p class="text-gray-500 text-sm mt-2">{{ searchQuery ? '尝试使用不同的关键词' : '搜索您的影视库' }}</p>
      </div>

        <!-- 网格视图 -->
        <div v-else-if="viewMode === 'grid'" class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          <div
            v-for="movie in searchResults"
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
            v-for="movie in searchResults"
            :key="movie.id"
            class="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-200/50 
                   hover:bg-white/90 hover:border-gray-300/50 transition-all duration-200 
                   hover:shadow-lg hover:shadow-blue-500/5 cursor-pointer"
            @click="navigateToDetail(movie.id)"
          >
            <div class="flex items-start space-x-4">
              <img
                :src="getImageURL(movie.poster_path)"
                :alt="movie.title"
                class="w-20 h-30 object-cover rounded-xl shadow-sm"
                @error="handleImageError"
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
                        <span class="text-sm text-gray-600">{{ movie.user_rating }}/10</span>
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
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useMovieStore } from '../stores/movie';
import { debounce } from '../utils/api';
import { STATUS_OPTIONS, TYPE_OPTIONS, getStatusLabel, getTypeLabel, getStatusBadgeClass, getImageURL } from '../utils/constants';
import HeadlessSelect from '../components/ui/HeadlessSelect.vue';
import { 
  Search as SearchIcon,
  Grid3x3 as GridIcon,
  List as ListIcon,
  Star as StarIcon
} from 'lucide-vue-next';

const router = useRouter();
const route = useRoute();
const movieStore = useMovieStore();

// 响应式状态
const loading = ref(false);
const searchQuery = ref('');
const selectedType = ref('');
const selectedStatus = ref('');
const viewMode = ref<'grid' | 'list'>('grid');
const searchResults = ref<any[]>([]);
const allMovies = ref<any[]>([]);

// 方法
const handleSearch = debounce(async () => {
  loading.value = true;
  
  try {
    let results = [...allMovies.value];

    // 按标题搜索
    if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase();
      results = results.filter(movie => 
      movie.title.toLowerCase().includes(query) ||
      (movie.original_title && movie.original_title.toLowerCase().includes(query))
    );
  }

    // 按类型筛选
    if (selectedType.value) {
      results = results.filter(movie => movie.type === selectedType.value);
  }

    // 按状态筛选
    if (selectedStatus.value) {
      results = results.filter(movie => movie.status === selectedStatus.value);
  }
    
    searchResults.value = results;
  } catch (error) {
    console.error('搜索失败:', error);
  } finally {
    loading.value = false;
  }
}, 300);

const loadAllMovies = async () => {
  try {
    loading.value = true;
    const response = await movieStore.fetchMovies();
    if (response?.success) {
      allMovies.value = movieStore.movies;
      searchResults.value = movieStore.movies;
    }
  } catch (error) {
    console.error('加载影视数据失败:', error);
  } finally {
    loading.value = false;
  }
};

const navigateToDetail = (movieId: string) => {
  router.push({ name: 'Detail', params: { id: movieId } });
};

const handleImageError = () => {
  // 处理图片加载错误
};

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
  
  loadAllMovies();
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