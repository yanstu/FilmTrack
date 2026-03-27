import { computed, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { tmdbAPI } from '../../../utils/api';
import type { Movie } from '../../../types';
import { getWatchProgressSummary } from '../../../utils/seasonProgress';
import { getMovieHistoryDate, parseHistoryDate } from '../../../utils/historyDate';
import { fuzzySearchAsync } from '../../../utils/search';
import type { Option } from '../../../components/ui/types';

const historyTypeOptions: Option[] = [
  { value: '', label: '全部类型' },
  { value: 'movie', label: '电影' },
  { value: 'tv', label: '剧集' }
];

const historyStatusOptions: Option[] = [
  { value: '', label: '全部状态' },
  { value: 'watching', label: '在看' },
  { value: 'completed', label: '看完' },
  { value: 'planned', label: '想看' },
  { value: 'paused', label: '暂停' },
  { value: 'dropped', label: '弃坑' }
];

export function groupMoviesByHistoryDate(movies: Movie[]) {
  const groups: Record<string, Movie[]> = {};

  movies.forEach(movie => {
    const date = getMovieHistoryDate(movie);
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(movie);
  });

  return Object.keys(groups)
    .sort((a, b) => parseHistoryDate(b).getTime() - parseHistoryDate(a).getTime())
    .map(date => ({
      date,
      items: groups[date]
    }));
}

export function useHistoryView(movies: { value: Movie[] }) {
  const router = useRouter();
  const searchQuery = ref('');
  const selectedType = ref('');
  const selectedStatus = ref('');
  const filteredMovies = ref<Movie[]>([]);

  const groupedMovies = computed(() => groupMoviesByHistoryDate(filteredMovies.value));
  const activeFilterCount = computed(() => [
    searchQuery.value.trim(),
    selectedType.value,
    selectedStatus.value
  ].filter(Boolean).length);

  const navigateToDetail = (id: string) => {
    router.push({ name: 'Detail', params: { id } });
  };

  const getImageURL = (path: string | undefined) => {
    return tmdbAPI.getImageURL(path);
  };

  const getTotalWatchedEpisodes = (movie: Movie) => getWatchProgressSummary(movie).current;
  const getWatchProgress = (movie: Movie) => getWatchProgressSummary(movie).percentage;

  const formatGroupDate = (dateString: string) => {
    const date = parseHistoryDate(dateString);
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

  const applyFilters = async () => {
    let result = [...movies.value];

    if (selectedType.value) {
      result = result.filter(movie => movie.type === selectedType.value);
    }

    if (selectedStatus.value) {
      result = result.filter(movie => movie.status === selectedStatus.value);
    }

    const query = searchQuery.value.trim();
    if (!query) {
      filteredMovies.value = result;
      return;
    }

    const searchResults = await fuzzySearchAsync(result, query, {
      searchFields: ['title', 'original_title', 'notes'],
      enablePinyin: true,
      minLength: 1
    });

    filteredMovies.value = searchResults.map(item => item.item);
  };

  const resetFilters = async () => {
    searchQuery.value = '';
    selectedType.value = '';
    selectedStatus.value = '';
    await applyFilters();
  };

  watch(
    movies,
    () => {
      void applyFilters();
    },
    { immediate: true }
  );

  return {
    groupedMovies,
    filteredMovies,
    searchQuery,
    selectedType,
    selectedStatus,
    activeFilterCount,
    historyTypeOptions,
    historyStatusOptions,
    navigateToDetail,
    getImageURL,
    getTotalWatchedEpisodes,
    getWatchProgress,
    formatGroupDate,
    applyFilters,
    resetFilters
  };
}
