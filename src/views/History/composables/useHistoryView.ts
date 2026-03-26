import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { tmdbAPI } from '../../../utils/api';
import type { Movie } from '../../../types';
import { getWatchProgressSummary } from '../../../utils/seasonProgress';

export function useHistoryView(movies: { value: Movie[] }) {
  const router = useRouter();

  const groupedMovies = computed(() => {
    const groups: Record<string, Movie[]> = {};

    movies.value.forEach(movie => {
      const date = new Date(movie.date_updated).toDateString();
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(movie);
    });

    return Object.keys(groups)
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
      .map(date => ({
        date,
        items: groups[date]
      }));
  });

  const navigateToDetail = (id: string) => {
    router.push({ name: 'Detail', params: { id } });
  };

  const getImageURL = (path: string | undefined) => {
    return tmdbAPI.getImageURL(path);
  };

  const getTotalWatchedEpisodes = (movie: Movie) => getWatchProgressSummary(movie).current;
  const getWatchProgress = (movie: Movie) => getWatchProgressSummary(movie).percentage;

  const formatGroupDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return '今天';
    }

    if (date.toDateString() === yesterday.toDateString()) {
      return '昨天';
    }

    const isCurrentYear = date.getFullYear() === today.getFullYear();
    if (isCurrentYear) {
      return date.toLocaleDateString('zh-CN', {
        month: 'long',
        day: 'numeric',
        weekday: 'long'
      });
    }

    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long'
    });
  };

  return {
    groupedMovies,
    navigateToDetail,
    getImageURL,
    getTotalWatchedEpisodes,
    getWatchProgress,
    formatGroupDate
  };
}
