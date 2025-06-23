/**
 * 电影数据访问对象
 * 提供电影数据的CRUD操作
 * @author yanstu
 */

import type { ApiResponse, Movie } from '../../../types'
import { DatabaseConnection } from '../connection'
import { DatabaseUtils } from '../utils'

/**
 * 电影数据访问对象
 */
export class MovieDAO {
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
      const params: any[] = []
      
      if (status) {
        query += ' WHERE status = $1'
        params.push(status)
      }
      
      query += ' ORDER BY updated_at DESC'
      
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
      
      const result = await db.select(query, params) as any[]
      
      // 解析JSON字段
      const movies: Movie[] = result.map((row: any) => ({
        ...row,
        genres: DatabaseUtils.parseJsonField<string[]>(row.genres),
        tags: DatabaseUtils.parseJsonField<string[]>(row.tags)
      }))
      
      return { success: true, data: movies }
    } catch (error) {
      return { success: false, error: `获取电影列表失败: ${error}` }
    }
  }

  /**
   * 根据ID获取电影
   * @param id 电影ID
   */
  static async getMovieById(id: string): Promise<ApiResponse<Movie | null>> {
    try {
      const db = await DatabaseConnection.getInstance()
      const result = await db.select('SELECT * FROM movies WHERE id = $1', [id]) as any[]
      
      if (result.length === 0) {
        return { success: true, data: null }
      }
      
      const row = result[0]
      const movie: Movie = {
        ...row,
        genres: DatabaseUtils.parseJsonField<string[]>(row.genres),
      }
      
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
      
      // 使用与数据库表匹配的字段
      const query = `
        INSERT INTO movies (
          id, title, original_title, year, type, tmdb_id, poster_path, 
          overview, status, personal_rating, tmdb_rating, notes, watch_source,
          current_episode, current_season, air_status, total_episodes, total_seasons,
          date_added, date_updated, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
      `
      
      const params = [
        id,
        movie.title || '',
        (movie as any).original_title || null,
        (movie as any).year || null,
        (movie as any).type || 'movie',
        (movie as any).tmdb_id || null,
        movie.poster_path || null,
        movie.overview || null,
        movie.status || 'watching',
        (movie as any).personal_rating || null,
        (movie as any).tmdb_rating || null,
        (movie as any).notes || null,
        (movie as any).watch_source || null,
        (movie as any).current_episode || 0,
        (movie as any).current_season || 1,
        (movie as any).air_status || null,
        (movie as any).total_episodes || null,
        (movie as any).total_seasons || null,
        timestamp,
        timestamp,
        timestamp,
        timestamp
      ]

      await db.execute(query, params)
      
      const newMovie: Movie = {
        id,
        title: movie.title || '',
        original_title: (movie as any).original_title || null,
        year: (movie as any).year || null,
        type: (movie as any).type || 'movie',
        tmdb_id: (movie as any).tmdb_id || null,
        poster_path: movie.poster_path || null,
        overview: movie.overview || null,
        status: movie.status || 'watching',
        personal_rating: (movie as any).personal_rating || 0,
        tmdb_rating: (movie as any).tmdb_rating || null,
        notes: (movie as any).notes || null,
        watch_source: (movie as any).watch_source || null,
        current_episode: (movie as any).current_episode || 0,
        current_season: (movie as any).current_season || 1,
        air_status: (movie as any).air_status || null,
        total_episodes: (movie as any).total_episodes || null,
        total_seasons: (movie as any).total_seasons || null,
        date_added: timestamp,
        date_updated: timestamp,
        created_at: timestamp,
        updated_at: timestamp,
        genres: [],
        vote_average: 0,
        watch_count: 0
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
  static async updateMovie(movie: Movie): Promise<ApiResponse<Movie>> {
    try {
      const db = await DatabaseConnection.getInstance()
      const timestamp = await DatabaseUtils.getCurrentTimestamp()
      
      const query = `
        UPDATE movies SET 
          title = $1, overview = $2, poster_path = $3, backdrop_path = $4, 
          year = $5, tmdb_rating = $6, runtime = $7, genres = $8,
          status = $9, personal_rating = $10, watch_count = $11, 
          current_episode = $12, current_season = $13, total_episodes = $14, total_seasons = $15,
          air_status = $16, notes = $17, watch_source = $18,
          date_updated = $19, updated_at = $20
        WHERE id = $21
      `
      
      const params = [
        movie.title,
        movie.overview || null,
        movie.poster_path || null,
        movie.backdrop_path || null,
        (movie as any).year || null,
        (movie as any).tmdb_rating || 0.0,
        movie.runtime || null,
        DatabaseUtils.stringifyJsonField(movie.genres),
        movie.status,
        (movie as any).personal_rating || null,
        (movie as any).watch_count || 0,
        (movie as any).current_episode !== undefined ? (movie as any).current_episode : 0,
        (movie as any).current_season !== undefined ? (movie as any).current_season : 1,
        (movie as any).total_episodes || null,
        (movie as any).total_seasons || null,
        (movie as any).air_status || null,
        (movie as any).notes || null,
        (movie as any).watch_source || null,
        timestamp,
        timestamp,
        movie.id
      ]
      
      await db.execute(query, params)
      
      return { 
        success: true, 
        data: { ...movie, date_updated: timestamp, updated_at: timestamp } 
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

  /**
   * 获取所有电影（用于兼容性）
   */
  static async getAllMovies(): Promise<ApiResponse<Movie[]>> {
    return this.getMovies()
  }

  /**
   * 查找电影（兼容旧版API）
   */
  static async findAll(
    status?: string, 
    limit?: number, 
    offset?: number
  ): Promise<Movie[]> {
    const result = await this.getMovies(status, limit, offset)
    return result.success ? result.data : []
  }

  /**
   * 查找单个电影（兼容旧版API）
   */
  static async findById(id: string): Promise<Movie | null> {
    const result = await this.getMovieById(id)
    return result.success ? result.data : null
  }

  /**
   * 创建电影（兼容旧版API）
   */
  static async create(movie: Partial<Movie>): Promise<Movie> {
    const result = await this.addMovie(movie)
    if (!result.success) {
      throw new Error(result.error)
    }
    return result.data
  }

  /**
   * 更新电影（兼容旧版API）
   */
  static async update(movie: Movie): Promise<Movie> {
    const result = await this.updateMovie(movie)
    if (!result.success) {
      throw new Error(result.error)
    }
    return result.data
  }

  /**
   * 删除电影（兼容旧版API）
   */
  static async delete(id: string): Promise<boolean> {
    const result = await this.deleteMovie(id)
    return result.success
  }
} 