/**
 * Detail 页面操作逻辑
 */

import { nextTick, type Ref } from 'vue';
import { useRouter } from 'vue-router';
import { useMovieStore } from '../../../stores/movie';
import { useAppStore } from '../../../stores/app';
import { openUrl } from '@tauri-apps/plugin-opener';
import type { Movie } from '../../../types';
import type { DetailState, DialogState } from '../types';

export function useDetailActions(
  detailState: Ref<DetailState>,
  showDialog: (type: DialogState['type'], title: string, message: string, onConfirm?: () => void) => void
) {
  const router = useRouter();
  const movieStore = useMovieStore();
  const appStore = useAppStore();

  // 导航操作
  const goBack = () => {
    router.go(-1);
  };

  // 内容操作
  const copyTitle = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      appStore.modalService.showInfo('复制成功', `已复制"${text}"到剪贴板`);
    }).catch(err => {
      console.error('复制失败:', err);
      appStore.modalService.showError('复制失败', '无法复制到剪贴板');
    });
  };

  const openExternalLink = (url: string) => {
    openUrl(url);
  };

  // 记录操作
  const markEpisodeWatched = async () => {
    if (!detailState.value.movie || detailState.value.movie.type !== 'tv') return;

    try {
      const movie = detailState.value.movie;
      const currentEpisode = movie.current_episode || 0;
      const currentSeason = movie.current_season || 1;

      // 获取当前季的最大集数
      let currentSeasonMaxEpisodes = movie.total_episodes || 0;
      if (movie.seasons_data && movie.seasons_data[currentSeason.toString()]) {
        currentSeasonMaxEpisodes = movie.seasons_data[currentSeason.toString()].episode_count;
      }

      // 检查是否已经是当前季的最后一集
      if (currentEpisode >= currentSeasonMaxEpisodes) {
        showDialog('info', '提示', '当前季已看完，请切换到下一季或编辑记录');
        return;
      }

      const newCurrentEpisode = currentEpisode + 1;
      const totalEpisodes = movie.total_episodes || 0;

      // 确保更新的对象包含所有必要的字段，并且格式与数据库期待的一致
      const updatedMovie: Movie = {
        ...movie,
        current_episode: newCurrentEpisode,
        date_updated: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // 计算累计观看集数来判断是否全剧看完
      let totalWatchedEpisodes = 0;
      if (movie.seasons_data) {
        const seasons = Object.values(movie.seasons_data)
          .sort((a, b) => a.season_number - b.season_number);

        for (const season of seasons) {
          if (season.season_number < currentSeason) {
            totalWatchedEpisodes += season.episode_count;
          } else if (season.season_number === currentSeason) {
            totalWatchedEpisodes += newCurrentEpisode;
            break;
          }
        }
      } else {
        totalWatchedEpisodes = newCurrentEpisode;
      }

      // 如果看到最后一集，将状态改为已看
      if (totalWatchedEpisodes >= totalEpisodes && totalEpisodes > 0) {
        updatedMovie.status = 'completed';
        showDialog('success', '恭喜完结！', `《${movie.title}》已全部看完，状态已更新为"已看"`);
      } else if (newCurrentEpisode >= currentSeasonMaxEpisodes) {
        showDialog('success', '当前季看完！', `第${currentSeason}季已看完，共${currentSeasonMaxEpisodes}集`);
      } else {
        showDialog('success', '成功', `已标记第${currentSeason}季第${newCurrentEpisode}集为已观看`);
      }

      const result = await movieStore.updateMovie(updatedMovie);

      if (result.success) {
        // 更新本地状态
        detailState.value.movie = { ...updatedMovie };
      } else {
        throw new Error(result.error || '更新失败');
      }
    } catch (error: any) {
      console.error('更新失败:', error);
      showDialog('error', '更新失败', `更新失败：${error.message || error}`);
    }
  };

  const deleteRecord = async () => {
    if (!detailState.value.movie) return;

    showDialog('confirm', '确认删除', `确定要删除《${detailState.value.movie.title}》的记录吗？此操作不可撤销。`, async () => {
      try {
        await movieStore.deleteMovie(detailState.value.movie!.id);
        router.push('/');
      } catch (error) {
        console.error('删除失败:', error);
        showDialog('error', '删除失败', '删除失败，请重试');
      }
    });
  };

  return {
    goBack,
    copyTitle,
    openExternalLink,
    markEpisodeWatched,
    deleteRecord
  };
}
