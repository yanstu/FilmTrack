/**
 * 电影数据访问对象
 * 提供电影数据的CRUD操作
 * @author yanstu
 */

import type { ApiResponse, Movie, SeasonsData, DatabaseRow } from '../../../types'
import { DatabaseConnection } from '../connection'
import { DatabaseUtils } from '../utils'
import { normalizeProgressForStatus } from '../../../utils/seasonProgress'

type MovieRow = DatabaseRow & Partial<Movie> & {
  genres?: string | null
  tags?: string | null
  seasons_data?: string | null
  date_updated?: string | null
  history_date?: string | null
}

/**
 * 电影数据访问对象
 */
export class MovieDAO {
  /**
   * 获取电影总数
   * @param status 可选状态筛选
   */
  static async countMovies(status?: string): Promise<ApiResponse<number>> {
    try {
      const db = await DatabaseConnection.getInstance()
      const query = status
        ? 'SELECT COUNT(*) as count FROM movies WHERE status = $1'
        : 'SELECT COUNT(*) as count FROM movies'
      const params = status ? [status] : []
      const result = await db.select(query, params) as DatabaseRow[]

      return {
        success: true,
        data: Number(result[0]?.count ?? 0)
      }
    } catch (error) {
      return { success: false, error: `获取电影数量失败: ${error}` }
    }
  }

  /**
   * 检查电影是否已存在
   * 优先使用 tmdb_id，其次回退到标题精确匹配
   */
  static async existsMovie(
    title: string,
    externalId?: string | number
  ): Promise<ApiResponse<{ exists: boolean }>> {
    try {
      const db = await DatabaseConnection.getInstance()
      const normalizedTitle = title.trim()
      const normalizedExternalId = this.normalizeExternalId(externalId)
      const conditions: string[] = []
      const params: Array<string | number> = []

      if (normalizedExternalId !== null) {
        params.push(normalizedExternalId)
        conditions.push(`tmdb_id = $${params.length}`)
      }

      if (normalizedTitle) {
        params.push(normalizedTitle)
        conditions.push(`title = $${params.length}`)
      }

      if (conditions.length === 0) {
        return { success: true, data: { exists: false } }
      }

      const result = await db.select(
        `SELECT 1 as matched FROM movies WHERE ${conditions.join(' OR ')} LIMIT 1`,
        params
      ) as Array<{ matched: number }>

      return { success: true, data: { exists: result.length > 0 } }
    } catch (error) {
      return { success: false, error: `检查电影是否存在失败: ${error}` }
    }
  }

  /**
   * 获取电影列表
   * @param status 筛选状态
   * @param limit 限制数量
   * @param offset 偏移量
   */
  static async getMovies(
    status?: string, 
    limit?: number, 
    offset?: number
  ): Promise<ApiResponse<Movie[]>> {
    try {
      const db = await DatabaseConnection.getInstance()
      
      let query = 'SELECT * FROM movies'
      const params: unknown[] = []
      
      if (status) {
        query += ' WHERE status = $1'
        params.push(status)
      }
      
      // 统一排序：按最后更新时间降序排列
      query += ' ORDER BY date_updated DESC'
      
      if (limit) {
        const limitParam = status ? '$2' : '$1'
        query += ` LIMIT ${limitParam}`
        params.push(limit)
        
        if (offset) {
          const offsetParam = status ? '$3' : '$2'
          query += ` OFFSET ${offsetParam}`
          params.push(offset)
        }
      }
      
      const result = await db.select(query, params) as MovieRow[]
      
      // 解析JSON字段
      const movies: Movie[] = result.map((row) => ({
        ...row,
        genres: DatabaseUtils.parseJsonField<string[]>(row.genres),
        tags: DatabaseUtils.parseJsonField<string[]>(row.tags),
        seasons_data: DatabaseUtils.parseJsonField<SeasonsData>(row.seasons_data)
      } as Movie))
      
      return { success: true, data: movies }
    } catch (error) {
      return { success: false, error: `获取电影列表失败: ${error}` }
    }
  }

  /**
   * 获取历史列表
   * 按观看时间优先排序，回退到首次加入时间和更新时间
   */
  static async getHistoryMovies(
    limit?: number,
    offset?: number
  ): Promise<ApiResponse<Movie[]>> {
    try {
      const db = await DatabaseConnection.getInstance()
      let query = `
        SELECT *,
          COALESCE(
            NULLIF(substr(watched_date, 1, 10), ''),
            NULLIF(substr(date_added, 1, 10), ''),
            NULLIF(substr(date_updated, 1, 10), '')
          ) as history_date
        FROM movies
        ORDER BY history_date DESC, date_updated DESC
      `
      const params: unknown[] = []

      if (limit) {
        query += ` LIMIT $${params.length + 1}`
        params.push(limit)

        if (offset) {
          query += ` OFFSET $${params.length + 1}`
          params.push(offset)
        }
      }

      const result = await db.select(query, params) as MovieRow[]
      const movies: Movie[] = result.map((row) => ({
        ...row,
        watched_date: row.watched_date || row.history_date || row.date_added || row.date_updated || null,
        genres: DatabaseUtils.parseJsonField<string[]>(row.genres),
        tags: DatabaseUtils.parseJsonField<string[]>(row.tags),
        seasons_data: DatabaseUtils.parseJsonField<SeasonsData>(row.seasons_data)
      } as Movie))

      return { success: true, data: movies }
    } catch (error) {
      return { success: false, error: `获取历史列表失败: ${error}` }
    }
  }

  /**
   * 根据ID获取电影
   * @param id 电影ID
   */
  static async getMovieById(id: string): Promise<ApiResponse<Movie | null>> {
    try {
      const db = await DatabaseConnection.getInstance()
      const result = await db.select('SELECT * FROM movies WHERE id = $1', [id]) as MovieRow[]
      
      if (result.length === 0) {
        return { success: true, data: null }
      }
      
      const row = result[0]
      const movie: Movie = {
        ...row,
        genres: DatabaseUtils.parseJsonField<string[]>(row.genres),
        seasons_data: DatabaseUtils.parseJsonField<SeasonsData>(row.seasons_data)
      } as Movie
      
      return { success: true, data: movie }
    } catch (error) {
      return { success: false, error: `获取电影详情失败: ${error}` }
    }
  }

  /**
   * 添加电影
   * @param movie 电影数据
   */
  static async addMovie(movie: Partial<Movie>): Promise<ApiResponse<Movie>> {
    try {
      const db = await DatabaseConnection.getInstance()
      const id = await DatabaseUtils.generateUuid()
      const timestamp = await DatabaseUtils.getCurrentTimestamp()
      const normalizedMovie = normalizeProgressForStatus(movie)
      
      // 字段规则：
      // - created_at: 添加到数据库的时间，不可修改
      // - date_added: 初次观看时间，从watched_date设置或使用当前时间
      // - date_updated: 每次更新影视信息时修改为最新时间
      const dateAdded = normalizedMovie.watched_date || timestamp
      const dateUpdated = timestamp
      
      // 使用与数据库表匹配的字段
      const query = `
        INSERT INTO movies (
          id, title, original_title, year, type, tmdb_id, poster_path, backdrop_path,
          overview, status, personal_rating, tmdb_rating, runtime, genres, notes, watch_source,
          current_episode, current_season, air_status, total_episodes, total_seasons, seasons_data,
          watched_date, watch_count, date_added, date_updated, created_at, updated_at, tags
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29)
      `
      
      const params = [
        id,
        normalizedMovie.title || '',
        normalizedMovie.original_title || null,
        normalizedMovie.year || null,
        normalizedMovie.type || 'movie',
        normalizedMovie.tmdb_id || null,
        normalizedMovie.poster_path || null,
        normalizedMovie.backdrop_path || null,
        normalizedMovie.overview || null,
        normalizedMovie.status || 'watching',
        normalizedMovie.personal_rating || null,
        normalizedMovie.tmdb_rating || null,
        normalizedMovie.runtime || null,
        DatabaseUtils.stringifyJsonField(normalizedMovie.genres),
        normalizedMovie.notes || null,
        normalizedMovie.watch_source || null,
        normalizedMovie.current_episode ?? 0,
        normalizedMovie.current_season ?? 1,
        normalizedMovie.air_status || null,
        normalizedMovie.total_episodes || null,
        normalizedMovie.total_seasons || null,
        normalizedMovie.seasons_data ? JSON.stringify(normalizedMovie.seasons_data) : null,
        normalizedMovie.watched_date || null,
        normalizedMovie.watch_count || 0,
        dateAdded,
        dateUpdated,
        timestamp,
        timestamp,
        DatabaseUtils.stringifyJsonField(normalizedMovie.tags)
      ]

      await db.execute(query, params)
      
      const newMovie: Movie = {
        id,
        title: normalizedMovie.title || '',
        original_title: normalizedMovie.original_title || null,
        year: normalizedMovie.year || null,
        type: normalizedMovie.type || 'movie',
        tmdb_id: normalizedMovie.tmdb_id || null,
        poster_path: normalizedMovie.poster_path || null,
        backdrop_path: normalizedMovie.backdrop_path || null,
        overview: normalizedMovie.overview || null,
        status: normalizedMovie.status || 'watching',
        personal_rating: normalizedMovie.personal_rating || 0,
        tmdb_rating: normalizedMovie.tmdb_rating || null,
        runtime: normalizedMovie.runtime || null,
        notes: normalizedMovie.notes || null,
        watch_source: normalizedMovie.watch_source || null,
        current_episode: normalizedMovie.current_episode ?? 0,
        current_season: normalizedMovie.current_season ?? 1,
        air_status: normalizedMovie.air_status || null,
        total_episodes: normalizedMovie.total_episodes || null,
        total_seasons: normalizedMovie.total_seasons || null,
        watched_date: normalizedMovie.watched_date || null,
        date_added: dateAdded,
        date_updated: dateUpdated,
        created_at: timestamp,
        updated_at: timestamp,
        genres: normalizedMovie.genres || [],
        vote_average: 0,
        watch_count: normalizedMovie.watch_count || 0,
        tags: normalizedMovie.tags || []
      } as Movie
      
      return { success: true, data: newMovie }
    } catch (error) {
      console.error('数据库添加电影失败:', error)
      return { success: false, error: `添加影视作品失败: ${error}` }
    }
  }

  /**
   * 更新电影
   * @param movie 电影数据
   */
  static async updateMovie(movie: Partial<Movie> & { id: string }): Promise<ApiResponse<Movie>> {
    try {
      const db = await DatabaseConnection.getInstance()
      const timestamp = await DatabaseUtils.getCurrentTimestamp()
      
      // 先查询原始数据用于比较变更
      const originalResult = await db.select('SELECT * FROM movies WHERE id = $1', [movie.id]) as MovieRow[]
      if (originalResult.length === 0) {
        return { success: false, error: '电影不存在' }
      }
      const originalData = {
        ...originalResult[0],
        genres: DatabaseUtils.parseJsonField<string[]>(originalResult[0].genres),
        tags: DatabaseUtils.parseJsonField<string[]>(originalResult[0].tags),
        seasons_data: DatabaseUtils.parseJsonField<SeasonsData>(originalResult[0].seasons_data)
      } as Movie
      
      // 字段规则：
      // - date_added: 根据观看日期更新，如果没有观看日期则使用当前时间
      // - date_updated: 复杂逻辑判断
      //   1. 如果用户修改了观看日期，date_updated同步为该日期
      //   2. 如果用户未修改观看日期但修改了季数或集数，date_updated设为当前时间
      //   3. 如果都未修改，date_updated保持原值
      //   4. 观看日期的优先级最高
      const normalizedInput = normalizeProgressForStatus(movie)
      const dateAdded = normalizedInput.watched_date ?? originalData.date_added ?? originalData.watched_date ?? timestamp
      
      let dateUpdated: string
      const currentWatchedDate = normalizedInput.watched_date
      const originalWatchedDate = originalData.watched_date as string
      const currentSeason = normalizedInput.current_season
      const currentEpisode = normalizedInput.current_episode
      const originalSeason = originalData.current_season
      const originalEpisode = originalData.current_episode
      
      // 判断观看日期是否发生变更
      const watchedDateChanged = currentWatchedDate !== originalWatchedDate
      // 判断季数或集数是否发生变更
      const seasonOrEpisodeChanged = currentSeason !== originalSeason || currentEpisode !== originalEpisode
      
      if (watchedDateChanged && currentWatchedDate) {
        // 优先级最高：用户修改了观看日期，date_updated同步为该日期
        dateUpdated = currentWatchedDate
      } else if (!watchedDateChanged && seasonOrEpisodeChanged) {
        // 用户未修改观看日期但修改了季数或集数，date_updated设为当前时间
        dateUpdated = timestamp
      } else {
        // 都未修改，date_updated保持原值
        dateUpdated = originalData.date_updated || timestamp
      }
      
      const mergedMovie: Movie = {
        ...originalData,
        ...normalizedInput,
        title: normalizedInput.title ?? originalData.title,
        original_title: normalizedInput.original_title ?? originalData.original_title,
        overview: normalizedInput.overview ?? originalData.overview,
        poster_path: normalizedInput.poster_path ?? originalData.poster_path,
        backdrop_path: normalizedInput.backdrop_path ?? originalData.backdrop_path,
        type: (normalizedInput.type ?? originalData.type ?? 'movie') as Movie['type'],
        year: normalizedInput.year ?? originalData.year ?? null,
        tmdb_id: normalizedInput.tmdb_id ?? originalData.tmdb_id ?? null,
        tmdb_rating: normalizedInput.tmdb_rating ?? originalData.tmdb_rating ?? null,
        runtime: normalizedInput.runtime ?? originalData.runtime ?? null,
        genres: normalizedInput.genres ?? originalData.genres ?? [],
        status: (normalizedInput.status ?? originalData.status ?? 'planned') as Movie['status'],
        personal_rating: normalizedInput.personal_rating ?? originalData.personal_rating ?? null,
        watch_count: normalizedInput.watch_count ?? originalData.watch_count ?? 0,
        current_episode: normalizedInput.current_episode ?? originalData.current_episode ?? 0,
        current_season: normalizedInput.current_season ?? originalData.current_season ?? 1,
        total_episodes: normalizedInput.total_episodes ?? originalData.total_episodes ?? null,
        total_seasons: normalizedInput.total_seasons ?? originalData.total_seasons ?? null,
        seasons_data: normalizedInput.seasons_data ?? originalData.seasons_data ?? null,
        air_status: normalizedInput.air_status ?? originalData.air_status,
        notes: normalizedInput.notes ?? originalData.notes ?? null,
        watch_source: normalizedInput.watch_source ?? originalData.watch_source ?? null,
        watched_date: normalizedInput.watched_date ?? originalData.watched_date ?? null,
        tags: normalizedInput.tags ?? originalData.tags ?? [],
      }

      const query = `
        UPDATE movies SET 
          title = $1, original_title = $2, overview = $3, poster_path = $4, backdrop_path = $5, 
          year = $6, type = $7, tmdb_id = $8, tmdb_rating = $9, runtime = $10, genres = $11,
          status = $12, personal_rating = $13, watch_count = $14, current_episode = $15, current_season = $16,
          total_episodes = $17, total_seasons = $18, seasons_data = $19, air_status = $20, notes = $21,
          watch_source = $22, watched_date = $23, tags = $24, date_added = $25, date_updated = $26, updated_at = $27
        WHERE id = $28
      `
      
      const params = [
        mergedMovie.title,
        mergedMovie.original_title || null,
        mergedMovie.overview || null,
        mergedMovie.poster_path || null,
        mergedMovie.backdrop_path || null,
        mergedMovie.year || null,
        mergedMovie.type,
        mergedMovie.tmdb_id || null,
        mergedMovie.tmdb_rating || 0.0,
        mergedMovie.runtime || null,
        DatabaseUtils.stringifyJsonField(mergedMovie.genres),
        mergedMovie.status,
        mergedMovie.personal_rating || null,
        mergedMovie.watch_count || 0,
        mergedMovie.current_episode !== undefined ? mergedMovie.current_episode : 0,
        mergedMovie.current_season !== undefined ? mergedMovie.current_season : 1,
        mergedMovie.total_episodes || null,
        mergedMovie.total_seasons || null,
        DatabaseUtils.stringifyJsonField(mergedMovie.seasons_data),
        mergedMovie.air_status || null,
        mergedMovie.notes || null,
        mergedMovie.watch_source || null,
        mergedMovie.watched_date || null,
        DatabaseUtils.stringifyJsonField(mergedMovie.tags),
        dateAdded,
        dateUpdated,
        timestamp,
        movie.id
      ]
      
      await db.execute(query, params)
      
      return { 
        success: true, 
        data: {
          ...mergedMovie,
          date_added: dateAdded,
          date_updated: dateUpdated,
          updated_at: timestamp
        } as Movie
      }
    } catch (error) {
      return { success: false, error: `更新电影失败: ${error}` }
    }
  }

  /**
   * 删除电影
   * @param movieId 电影ID
   */
  static async deleteMovie(movieId: string): Promise<ApiResponse<string>> {
    try {
      const db = await DatabaseConnection.getInstance()
      await db.execute('DELETE FROM movies WHERE id = $1', [movieId])
      return { success: true, data: '电影删除成功' }
    } catch (error) {
      return { success: false, error: `删除电影失败: ${error}` }
    }
  }

  private static normalizeExternalId(externalId?: string | number): number | null {
    if (externalId === undefined || externalId === null || externalId === '') {
      return null
    }

    const numericId = Number(externalId)
    return Number.isFinite(numericId) ? numericId : null
  }
}
