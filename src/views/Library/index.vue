<template>
  <div class="h-full bg-gray-50/50 relative">
    <!-- 头部组件 -->
    <LibraryHeader
      :search-query="searchQuery"
      :selected-type="selectedType"
      :selected-status="selectedStatus"
      :view-mode="viewMode"
      :is-selection-mode="isSelectionMode"
      :selected-count="selectedItems.length"
      :total-count="infiniteScroll.total.value || filteredItems.length"
      :show-search-stats="!infiniteScroll.isEmpty.value && !!searchQuery"
      @change-view-mode="saveViewMode"
      @enable-selection="enableSelectionMode"
      @cancel-selection="cancelSelectionMode"
      @confirm-delete="confirmDelete"
      @update:search-query="updateSearchQuery"
      @update:selected-type="updateSelectedType"
      @update:selected-status="updateSelectedStatus"
    />

    <!-- 内容区域 -->
    <div
      id="scroll-container"
      class="absolute inset-0 pt-0 pb-8 px-8 animate-fade-in-up overflow-y-auto"
      style="animation-delay: 150ms;"
    >
      <div class="max-w-7xl mx-auto pt-48">
        <!-- 状态组件 -->
        <LibraryStates
          :loading="infiniteScroll.loading.value"
          :is-empty="infiniteScroll.isEmpty.value"
          :has-more="infiniteScroll.hasMore.value"
          :item-count="infiniteScroll.items.value.length"
          :error="infiniteScroll.error.value"
          :search-query="searchQuery"
          @retry="infiniteScroll.refresh"
        />

        <!-- 网格视图 -->
        <GridView
          v-if="!infiniteScroll.isEmpty.value && viewMode === 'grid'"
          :movies="infiniteScroll.items.value"
          :is-selection-mode="isSelectionMode"
          :is-item-selected="isItemSelected"
          :get-image-u-r-l="getImageURL"
          @toggle-select="toggleSelectItem"
          @navigate-to-detail="navigateToDetail"
        />

        <!-- 列表视图 -->
        <ListView
          v-else-if="!infiniteScroll.isEmpty.value && viewMode === 'list'"
          :movies="infiniteScroll.items.value"
          :is-selection-mode="isSelectionMode"
          :is-item-selected="isItemSelected"
          :get-image-u-r-l="getImageURL"
          @toggle-select="toggleSelectItem"
          @navigate-to-detail="navigateToDetail"
        />
      </div>
    </div>

    <!-- 删除确认对话框 -->
    <DeleteConfirmDialog
      :show="showDeleteConfirm"
      :selected-count="selectedItems.length"
      :confirm-input="confirmInput"
      @update:confirm-input="confirmInput = $event"
      @cancel="cancelDelete"
      @confirm="executeDelete"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useMovieStore } from '../../stores/movie';
import { useAppStore } from '../../stores/app';
import { debounce, tmdbAPI } from '../../utils/api';
import { fuzzySearch } from '../../utils/search';
import { useInfiniteScroll, type LoadFunction } from '../../composables/useInfiniteScroll';
import StorageService, { StorageKey } from '../../utils/storage';

// 类型定义
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

type ViewMode = 'grid' | 'list';

// 组件导入
import LibraryHeader from './components/LibraryHeader.vue';
import GridView from './components/GridView.vue';
import ListView from './components/ListView.vue';
import LibraryStates from './components/LibraryStates.vue';
import DeleteConfirmDialog from './components/DeleteConfirmDialog.vue';

const router = useRouter();
const route = useRoute();
const movieStore = useMovieStore();
const appStore = useAppStore();

// 状态管理
const searchQuery = ref('');
const selectedType = ref('');
const selectedStatus = ref('');
const viewMode = ref<ViewMode>('grid');
const allMovies = ref<MovieRecord[]>([]);

// 批量选择状态
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

// 使用无限滚动，指定滚动容器
const infiniteScroll = useInfiniteScroll(loadMovies, {
  pageSize: 20,
  threshold: 200,
  immediate: false,
  container: '#scroll-container'
});

// 更新函数
const updateSearchQuery = (value: string) => {
  searchQuery.value = value;
};

const updateSelectedType = (value: string) => {
  selectedType.value = value;
};

const updateSelectedStatus = (value: string) => {
  selectedStatus.value = value;
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

// 优化的批量删除函数
const executeDelete = async () => {
  if (confirmInput.value !== 'y') return;

  if (selectedItems.value.length === 0) {
    appStore.modalService.showInfo('提示', '没有选择任何影视作品');
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