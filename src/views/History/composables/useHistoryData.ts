import { computed, onMounted } from 'vue';
import { useMovieStore } from '../../../stores/movie';
import { useInfiniteScroll } from '../../../composables/useInfiniteScroll';
import { databaseAPI } from '../../../services/database-api';
import type { Movie } from '../../../types';

export function useHistoryData() {
  const movieStore = useMovieStore();
  let cachedTotalCount: number | null = null;
  let cachedHistoryMovies: Movie[] | null = null;

  const stats = computed(() => {
    const movies = movieStore.movies;
    const completed = movies.filter(movie => movie.status === 'completed');
    const watching = movies.filter(movie => movie.status === 'watching');
    const ratings = movies
      .filter(movie => movie.personal_rating && movie.personal_rating > 0)
      .map(movie => movie.personal_rating!);

    return {
      total: movies.length,
      completed: completed.length,
      watching: watching.length,
      avgRating: ratings.length > 0
        ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length
        : 0
    };
  });

  const loadMoviesPage = async (page: number, pageSize: number) => {
    try {
      if (cachedHistoryMovies === null || page === 1) {
        const historyResult = await databaseAPI.getHistoryMovies();
        if (!historyResult.success || !historyResult.data) {
          throw new Error(historyResult.error || '获取数据失败');
        }

        cachedHistoryMovies = historyResult.data;
        cachedTotalCount = historyResult.data.length;
      }

      const totalCount = cachedTotalCount ?? cachedHistoryMovies?.length ?? 0;
      const pageItems = cachedHistoryMovies || [];

      return {
        data: pageItems,
        hasMore: false,
        total: totalCount
      };
    } catch (error) {
      console.error('加载历史数据失败:', error);
      throw error;
    }
  };

  const infiniteScroll = useInfiniteScroll(loadMoviesPage, {
    pageSize: 20,
    threshold: 200,
    immediate: true,
    container: '#scroll-container'
  });

  const hasInitialized = computed(() =>
    infiniteScroll.currentPage.value > 0 || Boolean(infiniteScroll.error.value)
  );

  const refresh = async () => {
    cachedTotalCount = null;
    cachedHistoryMovies = null;
    await infiniteScroll.refresh();
  };

  onMounted(async () => {
    try {
      await movieStore.fetchMovies();
    } catch (error) {
      console.error('加载统计数据失败:', error);
    }
  });

  return {
    stats,
    ...infiniteScroll,
    hasInitialized,
    refresh
  };
}
