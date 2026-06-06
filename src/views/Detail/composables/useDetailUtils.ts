/**
 * Detail 页面工具函数
 */

import { computed, ref, watch, type Ref } from 'vue';
import { tmdbAPI } from '../../../utils/api';
import { APP_CONFIG } from '../../../../config/app.config';
import type { DetailState, WatchProgress } from '../types';
import { getWatchProgressSummary } from '../../../utils/seasonProgress';
import { useMovieStore } from '../../../stores/movie';
import type { ReplayRecord } from '../../../types';
import { buildWatchTimeline } from '../../../utils/watchInsights';

export function useDetailUtils(detailState: Ref<DetailState>) {
  const movieStore = useMovieStore();
  const replayRecords = ref<ReplayRecord[]>([]);

  // 获取图片URL
  const getImageURL = (path: string | undefined) => {
    return tmdbAPI.getImageURL(path);
  };

  // 获取高分辨率背景图片URL
  const getBackdropURL = (path: string | undefined) => {
    if (!path) return '';
    return `${APP_CONFIG.tmdb.imageBaseUrl}/w1280${path}`;
  };

  // 计算观看进度
  const watchProgress = computed<WatchProgress>(() => {
    const movie = detailState.value.movie;
    if (!movie || movie.type !== 'tv') {
      return {
        current: 0,
        total: 0,
        percentage: 0,
        isCompleted: false
      };
    }
    return getWatchProgressSummary(movie);
  });

  const watchTimeline = computed(() => {
    const movie = detailState.value.movie;
    if (!movie) {
      return [];
    }

    return buildWatchTimeline(movie, replayRecords.value);
  });

  // 获取观看进度百分比
  const getWatchProgress = () => {
    return watchProgress.value.percentage;
  };

  // 获取进度条颜色
  const getProgressColor = (progress: number) => {
    if (progress < 25) return 'bg-red-500';
    if (progress < 50) return 'bg-orange-500';
    if (progress < 75) return 'bg-yellow-500';
    if (progress < 100) return 'bg-blue-500';
    return 'bg-green-500';
  };

  // 格式化日期
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN');
  };

  // 验证URL
  const isValidUrl = (string: string) => {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  };

  watch(
    () => detailState.value.movie?.id,
    async movieId => {
      if (!movieId) {
        replayRecords.value = [];
        return;
      }

      const response = await movieStore.getMovieReplayRecords(movieId);
      replayRecords.value = response.success && response.data ? response.data : [];
    },
    { immediate: true }
  );

  return {
    getImageURL,
    getBackdropURL,
    watchProgress,
    watchTimeline,
    getWatchProgress,
    getProgressColor,
    formatDate,
    isValidUrl
  };
}
