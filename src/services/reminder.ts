/**
 * 电视剧更新提醒服务
 */
import type { ApiResponse, Movie, TVEpisodeReminder, TVReminderGroup } from '../types';
import { databaseAPI } from './database-api';
import { tmdbAPI } from '../utils/api';

interface ReminderOptions {
  days?: number;
  movies?: Movie[];
}

class TVReminderService {
  private defaultRange = 7; // 默认查找未来7天内的更新

  /**
   * 获取用户正在追的电视剧
   */
  private async loadWatchingTVShows(provided?: Movie[]): Promise<Movie[]> {
    if (provided && provided.length > 0) {
      return provided.filter(movie => movie.type === 'tv');
    }

    const result = await databaseAPI.getMovies('watching');
    if (result.success && result.data) {
      return result.data.filter(movie => movie.type === 'tv');
    }

    throw new Error(result.error || '无法加载追剧列表');
  }

  /**
   * 判断播出日期是否在未来N天内
   */
  private isWithinRange(airDate: string, days: number): boolean {
    if (!airDate) return false;

    const target = new Date(airDate);
    if (Number.isNaN(target.getTime())) {
      return false;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const end = new Date(today);
    end.setDate(end.getDate() + days);
    end.setHours(23, 59, 59, 999);

    return target.getTime() >= today.getTime() && target.getTime() <= end.getTime();
  }

  /**
   * 获取未来几天即将更新的剧集
   */
  public async getUpcomingReminders(options: ReminderOptions = {}): Promise<ApiResponse<TVEpisodeReminder[]>> {
    try {
      const days = options.days ?? this.defaultRange;
      const tvShows = await this.loadWatchingTVShows(options.movies);
      const showsWithTmdbId = tvShows.filter(movie => movie.tmdb_id);

      if (showsWithTmdbId.length === 0) {
        return { success: true, data: [] };
      }

      const detailResults = await Promise.allSettled(
        showsWithTmdbId.map(show => tmdbAPI.getTVDetails(show.tmdb_id!))
      );

      const reminders: TVEpisodeReminder[] = [];

      detailResults.forEach((result, index) => {
        const show = showsWithTmdbId[index];
        if (result.status !== 'fulfilled') {
          console.warn('获取电视剧详情失败:', result.reason);
          return;
        }

        if (!result.value.success || !result.value.data) {
          return;
        }

        const nextEpisode = result.value.data.next_episode_to_air;
        if (!nextEpisode || !nextEpisode.air_date) {
          return;
        }

        if (!this.isWithinRange(nextEpisode.air_date, days)) {
          return;
        }

        reminders.push({
          movie_id: show.id,
          tmdb_id: show.tmdb_id,
          title: show.title,
          status: show.status,
          poster_path: show.poster_path,
          air_date: nextEpisode.air_date,
          season_number: nextEpisode.season_number,
          episode_number: nextEpisode.episode_number,
          episode_name: nextEpisode.name,
          overview: nextEpisode.overview,
          still_path: nextEpisode.still_path ?? null
        });
      });

      // 按播出日期排序
      reminders.sort((a, b) => new Date(a.air_date).getTime() - new Date(b.air_date).getTime());

      return { success: true, data: reminders };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message };
    }
  }

  /**
   * 将提醒数据按日期分组
   */
  public async getReminderGroups(options: ReminderOptions = {}): Promise<ApiResponse<TVReminderGroup[]>> {
    const remindersResult = await this.getUpcomingReminders(options);
    if (!remindersResult.success || !remindersResult.data) {
      return { success: false, error: remindersResult.error || '获取提醒失败' };
    }

    const groupsMap = new Map<string, TVEpisodeReminder[]>();
    remindersResult.data.forEach(reminder => {
      const key = reminder.air_date;
      if (!groupsMap.has(key)) {
        groupsMap.set(key, []);
      }
      groupsMap.get(key)!.push(reminder);
    });

    const groups: TVReminderGroup[] = Array.from(groupsMap.entries())
      .map(([date, items]) => ({
        date,
        items: items.sort((a, b) => a.title.localeCompare(b.title, 'zh-CN'))
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return { success: true, data: groups };
  }
}

export const tvReminderService = new TVReminderService();
