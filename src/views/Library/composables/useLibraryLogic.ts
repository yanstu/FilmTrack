/**
 * 影视库页面业务逻辑
 */

import { ref, computed, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import { useMovieStore } from '../../../stores/movie';
import { debounce, tmdbAPI } from '../../../utils/api';
import { fuzzySearch } from '../../../utils/search';
import { useInfiniteScroll, type LoadFunction } from '../../../composables/useInfiniteScroll';
import StorageService, { StorageKey } from '../../../utils/storage';
import type { MovieRecord, ViewMode, LibraryState, SelectionState } from '../types';

export function useLibraryLogic() {
  const router = useRouter();
  const movieStore = useMovieStore();

  // 状态管理
  const libraryState = ref<LibraryState>({
    searchQuery: '',
    selectedType: '',
    selectedStatus: '',
    viewMode: 'grid',
    allMovies: []
  });

  const selectionState = ref<SelectionState>({
    isSelectionMode: false,
    selectedItems: [],
    showDeleteConfirm: false,
    confirmInput: ''
  });

  // 计算过滤后的数据
  const filteredItems = computed(() => {
    let results = [...libraryState.value.allMovies];

    // 按类型筛选
    if (libraryState.value.selectedType) {
      results = results.filter(movie => movie.type === libraryState.value.selectedType);
    }

    // 按状态筛选
    if (libraryState.value.selectedStatus) {
      results = results.filter(movie => movie.status === libraryState.value.selectedStatus);
    }

    // 模糊搜索
    if (libraryState.value.searchQuery.trim()) {
      const searchResults = fuzzySearch(results, libraryState.value.searchQuery, {
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
          libraryState.value.allMovies = movieStore.movies;
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

  // 使用无限滚动
  const infiniteScroll = useInfiniteScroll(loadMovies, {
    pageSize: 20,
    threshold: 200,
    immediate: false,
    container: '#scroll-container'
  });

  // 搜索和筛选
  const handleSearchInput = debounce(() => {
    infiniteScroll.refresh();
  }, 300);

  const handleFilterChange = () => {
    infiniteScroll.refresh();
  };

  // 视图模式管理
  const loadViewMode = () => {
    const saved = StorageService.get<ViewMode>(StorageKey.LIBRARY_VIEW_MODE);
    if (saved && ['grid', 'list'].includes(saved)) {
      libraryState.value.viewMode = saved;
    }
  };

  const saveViewMode = (mode: ViewMode) => {
    libraryState.value.viewMode = mode;
    StorageService.set(StorageKey.LIBRARY_VIEW_MODE, mode);
  };

  // 导航
  const navigateToDetail = (movieId: string) => {
    router.push({ name: 'Detail', params: { id: movieId } });
  };

  // 工具函数
  const getImageURL = (path: string | undefined) => {
    return tmdbAPI.getImageURL(path);
  };

  return {
    // 状态
    libraryState,
    selectionState,
    filteredItems,
    infiniteScroll,
    
    // 方法
    handleSearchInput,
    handleFilterChange,
    loadViewMode,
    saveViewMode,
    navigateToDetail,
    getImageURL
  };
}
