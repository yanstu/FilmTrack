import { computed, onMounted } from 'vue';
import { useMovieStore } from '../../../stores/movie';
import { useInfiniteScroll } from '../../../composables/useInfiniteScroll';
import { databaseAPI } from '../../../services/database-api';

export function useHistoryData() {
  const movieStore = useMovieStore();
  let cachedTotalCount: number | null = null;

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
      const offset = (page - 1) * pageSize;
      const requests: [
        Promise<Awaited<ReturnType<typeof databaseAPI.getMovies>>>,
        Promise<Awaited<ReturnType<typeof databaseAPI.countMovies>>>?
      ] = [databaseAPI.getMovies(undefined, pageSize, offset)];

      const shouldFetchTotal = cachedTotalCount === null || page === 1;
      if (shouldFetchTotal) {
        requests.push(databaseAPI.countMovies());
      }

      const [moviesResult, totalResult] = await Promise.all(requests);

      if (!moviesResult.success || !moviesResult.data) {
        throw new Error(moviesResult.error || '获取数据失败');
      }

      if (totalResult) {
        if (!totalResult.success || totalResult.data === undefined) {
          throw new Error(totalResult.error || '获取数据总数失败');
        }
        cachedTotalCount = totalResult.data;
      }

      const totalCount = cachedTotalCount ?? moviesResult.data.length;

      return {
        data: moviesResult.data,
        hasMore: offset + pageSize < totalCount,
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
    immediate: false,
    container: '#scroll-container'
  });

  const refresh = async () => {
    cachedTotalCount = null;
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
    refresh
  };
}
