import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useMovieStore } from '../../../stores/movie';
import { tmdbAPI } from '../../../utils/api';
import { databaseAPI } from '../../../services/database-api';
import { tvReminderService } from '../../../services/reminder';
import type { Movie, Statistics, TVReminderGroup } from '../../../types';
import { getWatchProgressSummary } from '../../../utils/seasonProgress';
import { buildMovieActionItems, type MovieActionItem } from '../../../utils/watchInsights';

interface LoadWatchingOptions {
  silent?: boolean;
}

export function useHomeData() {
  const router = useRouter();
  const movieStore = useMovieStore();

  const loadingStats = ref(true);
  const loadingWatching = ref(true);
  const loadingHistory = ref(true);
  const loadingReminders = ref(true);
  const statsError = ref('');
  const watchingError = ref('');
  const historyError = ref('');
  const reminderError = ref('');

  const statistics = ref<Statistics>({
    total_movies: 0,
    completed_movies: 0,
    average_rating: 0,
    movies_this_month: 0,
    movies_this_year: 0
  });

  const watchingMovies = ref<Movie[]>([]);
  const recentHistory = ref<Movie[]>([]);
  const reminderGroups = ref<TVReminderGroup[]>([]);
  const actionItems = ref<MovieActionItem[]>([]);

  const getMovieImageURL = (path: string | undefined) => {
    return tmdbAPI.getImageURL(path);
  };

  const navigateToDetail = (movieId: string) => {
    router.push(`/detail/${movieId}`);
  };

  const getTotalWatchedEpisodes = (movie: Movie) => getWatchProgressSummary(movie).current;

  const getRelativeDayLabel = (dateStr: string) => {
    const target = new Date(dateStr);
    if (Number.isNaN(target.getTime())) return '';

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffDays = Math.round((target.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));

    if (diffDays === 0) return '今天';
    if (diffDays === 1) return '明天';
    if (diffDays === 2) return '后天';
    if (diffDays > 2) return `还有${diffDays}天`;
    return '';
  };

  const formatReminderDate = (dateStr: string) => {
    const target = new Date(dateStr);
    if (Number.isNaN(target.getTime())) return dateStr;

    const relative = getRelativeDayLabel(dateStr);
    const readableDate = `${target.getMonth() + 1}月${target.getDate()}日`;
    const weekdayMap = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    const weekday = weekdayMap[target.getDay()];

    return `${relative ? relative + ' · ' : ''}${readableDate}（${weekday}）`;
  };

  const formatEpisodeLabel = (season?: number, episode?: number) => {
    const parts = [];
    if (season) {
      parts.push(`第${season}季`);
    }
    if (episode) {
      parts.push(`第${episode}集`);
    }
    return parts.join(' · ') || '新集即将上线';
  };

  const loadStatistics = async () => {
    try {
      loadingStats.value = true;
      statsError.value = '';

      const result = await databaseAPI.getStatistics();
      if (result.success && result.data) {
        statistics.value = result.data;
      } else {
        throw new Error(result.error || '获取统计数据失败');
      }
    } catch (error) {
      console.error('获取统计数据失败:', error);
      statsError.value = error instanceof Error ? error.message : '获取统计数据失败';
    } finally {
      loadingStats.value = false;
    }
  };

  const loadWatchingMovies = async (options: LoadWatchingOptions = {}): Promise<Movie[]> => {
    const { silent = false } = options;
    try {
      if (!silent) {
        loadingWatching.value = true;
      }
      watchingError.value = '';

      const result = await databaseAPI.getMovies('watching');
      if (result.success && result.data) {
        watchingMovies.value = result.data;
        actionItems.value = buildMovieActionItems(result.data, reminderGroups.value.flatMap(group => group.items));
        return result.data;
      }

      throw new Error(result.error || '获取追剧数据失败');
    } catch (error) {
      console.error('获取追剧数据失败:', error);
      watchingError.value = error instanceof Error ? error.message : '获取追剧数据失败';
      actionItems.value = buildMovieActionItems([], reminderGroups.value.flatMap(group => group.items));
      return [];
    } finally {
      if (!silent) {
        loadingWatching.value = false;
      }
    }
  };

  const loadReplayHistory = async () => {
    try {
      loadingHistory.value = true;
      historyError.value = '';

      const result = await databaseAPI.getHistoryMovies(12, 0);
      if (result.success && result.data) {
        recentHistory.value = result.data;
      } else {
        throw new Error(result.error || '获取历史数据失败');
      }
    } catch (error) {
      console.error('获取历史数据失败:', error);
      historyError.value = error instanceof Error ? error.message : '获取历史数据失败';
      recentHistory.value = [];
    } finally {
      loadingHistory.value = false;
    }
  };

  const loadUpdateReminders = async (movies?: Movie[]) => {
    try {
      loadingReminders.value = true;
      reminderError.value = '';

      const result = await tvReminderService.getReminderGroups({ movies });
      if (result.success && result.data) {
        reminderGroups.value = result.data;
        actionItems.value = buildMovieActionItems(watchingMovies.value, result.data.flatMap(group => group.items));
      } else {
        throw new Error(result.error || '获取更新提醒失败');
      }
    } catch (error) {
      console.error('获取更新提醒失败:', error);
      reminderError.value = error instanceof Error ? error.message : '获取更新提醒失败';
      reminderGroups.value = [];
      actionItems.value = buildMovieActionItems(watchingMovies.value);
    } finally {
      loadingReminders.value = false;
    }
  };

  const refreshReminders = async () => {
    const latestWatching = await loadWatchingMovies({ silent: true });
    await loadUpdateReminders(latestWatching);
  };

  const initializeData = async () => {
    try {
      const timeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('数据加载超时')), 10000)
      );

      const watchingPromise = loadWatchingMovies();

      await Promise.race([
        Promise.allSettled([
          loadStatistics(),
          watchingPromise,
          loadReplayHistory(),
          watchingPromise
            .then(data => loadUpdateReminders(data))
            .catch(() => loadUpdateReminders())
        ]),
        timeout
      ]);
    } catch (error) {
      console.error('数据初始化失败:', error);
    }
  };

  return {
    movieStore,
    loadingStats,
    loadingWatching,
    loadingHistory,
    loadingReminders,
    statsError,
    watchingError,
    historyError,
    reminderError,
    statistics,
    watchingMovies,
    recentHistory,
    reminderGroups,
    actionItems,
    getMovieImageURL,
    navigateToDetail,
    getTotalWatchedEpisodes,
    formatReminderDate,
    formatEpisodeLabel,
    loadStatistics,
    loadWatchingMovies,
    loadReplayHistory,
    loadUpdateReminders,
    refreshReminders,
    initializeData
  };
}
