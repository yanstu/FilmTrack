/**
 * Detail 页面工具函数
 */

import { computed, type Ref } from 'vue';
import { tmdbAPI } from '../../../utils/api';
import { APP_CONFIG } from '../../../../config/app.config';
import type { DetailState, WatchProgress } from '../types';

export function useDetailUtils(detailState: Ref<DetailState>) {
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
    if (!movie?.current_episode || !movie?.total_episodes) {
      return {
        current: 0,
        total: 0,
        percentage: 0,
        isCompleted: false
      };
    }

    const percentage = Math.round((movie.current_episode / movie.total_episodes) * 100);
    return {
      current: movie.current_episode,
      total: movie.total_episodes,
      percentage,
      isCompleted: percentage >= 100
    };
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

  return {
    getImageURL,
    getBackdropURL,
    watchProgress,
    getWatchProgress,
    getProgressColor,
    formatDate,
    isValidUrl
  };
}
