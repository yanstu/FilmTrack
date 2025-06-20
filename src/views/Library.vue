<template>
  <div class="h-full bg-gray-50/50 relative">
    <!-- 搜索头部 -->
    <div class="sticky top-0 z-50 px-8 py-6 bg-white/90 backdrop-blur-lg border-b border-gray-200/30 animate-fade-in-down" style="animation-delay: 0ms;">
      <div class="w-full">
        <div class="flex justify-between items-center mb-6">
          <h1 class="text-2xl font-bold text-gray-900">影视库</h1>
          
          <!-- 批量操作按钮 -->
          <div class="flex items-center space-x-3">
            <button
              v-if="!isSelectionMode"
              @click="enableSelectionMode"
              class="flex items-center px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
            >
              <CheckSquare :size="16" class="mr-2" />
              批量操作
            </button>
            
            <div v-else class="flex items-center space-x-3">
              <span class="text-sm text-gray-600">已选择 {{ selectedItems.length }} 项</span>
              
              <button
                @click="confirmDelete"
                class="flex items-center px-3 py-2 rounded-lg bg-red-100 hover:bg-red-200 text-red-700 transition-colors"
                :disabled="selectedItems.length === 0"
              >
                <Trash2 :size="16" class="mr-2" />
                删除所选
              </button>
              
              <button
                @click="cancelSelectionMode"
                class="flex items-center px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
              >
                <X :size="16" class="mr-2" />
                取消
              </button>
            </div>
          </div>
        </div>
        
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
          <div class="flex items-center space-x-3 flex-shrink-0 relative z-50">
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
                @click="saveViewMode('grid')"
                class="p-2 rounded-lg transition-all duration-200"
                :class="viewMode === 'grid' ? 'bg-white shadow-sm' : 'hover:bg-white/50'"
              >
                <GridIcon :size="18" class="text-gray-600" />
              </button>
              <button
                @click="saveViewMode('list')"
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
    <div
      id="scroll-container"
      ref="scrollContainer"
      class="absolute inset-0 pt-0 pb-8 px-8 animate-fade-in-up overflow-y-auto"
      style="animation-delay: 150ms;"
    >
      <div class="max-w-7xl mx-auto pt-48">
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
            class="group"
            :class="{'cursor-pointer': !isSelectionMode}"
            @click="isSelectionMode ? toggleSelectItem(movie.id) : navigateToDetail(movie.id)"
          >
            <div class="relative bg-white/90 rounded-2xl p-4 border border-gray-200/50
                        hover:bg-white hover:border-gray-300/50 transition-colors duration-300
                        hover:shadow-md"
                 :class="{'border-blue-500 bg-blue-50/50': isItemSelected(movie.id)}"
                 style="transform: none; will-change: auto; isolation: auto;">
              
              <!-- 选择框 -->
              <div v-if="isSelectionMode" class="absolute top-2 right-2 z-10">
                <div 
                  class="w-6 h-6 rounded-full flex items-center justify-center"
                  :class="isItemSelected(movie.id) ? 'bg-blue-500' : 'bg-white/80 border border-gray-300'"
                >
                  <CheckIcon v-if="isItemSelected(movie.id)" :size="14" class="text-white" />
                </div>
              </div>
              
              <div class="aspect-[2/3] mb-4 overflow-hidden rounded-xl">
                <CachedImage
                  :src="getImageURL(movie.poster_path)"
                  :alt="movie.title"
                  class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  fallback="/placeholder-poster.svg"
                />
              </div>
              <div class="flex items-start justify-between mb-2">
                <h3 class="font-semibold text-gray-900 line-clamp-2 flex-1 pr-2">{{ movie.title }}</h3>
                <span
                  class="px-2 py-1 rounded-full text-xs font-medium flex-shrink-0"
                  :class="getStatusBadgeClass(movie.status)"
                >
                  {{ getStatusLabel(movie.status) }}
                </span>
              </div>
              <div v-if="movie.user_rating" class="flex items-center space-x-1">
                <StarIcon :size="14" class="text-yellow-400 fill-yellow-400" />
                <span class="text-sm text-gray-600">{{ movie.user_rating }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 列表视图 -->
        <div v-else class="space-y-4">
          <div
            v-for="movie in infiniteScroll.items.value"
            :key="movie.id"
            class="bg-white/90 rounded-2xl p-6 border border-gray-200/50
                   hover:bg-white hover:border-gray-300/50 transition-colors duration-200
                   hover:shadow-md"
            style="transform: none; will-change: auto; isolation: auto;"
            :class="{'cursor-pointer': !isSelectionMode, 'border-blue-500 bg-blue-50/50': isItemSelected(movie.id)}"
            @click="isSelectionMode ? toggleSelectItem(movie.id) : navigateToDetail(movie.id)"
          >
            <div class="flex items-start space-x-4">
              <!-- 选择框 -->
              <div v-if="isSelectionMode" class="flex-shrink-0 pt-2">
                <div 
                  class="w-6 h-6 rounded-full flex items-center justify-center"
                  :class="isItemSelected(movie.id) ? 'bg-blue-500' : 'bg-white/80 border border-gray-300'"
                >
                  <CheckIcon v-if="isItemSelected(movie.id)" :size="14" class="text-white" />
                </div>
              </div>
              
              <div class="overflow-hidden rounded-xl">
                <CachedImage
                  :src="getImageURL(movie.poster_path)"
                  :alt="movie.title"
                  class-name="w-20 h-30 object-cover shadow-sm transition-transform duration-300 hover:scale-110"
                  fallback="/placeholder-poster.svg"
                />
              </div>
              
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
    
    <!-- 删除确认对话框 -->
    <div v-if="showDeleteConfirm" class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div class="bg-white rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl">
        <h3 class="text-xl font-bold text-gray-900 mb-4">确认删除</h3>
        <p class="text-gray-700 mb-6">
          您确定要删除选中的 {{ selectedItems.length }} 个影视作品吗？此操作无法撤销。
        </p>
        <div class="mb-4">
          <input 
            v-model="confirmInput"
            type="text"
            placeholder="输入 y 确认删除"
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div class="flex justify-end space-x-4">
          <button 
            @click="cancelDelete"
            class="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            取消
          </button>
          <button 
            @click="executeDelete"
            :disabled="confirmInput !== 'y'"
            class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            删除
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useMovieStore } from '../stores/movie';
import { debounce, tmdbAPI } from '../utils/api';

import { STATUS_OPTIONS, TYPE_OPTIONS, getStatusLabel, getTypeLabel, getStatusBadgeClass } from '../utils/constants';
import { fuzzySearch } from '../utils/search';
import { useInfiniteScroll, type LoadFunction } from '../composables/useInfiniteScroll';

import HeadlessSelect from '../components/ui/HeadlessSelect.vue';
import { 
  Search as SearchIcon,
  Grid3x3 as GridIcon,
  List as ListIcon,
  Star as StarIcon,
  CheckSquare,
  Trash2,
  X,
  Check as CheckIcon
} from 'lucide-vue-next';
import CachedImage from '../components/ui/CachedImage.vue';
import StorageService, { StorageKey } from '../utils/storage';
import { useAppStore } from '../stores/app';

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
const appStore = useAppStore();

// 响应式状态
const searchQuery = ref('');
const selectedType = ref('');
const selectedStatus = ref('');
const viewMode = ref<'grid' | 'list'>('grid');
const allMovies = ref<MovieRecord[]>([]);

// 批量选择相关状态
const isSelectionMode = ref(false);
const selectedItems = ref<string[]>([]);
const showDeleteConfirm = ref(false);
const confirmInput = ref('');

// 加载视图模式
const loadViewMode = () => {
  const saved = StorageService.get<'grid' | 'list'>(StorageKey.LIBRARY_VIEW_MODE);
  if (saved && ['grid', 'list'].includes(saved)) {
    viewMode.value = saved;
  }
};

// 保存视图模式到存储
const saveViewMode = (mode: 'grid' | 'list') => {
  viewMode.value = mode;
  StorageService.set(StorageKey.LIBRARY_VIEW_MODE, mode);
};

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
    results = searchResults.map(result => result.item);
  }



  return results;
});

// 无限滚动加载函数
const loadMovies: LoadFunction<MovieRecord> = async (page: number, pageSize: number) => {
  try {
    // 如果是第一页，先加载所有数据
    if (page === 1) {
      const response = await movieStore.fetchMovies();
      if (response?.success) {
        allMovies.value = movieStore.movies;
      }
    }

    // 等待 filteredItems 计算完成
    await nextTick();

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

// 滚动容器引用
const scrollContainer = ref<HTMLElement>();

// 使用无限滚动，指定滚动容器
const infiniteScroll = useInfiniteScroll(loadMovies, {
  pageSize: 20,
  threshold: 200,
  immediate: false, // 先不立即加载，等容器准备好
  container: '#scroll-container' // 使用选择器
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
  return tmdbAPI.getImageURL(path);
};

// 启用选择模式
const enableSelectionMode = () => {
  isSelectionMode.value = true;
  selectedItems.value = [];
};

// 取消选择模式
const cancelSelectionMode = () => {
  isSelectionMode.value = false;
  selectedItems.value = [];
};

// 切换选择项
const toggleSelectItem = (id: string) => {
  const index = selectedItems.value.indexOf(id);
  if (index === -1) {
    selectedItems.value.push(id);
  } else {
    selectedItems.value.splice(index, 1);
  }
};

// 检查项目是否被选中
const isItemSelected = (id: string) => {
  return selectedItems.value.includes(id);
};

// 确认删除
const confirmDelete = () => {
  if (selectedItems.value.length === 0) return;
  showDeleteConfirm.value = true;
  confirmInput.value = '';
};

// 取消删除
const cancelDelete = () => {
  showDeleteConfirm.value = false;
  confirmInput.value = '';
};

// 执行删除
const executeDelete = async () => {
  if (confirmInput.value !== 'y') return;
  
  if (selectedItems.value.length === 0) {
    appStore.modalService.showInfo(
      '提示',
      '没有选择任何影视作品'
    );
    return;
  }
  
  try {
    appStore.setLoading(true);
    
    // 记录删除成功的数量
    let successCount = 0;
    let failedCount = 0;
    
    // 添加延迟函数
    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
    
    // 不使用事务，逐个删除选中的项目
    for (const id of selectedItems.value) {
      try {
        const result = await movieStore.deleteMovie(id);
        if (result.success) {
          successCount++;
        } else {
          failedCount++;
          console.error(`删除影视作品 ${id} 失败:`, result.error);
        }
        // 每次删除操作后添加延迟，避免数据库锁定
        await delay(100);
      } catch (error) {
        failedCount++;
        console.error(`删除影视作品 ${id} 出错:`, error);
        // 出错后也添加延迟
        await delay(100);
      }
    }
    
    // 添加额外延迟，确保所有操作完成
    await delay(500);
    
    // 刷新数据
    await movieStore.fetchMovies();
    allMovies.value = movieStore.movies;
    
    // 重置状态
    showDeleteConfirm.value = false;
    cancelSelectionMode();
    infiniteScroll.refresh();
    
    // 显示结果消息
    if (failedCount === 0) {
      appStore.modalService.showInfo(
        '删除成功',
        `已成功删除 ${successCount} 个影视作品`
      );
    } else {
      appStore.modalService.showWarning(
        '部分删除成功',
        `成功删除 ${successCount} 个影视作品，失败 ${failedCount} 个`
      );
    }
  } catch (error) {
    console.error('批量删除失败:', error);
    appStore.modalService.showError(
      '删除失败',
      `删除过程中发生错误: ${error}`
    );
  } finally {
    appStore.setLoading(false);
  }
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
  // 加载保存的视图模式
  loadViewMode();

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

  // 手动触发初始加载
  nextTick(() => {
    infiniteScroll.triggerLoad();
  });
});
</script>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
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
</style>