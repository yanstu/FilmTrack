/**
 * Detail 页面数据管理
 */

import { ref, onMounted, type Ref } from 'vue';
import { useRoute } from 'vue-router';
import { useMovieStore } from '../../../stores/movie';
import { tmdbAPI } from '../../../utils/api';
import { removeCachedImages } from '../../../utils/imageCache';
import type { Movie } from '../../../types';
import type { DetailState, DialogState } from '../types';

export function useDetailData(
  showDialog: (type: DialogState['type'], title: string, message: string, onConfirm?: () => void) => void
) {
  const route = useRoute();
  const movieStore = useMovieStore();

  // 状态管理
  const detailState = ref<DetailState>({
    isLoading: true,
    movie: null,
    backdropImages: [],
    currentBackdropIndex: 0
  });

  // 加载背景图片
  const loadBackdropImages = async () => {
    if (!detailState.value.movie?.tmdb_id) return;

    try {
      // 使用API方法获取背景图片
      const images = await tmdbAPI.loadBackdropImages(
        detailState.value.movie.tmdb_id,
        detailState.value.movie.type as 'movie' | 'tv'
      );

      if (images && images.length > 0) {
        detailState.value.backdropImages = images;
      } else if (detailState.value.movie.backdrop_path) {
        // 如果没有剧照，使用默认背景图片
        detailState.value.backdropImages = [detailState.value.movie.backdrop_path];
      }
    } catch (error) {
      if (detailState.value.movie.backdrop_path) {
        detailState.value.backdropImages = [detailState.value.movie.backdrop_path];
      }
    }
  };

  // 更新影视信息
  const updateMovieInfo = async () => {
    if (!detailState.value.movie?.tmdb_id) return;

    try {
      showDialog('info', '更新中', '正在从TMDb获取最新信息...');

      const response = detailState.value.movie.type === 'tv'
        ? await tmdbAPI.getTVDetails(detailState.value.movie.tmdb_id)
        : await tmdbAPI.getMovieDetails(detailState.value.movie.tmdb_id);

      if (!response.success || !response.data) {
        throw new Error(response.error || '获取数据失败');
      }

      const details = response.data;

      const updatedMovie = {
        ...detailState.value.movie,
        title: details.title || details.name,
        overview: details.overview,
        poster_path: details.poster_path,
        backdrop_path: details.backdrop_path,
        tmdb_rating: details.vote_average,
        total_episodes: (details as any).number_of_episodes,
        total_seasons: (details as any).number_of_seasons,
        air_status: (details as any).status,
        updated_at: new Date().toISOString()
      };

      await movieStore.updateMovie(updatedMovie);
      detailState.value.movie = updatedMovie;

      // 清除旧的背景图片缓存
      const oldBackdropImages = detailState.value.backdropImages || [];
      if (oldBackdropImages.length > 0) {
        // 构建完整的图片URL用于清除缓存
        const imageUrlsToRemove = oldBackdropImages.map(path => {
          if (path.startsWith('http')) {
            return path;
          }
          return `https://image.tmdb.org/t/p/original${path}`;
        });
        
        try {
          await removeCachedImages(imageUrlsToRemove);
          console.log('已清除旧的背景图片缓存');
        } catch (error) {
          console.warn('清除背景图片缓存失败:', error);
        }
      }

      // 重新加载背景图片
      await loadBackdropImages();

      showDialog('success', '更新成功', '影视信息已更新');
    } catch (error) {
      console.error('更新失败:', error);
      showDialog('error', '更新失败', '获取最新信息失败，请重试');
    }
  };

  // 保存记录
  const handleSaveRecord = async (updatedMovie: Movie) => {
    try {
      updatedMovie.updated_at = new Date().toISOString();
      await movieStore.updateMovie(updatedMovie);
      detailState.value.movie = { ...updatedMovie };
      showDialog('success', '保存成功', '记录已更新');
    } catch (error) {
      console.error('保存失败:', error);
      showDialog('error', '保存失败', '保存失败，请重试');
    }
  };

  // 初始化数据
  const initializeData = async () => {
    const movieId = route.params.id as string;

    try {
      detailState.value.isLoading = true;

      // 直接从数据库获取电影信息，确保数据完整
      const result = await movieStore.fetchMovieDetail(movieId);
      if (result.success && movieStore.currentMovie) {
        detailState.value.movie = movieStore.currentMovie;

        // 确保必需字段有默认值
        if (detailState.value.movie.status === undefined || detailState.value.movie.status === null) {
          detailState.value.movie.status = 'planned';
        }
        if (detailState.value.movie.personal_rating === undefined || detailState.value.movie.personal_rating === null) {
          detailState.value.movie.personal_rating = 0;
        }
        if (detailState.value.movie.current_season === undefined || detailState.value.movie.current_season === null) {
          detailState.value.movie.current_season = 1;
        }
        if (detailState.value.movie.current_episode === undefined || detailState.value.movie.current_episode === null) {
          detailState.value.movie.current_episode = 0;
        }
        if (detailState.value.movie.watch_source === undefined || detailState.value.movie.watch_source === null) {
          detailState.value.movie.watch_source = '';
        }
        if (detailState.value.movie.notes === undefined || detailState.value.movie.notes === null) {
          detailState.value.movie.notes = '';
        }

        // 加载背景图片
        await loadBackdropImages();
      } else {
        detailState.value.movie = null;
      }
    } catch (error) {
      console.error('加载电影详情失败:', error);
    } finally {
      detailState.value.isLoading = false;
    }
  };

  // 初始化
  onMounted(initializeData);

  return {
    detailState,
    updateMovieInfo,
    handleSaveRecord,
    loadBackdropImages
  };
}
