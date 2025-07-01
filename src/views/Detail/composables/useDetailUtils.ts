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
    if (!movie || movie.type !== 'tv') {
      return {
        current: 0,
        total: 0,
        percentage: 0,
        isCompleted: false
      };
    }

    // 计算累计观看集数
    let totalWatchedEpisodes = 0;
    const totalEpisodes = movie.total_episodes || 0;

    if (movie.seasons_data && movie.current_season) {
      // 使用seasons_data计算累计集数
      const seasons = Object.values(movie.seasons_data)
        .sort((a, b) => a.season_number - b.season_number);

      for (const season of seasons) {
        if (season.season_number < movie.current_season) {
          // 前面的季全部看完
          totalWatchedEpisodes += season.episode_count;
        } else if (season.season_number === movie.current_season) {
          // 当前季看了部分
          totalWatchedEpisodes += movie.current_episode || 0;
          break;
        }
      }
    } else {
      // 回退到传统方式
      totalWatchedEpisodes = movie.current_episode || 0;
    }

    const percentage = totalEpisodes > 0 ? Math.round((totalWatchedEpisodes / totalEpisodes) * 100) : 0;
    return {
      current: totalWatchedEpisodes,
      total: totalEpisodes,
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
