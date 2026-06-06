/**
 * 在线播放进度数据访问对象
 */

import type {
  ApiResponse,
  MoviePlaybackProgress,
  PlaybackProgressPayload,
  DatabaseRow
} from '../../../types';
import { DatabaseConnection } from '../connection';
import { DatabaseUtils } from '../utils';

type MoviePlaybackProgressRow = DatabaseRow & Partial<MoviePlaybackProgress> & {
  completed?: number | boolean | null;
};

const mapRowToProgress = (row: MoviePlaybackProgressRow): MoviePlaybackProgress => ({
  id: String(row.id || ''),
  movieId: String(row.movie_id || row.movieId || ''),
  profileId: row.profile_id == null ? null : String(row.profile_id),
  sourceKey: String(row.source_key || row.sourceKey || ''),
  vodId: row.vod_id == null ? null : String(row.vod_id),
  playGroupName: String(row.play_group_name || row.playGroupName || ''),
  episodeName: String(row.episode_name || row.episodeName || ''),
  episodeUrl: String(row.episode_url || row.episodeUrl || ''),
  positionSeconds: Number(row.position_seconds || row.positionSeconds || 0),
  durationSeconds: Number(row.duration_seconds || row.durationSeconds || 0),
  playbackRate: Number(row.playback_rate || row.playbackRate || 1),
  completed: row.completed === true || Number(row.completed || 0) === 1,
  lastPlayedAt: String(row.last_played_at || row.lastPlayedAt || ''),
  createdAt: String(row.created_at || row.createdAt || ''),
  updatedAt: String(row.updated_at || row.updatedAt || '')
});

export class MoviePlaybackProgressDAO {
  static async getLatestProgressByMovieId(movieId: string): Promise<ApiResponse<MoviePlaybackProgress | null>> {
    try {
      const db = await DatabaseConnection.getInstance();
      const result = await db.select(`
        SELECT * FROM movie_playback_progress
        WHERE movie_id = $1
        ORDER BY datetime(last_played_at) DESC
        LIMIT 1
      `, [movieId]) as MoviePlaybackProgressRow[];

      if (result.length === 0) {
        return { success: true, data: null };
      }

      return { success: true, data: mapRowToProgress(result[0]) };
    } catch (error) {
      return { success: false, error: `获取最近播放进度失败: ${error}` };
    }
  }

  static async getProgressByEpisode(
    movieId: string,
    sourceKey: string,
    episodeUrl: string
  ): Promise<ApiResponse<MoviePlaybackProgress | null>> {
    try {
      const db = await DatabaseConnection.getInstance();
      const result = await db.select(`
        SELECT * FROM movie_playback_progress
        WHERE movie_id = $1 AND source_key = $2 AND episode_url = $3
        LIMIT 1
      `, [movieId, sourceKey, episodeUrl]) as MoviePlaybackProgressRow[];

      if (result.length === 0) {
        return { success: true, data: null };
      }

      return { success: true, data: mapRowToProgress(result[0]) };
    } catch (error) {
      return { success: false, error: `获取剧集播放进度失败: ${error}` };
    }
  }

  static async upsertProgress(payload: PlaybackProgressPayload): Promise<ApiResponse<MoviePlaybackProgress>> {
    try {
      const db = await DatabaseConnection.getInstance();
      const existing = await this.getProgressByEpisode(payload.movieId, payload.sourceKey, payload.episodeUrl);
      const currentTime = new Date().toISOString();

      const normalizedPayload = {
        ...payload,
        positionSeconds: Math.max(0, Number(payload.positionSeconds || 0)),
        durationSeconds: Math.max(0, Number(payload.durationSeconds || 0)),
        playbackRate: Number(payload.playbackRate || 1),
        completed: Boolean(payload.completed)
      };

      if (existing.success && existing.data) {
        await db.execute(`
          UPDATE movie_playback_progress SET
            profile_id = $2,
            vod_id = $3,
            play_group_name = $4,
            episode_name = $5,
            position_seconds = $6,
            duration_seconds = $7,
            playback_rate = $8,
            completed = $9,
            last_played_at = $10,
            updated_at = $11
          WHERE id = $1
        `, [
          existing.data.id,
          normalizedPayload.profileId || null,
          normalizedPayload.vodId || null,
          normalizedPayload.playGroupName,
          normalizedPayload.episodeName,
          normalizedPayload.positionSeconds,
          normalizedPayload.durationSeconds,
          normalizedPayload.playbackRate,
          normalizedPayload.completed ? 1 : 0,
          currentTime,
          currentTime
        ]);

        return {
          success: true,
          data: {
            ...existing.data,
            ...normalizedPayload,
            lastPlayedAt: currentTime,
            updatedAt: currentTime
          }
        };
      }

      const id = await DatabaseUtils.generateUuid();
      await db.execute(`
        INSERT INTO movie_playback_progress (
          id, movie_id, profile_id, source_key, vod_id, play_group_name, episode_name, episode_url,
          position_seconds, duration_seconds, playback_rate, completed, last_played_at, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      `, [
        id,
        normalizedPayload.movieId,
        normalizedPayload.profileId || null,
        normalizedPayload.sourceKey,
        normalizedPayload.vodId || null,
        normalizedPayload.playGroupName,
        normalizedPayload.episodeName,
        normalizedPayload.episodeUrl,
        normalizedPayload.positionSeconds,
        normalizedPayload.durationSeconds,
        normalizedPayload.playbackRate,
        normalizedPayload.completed ? 1 : 0,
        currentTime,
        currentTime,
        currentTime
      ]);

      return {
        success: true,
        data: {
          id,
          ...normalizedPayload,
          lastPlayedAt: currentTime,
          createdAt: currentTime,
          updatedAt: currentTime
        }
      };
    } catch (error) {
      return { success: false, error: `保存播放进度失败: ${error}` };
    }
  }
}
