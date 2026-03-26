/**
 * 观看历史数据访问对象
 * 提供观看历史数据的CRUD操作
 * @author yanstu
 */

import type { ApiResponse, ReplayRecord, ReplayRecordForm, DatabaseRow } from '../../../types';
import { DatabaseConnection } from '../connection'
import { DatabaseUtils } from '../utils'

type ReplayRecordRow = DatabaseRow & Partial<ReplayRecord> & {
  title?: string
  poster_path?: string | null
  type?: 'movie' | 'tv'
  count?: number
}

/**
 * 观看历史数据访问对象
 */
export class ReplayRecordDAO {
  /**
   * 获取指定电影的观看历史
   * @param movieId 电影ID
   * @param limit 限制数量
   * @param offset 偏移量
   */
  static async getReplayRecordsByMovieId(
    movieId: string,
    limit?: number,
    offset?: number
  ): Promise<ApiResponse<ReplayRecord[]>> {
    try {
      const db = await DatabaseConnection.getInstance()
      
      let query = 'SELECT * FROM replay_records WHERE movie_id = $1 ORDER BY watch_date DESC'
      const params: unknown[] = [movieId]
      
      if (limit) {
        query += ' LIMIT $2'
        params.push(limit)
        
        if (offset) {
          query += ' OFFSET $3'
          params.push(offset)
        }
      }
      
      const result = await db.select(query, params) as ReplayRecordRow[]
      
      const replayRecords: ReplayRecord[] = result.map((row) => ({
        ...row,
        // 兼容性字段映射
        watched_date: row.watch_date,
        episode_number: row.episode,
        season_number: row.season,
        timestamp: row.created_at,
        status: 'completed' // 默认状态
      } as ReplayRecord))
      
      return { success: true, data: replayRecords }
    } catch (error) {
      return { success: false, error: `获取观看历史失败: ${error}` }
    }
  }

  /**
   * 获取所有观看历史（按时间倒序）
   * @param limit 限制数量
   * @param offset 偏移量
   */
  static async getAllReplayRecords(
    limit?: number,
    offset?: number
  ): Promise<ApiResponse<ReplayRecord[]>> {
    try {
      const db = await DatabaseConnection.getInstance()
      
      let query = `
        SELECT wh.*, m.title, m.poster_path, m.type
        FROM replay_records wh
        LEFT JOIN movies m ON wh.movie_id = m.id
        ORDER BY wh.watch_date DESC
      `
      const params: unknown[] = []
      
      if (limit) {
        query += ' LIMIT $1'
        params.push(limit)
        
        if (offset) {
          query += ' OFFSET $2'
          params.push(offset)
        }
      }
      
      const result = await db.select(query, params) as ReplayRecordRow[]
      
      const replayRecords: ReplayRecord[] = result.map((row) => ({
        id: row.id,
        movie_id: row.movie_id,
        watch_date: row.watch_date,
        watched_date: row.watch_date, // 兼容性字段
        episode: row.episode,
        episode_number: row.episode, // 兼容性字段
        season: row.season,
        season_number: row.season,
        duration: row.duration,
        progress: row.progress,
        rating: row.rating,
        notes: row.notes,
        created_at: row.created_at,
        updated_at: row.updated_at,
        timestamp: row.created_at, // 兼容性字段
        status: 'completed', // 默认状态
        // 关联的电影信息
        movie: row.title ? {
          id: row.movie_id,
          title: row.title,
          poster_path: row.poster_path,
          type: row.type
        } : undefined
      } as ReplayRecord))
      
      return { success: true, data: replayRecords }
    } catch (error) {
      return { success: false, error: `获取观看历史失败: ${error}` }
    }
  }

  /**
   * 添加观看历史记录
   * @param replayRecordForm 重刷记录表单数据
   */
  static async addReplayRecord(replayRecordForm: ReplayRecordForm): Promise<ApiResponse<ReplayRecord>> {
    try {
      const db = await DatabaseConnection.getInstance()
      const id = await DatabaseUtils.generateUuid()
      const currentTime = new Date().toISOString()
      
      const replayRecord: ReplayRecord = {
        id,
        movie_id: replayRecordForm.movie_id,
        watch_date: replayRecordForm.watch_date,
        watched_date: replayRecordForm.watch_date, // 兼容性字段
        episode: replayRecordForm.episode,
        episode_number: replayRecordForm.episode, // 兼容性字段
        season: replayRecordForm.season,
        duration: replayRecordForm.duration,
        progress: replayRecordForm.progress,
        rating: replayRecordForm.rating,
        notes: replayRecordForm.notes,
        created_at: currentTime,
        updated_at: currentTime,
        timestamp: currentTime, // 兼容性字段
        status: 'completed' // 默认状态
      }
      
      await db.execute(`
        INSERT INTO replay_records (
          id, movie_id, watch_date, episode, season, 
          duration, progress, rating, notes, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `, [
        replayRecord.id,
        replayRecord.movie_id,
        replayRecord.watch_date,
        replayRecord.episode,
        replayRecord.season,
        replayRecord.duration,
        replayRecord.progress,
        replayRecord.rating,
        replayRecord.notes,
        replayRecord.created_at,
        replayRecord.updated_at
      ])
      
      // 更新电影的观看次数和最后观看时间
      await this.updateMovieWatchInfo(replayRecord.movie_id, replayRecord.watch_date)
      
      return { success: true, data: replayRecord }
    } catch (error) {
      return { success: false, error: `添加观看历史失败: ${error}` }
    }
  }

  /**
   * 更新观看历史记录
   * @param replayRecord 重刷记录数据
   */
  static async updateReplayRecord(replayRecord: ReplayRecord): Promise<ApiResponse<ReplayRecord>> {
    try {
      const db = await DatabaseConnection.getInstance()
      const currentTime = new Date().toISOString()
      
      await db.execute(`
        UPDATE replay_records SET
          watch_date = $2,
          episode = $3,
          season = $4,
          duration = $5,
          progress = $6,
          rating = $7,
          notes = $8,
          updated_at = $9
        WHERE id = $1
      `, [
        replayRecord.id,
        replayRecord.watch_date,
        replayRecord.episode,
        replayRecord.season,
        replayRecord.duration,
        replayRecord.progress,
        replayRecord.rating,
        replayRecord.notes,
        currentTime
      ])
      
      // 更新电影的最后重刷时间（如果这是最新的观看记录）
      await this.updateMovieWatchInfo(replayRecord.movie_id, replayRecord.watch_date)
      
      const updatedReplayRecord = { ...replayRecord, updated_at: currentTime }
      return { success: true, data: updatedReplayRecord }
    } catch (error) {
      return { success: false, error: `更新观看历史失败: ${error}` }
    }
  }

  /**
   * 删除观看历史记录
   * @param id 观看历史ID
   */
  static async deleteReplayRecord(id: string): Promise<ApiResponse<string>> {
    try {
      const db = await DatabaseConnection.getInstance()
      
      // 先获取要删除的记录信息
      const result = await db.select('SELECT movie_id FROM replay_records WHERE id = $1', [id]) as ReplayRecordRow[]
      if (result.length === 0) {
        return { success: false, error: '观看历史记录不存在' }
      }
      
      const movieId = result[0].movie_id as string
      
      // 删除记录
      await db.execute('DELETE FROM replay_records WHERE id = $1', [id])
      
      // 重新计算电影的观看次数和最后观看时间
      await this.recalculateMovieWatchInfo(movieId)
      
      return { success: true, data: id }
    } catch (error) {
      return { success: false, error: `删除观看历史失败: ${error}` }
    }
  }

  /**
   * 根据ID获取观看历史记录
   * @param id 观看历史ID
   */
  static async getReplayRecordById(id: string): Promise<ApiResponse<ReplayRecord | null>> {
    try {
      const db = await DatabaseConnection.getInstance()
      const result = await db.select('SELECT * FROM replay_records WHERE id = $1', [id]) as ReplayRecordRow[]
      
      if (result.length === 0) {
        return { success: true, data: null }
      }
      
      const row = result[0]
      const replayRecord: ReplayRecord = {
        ...row,
        watched_date: row.watch_date,
        episode_number: row.episode,
        season_number: row.season,
        timestamp: row.created_at,
        status: 'completed'
      } as ReplayRecord
      
      return { success: true, data: replayRecord }
    } catch (error) {
      return { success: false, error: `获取观看历史详情失败: ${error}` }
    }
  }

  /**
   * 获取电影的观看次数
   * @param movieId 电影ID
   */
  static async getWatchCount(movieId: string): Promise<number> {
    try {
      const db = await DatabaseConnection.getInstance()
      const result = await db.select(
        'SELECT COUNT(*) as count FROM replay_records WHERE movie_id = $1',
        [movieId]
      ) as ReplayRecordRow[]
      
      return Number(result[0]?.count || 0)
    } catch (error) {
      console.error('获取观看次数失败:', error)
      return 0
    }
  }

  /**
   * 更新电影的观看信息（观看次数和最后观看时间）
   * @param movieId 电影ID
   * @param watchDate 观看时间
   */
  private static async updateMovieWatchInfo(movieId: string, watchDate: string): Promise<void> {
    try {
      const db = await DatabaseConnection.getInstance()
      
      // 获取观看次数
      const watchCount = await this.getWatchCount(movieId)
      
      const currentTime = new Date().toISOString()
      
      // 更新电影表（不再更新watched_date字段）
      await db.execute(`
        UPDATE movies SET
          watch_count = $2,
          updated_at = $3
        WHERE id = $1
      `, [movieId, watchCount, currentTime])
    } catch (error) {
      console.error('更新电影观看信息失败:', error)
    }
  }

  /**
   * 重新计算电影的观看信息（用于删除记录后）
   * @param movieId 电影ID
   */
  private static async recalculateMovieWatchInfo(movieId: string): Promise<void> {
    try {
      const db = await DatabaseConnection.getInstance()
      
      // 获取观看次数和最新观看时间
      const result = await db.select(`
        SELECT COUNT(*) as count
        FROM replay_records 
        WHERE movie_id = $1
      `, [movieId]) as ReplayRecordRow[]
      
      const watchCount = Number(result[0]?.count || 0)
      const currentTime = new Date().toISOString()
      
      // 更新电影表（不再更新watched_date字段）
      await db.execute(`
        UPDATE movies SET
          watch_count = $2,
          updated_at = $3
        WHERE id = $1
      `, [movieId, watchCount, currentTime])
    } catch (error) {
      console.error('重新计算电影观看信息失败:', error)
    }
  }
}
