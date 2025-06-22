/**
 * Record 页面搜索逻辑
 */

import { ref, type Ref } from 'vue';
import { useRouter } from 'vue-router';
import { useMovieStore } from '../../../stores/movie';
import { tmdbAPI, debounce } from '../../../utils/api';
import { getYear } from '../../../utils/constants';
import type { TMDbMovie } from '../../../types';
import type { RecordForm, SearchState, DialogState } from '../types';

export function useSearchLogic(
  form: Ref<RecordForm>,
  showDialog: (type: DialogState['type'], title: string, message: string, onConfirm?: () => void) => void
) {
  const router = useRouter();
  const movieStore = useMovieStore();

  // 搜索状态
  const searchState = ref<SearchState>({
    query: '',
    results: [],
    loading: false,
    showTips: false
  });

  // 处理 TMDb 搜索
  const handleTMDbSearch = debounce(async () => {
    if (searchState.value.query.length < 2) {
      searchState.value.results = [];
      searchState.value.loading = false;
      return;
    }

    searchState.value.loading = true;
    try {
      const response = await tmdbAPI.searchMulti(searchState.value.query);
      if (response.success && response.data) {
        searchState.value.results = (response.data.results || [])
          .filter(item => item.media_type === 'movie' || item.media_type === 'tv')
          .slice(0, 20);
      } else {
        console.error('TMDb搜索失败:', response.error);
        searchState.value.results = [];
      }
    } catch (error) {
      console.error('TMDb搜索失败:', error);
      searchState.value.results = [];
    } finally {
      searchState.value.loading = false;
    }
  }, 300);

  // 选择第一个搜索结果
  const selectFirstResult = () => {
    if (searchState.value.results.length > 0) {
      selectTMDbResult(searchState.value.results[0]);
    }
  };

  // 选择 TMDb 搜索结果
  const selectTMDbResult = async (result: TMDbMovie) => {
    try {
      // 获取详细信息
      let detailResponse;
      if (result.media_type === 'movie') {
        detailResponse = await tmdbAPI.getMovieDetails(result.id);
      } else {
        detailResponse = await tmdbAPI.getTVDetails(result.id);
      }
      
      if (!detailResponse.success || !detailResponse.data) {
        throw new Error(detailResponse.error || '获取详情失败');
      }
      
      const detail = detailResponse.data;

      // 更新表单数据
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
        const imageUrl = tmdbAPI.getImageURL(detail.poster_path);
        try {
          // 动态导入并缓存图片
          const { prefetchImages } = await import('../../../utils/imageCache');
          await prefetchImages([imageUrl]);
          console.log('图片已预缓存:', imageUrl);
        } catch (error) {
          console.warn('预缓存图片失败:', error);
        }
      }

      // 清空搜索状态
      searchState.value.query = '';
      searchState.value.results = [];
    } catch (error) {
      console.error('获取详细信息失败:', error);
      showDialog('error', '错误', '获取影视详细信息失败，请重试');
    }
  };

  // 检查是否已添加
  const isAlreadyAdded = (result: TMDbMovie): boolean => {
    return movieStore.movies.some(movie => movie.tmdb_id === result.id);
  };

  // 处理搜索结果点击
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

  // 获取图片 URL
  const getImageURL = (path: string | null): string => {
    return tmdbAPI.getImageURL(path);
  };

  return {
    searchState,
    handleTMDbSearch,
    selectFirstResult,
    selectTMDbResult,
    handleTMDbResultClick,
    isAlreadyAdded,
    getImageURL
  };
}
