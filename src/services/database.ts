/**
 * 数据库服务
 * 负责所有数据库相关操作
 * @author yanstu
 */

import Database from '@tauri-apps/plugin-sql'
import { invoke } from '@tauri-apps/api/core'
import {
  Movie,
  Statistics,
  ApiResponse,
  SeasonsData
} from '../types'
import { APP_CONFIG } from '../../config/app.config'



/**
 * 数据库连接管理
 */
export class DatabaseService {
  private static instance: Database | null = null

  static async connect(): Promise<Database> {
      try {
      const Database = await import('@tauri-apps/plugin-sql')
      
      // 使用配置中的数据库名称
      const dbName = APP_CONFIG.database.name
      const db = await Database.default.load(`sqlite:${dbName}`)
      return db
    } catch (error) {
      console.error('数据库连接失败:', error)
      throw error
      }
    }

  static async getInstance(): Promise<Database> {
    if (!this.instance) {
      await this.initialize()
    }
    return this.instance
  }

  // 确保表结构包含所有必要字段
  static async ensureTableStructure(): Promise<void> {
    try {
      const db = await this.getInstance()
      
      // 检查是否有执行权限
      try {
        await db.execute('SELECT 1') // 简单的权限测试
      } catch (permissionError) {
        console.error('数据库权限不足，请检查Tauri配置:', permissionError)
        throw new Error('数据库权限不足，无法执行SQL命令。请检查tauri.conf.json中的SQL权限配置。')
      }
      
      // 先尝试创建表（如果不存在）
      const createTables = [
        `CREATE TABLE IF NOT EXISTS movies (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          original_title TEXT,
          overview TEXT,
          poster_path TEXT,
          backdrop_path TEXT,
          tmdb_id INTEGER,
          tmdb_rating REAL DEFAULT 0.0,
          personal_rating REAL CHECK (personal_rating >= 0 AND personal_rating <= 10),
          status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('watching', 'completed', 'planned', 'paused', 'dropped')),
          type TEXT NOT NULL DEFAULT 'movie' CHECK (type IN ('movie', 'tv')),
          year INTEGER,
          runtime INTEGER,
          genres TEXT,
          current_episode INTEGER DEFAULT 0,
          total_episodes INTEGER,
          current_season INTEGER DEFAULT 1,
          total_seasons INTEGER,
          seasons_data TEXT,
          air_status TEXT,
          watch_source TEXT,
          watched_date TEXT,
          notes TEXT,
          watch_count INTEGER DEFAULT 0,
          date_added TEXT,
          date_updated TEXT,
          created_at TEXT,
          updated_at TEXT
        )`
      ]
      
      // 执行表创建
      for (const sql of createTables) {
        try {
          await db.execute(sql)
        } catch (error) {
          console.warn('表创建失败（可能已存在）:', error)
        }
  }

      // 检查并添加缺失的字段（不使用函数作为默认值）
      const alterCommands = [
        // movies表的字段升级
        'ALTER TABLE movies ADD COLUMN personal_rating REAL',
        'ALTER TABLE movies ADD COLUMN tmdb_rating REAL',
        'ALTER TABLE movies ADD COLUMN date_added TEXT',
        'ALTER TABLE movies ADD COLUMN date_updated TEXT',
        'ALTER TABLE movies ADD COLUMN original_title TEXT',
        'ALTER TABLE movies ADD COLUMN tmdb_id INTEGER',
        'ALTER TABLE movies ADD COLUMN type TEXT',
        'ALTER TABLE movies ADD COLUMN year INTEGER',
        'ALTER TABLE movies ADD COLUMN current_episode INTEGER',
        'ALTER TABLE movies ADD COLUMN total_episodes INTEGER',
        'ALTER TABLE movies ADD COLUMN current_season INTEGER',
        'ALTER TABLE movies ADD COLUMN total_seasons INTEGER',
        'ALTER TABLE movies ADD COLUMN seasons_data TEXT',
        'ALTER TABLE movies ADD COLUMN air_status TEXT',
        'ALTER TABLE movies ADD COLUMN watch_source TEXT',
        'ALTER TABLE movies ADD COLUMN watched_date TEXT',
        'ALTER TABLE movies ADD COLUMN notes TEXT',
        'ALTER TABLE movies ADD COLUMN created_at TEXT',
        'ALTER TABLE movies ADD COLUMN updated_at TEXT',
      ]
      
      // 尝试执行ALTER命令，忽略已存在字段的错误
      for (const command of alterCommands) {
        try {
          await db.execute(command)
        } catch (error) {
          // 忽略"duplicate column name"错误，这是正常的
        }
      }
      
      // 为缺失时间戳的记录设置默认值
      try {
        const currentTime = new Date().toISOString()
        
        // 更新movies表的时间戳字段
        await db.execute(`
          UPDATE movies SET 
            date_added = COALESCE(date_added, ?),
            date_updated = COALESCE(date_updated, ?),
            created_at = COALESCE(created_at, ?),
            updated_at = COALESCE(updated_at, ?)
          WHERE date_added IS NULL OR date_updated IS NULL OR created_at IS NULL OR updated_at IS NULL
        `, [currentTime, currentTime, currentTime, currentTime])
      } catch (error) {
        console.warn('数据迁移失败:', error)
      }
      
      // 创建索引（如果不存在）
      const indexCommands = [
        'CREATE INDEX IF NOT EXISTS idx_movies_status ON movies(status)',
        'CREATE INDEX IF NOT EXISTS idx_movies_type ON movies(type)',
        'CREATE INDEX IF NOT EXISTS idx_movies_tmdb_id ON movies(tmdb_id)',
        'CREATE INDEX IF NOT EXISTS idx_movies_date_updated ON movies(date_updated)'
      ]
      
      for (const indexCommand of indexCommands) {
        try {
          await db.execute(indexCommand)
        } catch (error) {
          console.warn('索引创建失败:', indexCommand, error)
        }
      }
    } catch (error) {
      console.error('数据库表结构初始化失败:', error)
      throw error
    }
  }

  static async close(): Promise<void> {
    if (this.instance) {
      await this.instance.close()
      this.instance = null
    }
  }

  static async initialize(): Promise<void> {
    try {
      if (!this.instance) {
        this.instance = await this.connect()
      }

      // 初始化表结构
      await this.ensureTableStructure()
    } catch (error) {

      // 如果是权限问题，提供更明确的错误信息
      if (String(error).includes('sql.execute not allowed') || String(error).includes('权限不足')) {
        throw new Error('数据库权限配置错误：\n' +
          '1. 请确保 src-tauri/capabilities/main.json 中包含以下权限：\n' +
          '   - "sql:allow-execute"\n' +
          '   - "sql:allow-select"\n' +
          '   - "sql:allow-load"\n' +
          '2. 重新启动应用以应用权限配置\n' +
          '3. 如果问题仍然存在，请检查 Tauri 版本是否兼容')
      }

      throw error
    }
  }
}

/**
 * 工具函数
 */
export class DatabaseUtils {
  // 生成UUID
  static async generateUuid(): Promise<string> {
    const response: ApiResponse<string> = await invoke('generate_uuid')
    return response.data || ''
  }

  // 获取当前时间戳
  static async getCurrentTimestamp(): Promise<string> {
    const response: ApiResponse<string> = await invoke('get_current_timestamp')
    return response.data || new Date().toISOString()
  }

  // 解析JSON字段
  static parseJsonField<T>(jsonString: string | null): T | null {
    if (!jsonString) return null
    try {
      return JSON.parse(jsonString)
    } catch {
      return null
    }
  }

  // 序列化为JSON字符串
  static stringifyJsonField<T>(data: T | null): string | null {
    if (!data) return null
    try {
      return JSON.stringify(data)
    } catch {
      return null
    }
  }
}

/**
 * 电影数据访问对象
 */
export class MovieDAO {
  // 获取电影列表
  static async getMovies(
    status?: string, 
    limit?: number, 
    offset?: number
  ): Promise<ApiResponse<Movie[]>> {
    try {
      const db = await DatabaseService.getInstance()
      
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
        tags: DatabaseUtils.parseJsonField<string[]>(row.tags),
        seasons_data: DatabaseUtils.parseJsonField<SeasonsData>(row.seasons_data)
      }))
      
      return { success: true, data: movies }
    } catch (error) {
      return { success: false, error: `获取电影列表失败: ${error}` }
    }
  }

  // 根据ID获取电影
  static async getMovieById(id: string): Promise<ApiResponse<Movie | null>> {
    try {
      const db = await DatabaseService.getInstance()
      const result = await db.select('SELECT * FROM movies WHERE id = $1', [id]) as any[]
      
      if (result.length === 0) {
        return { success: true, data: null }
      }
      
      const row = result[0]
      const movie: Movie = {
        ...row,
        genres: DatabaseUtils.parseJsonField<string[]>(row.genres),
        seasons_data: DatabaseUtils.parseJsonField<SeasonsData>(row.seasons_data)
      }
      
      return { success: true, data: movie }
    } catch (error) {
      return { success: false, error: `获取电影详情失败: ${error}` }
    }
  }

  // 添加电影
  static async addMovie(movie: Partial<Movie>): Promise<ApiResponse<Movie>> {
    try {
      const db = await DatabaseService.getInstance()
      const id = await DatabaseUtils.generateUuid()
      const timestamp = await DatabaseUtils.getCurrentTimestamp()
      
      // 使用与数据库表匹配的字段
      const query = `
        INSERT INTO movies (
          id, title, original_title, year, type, tmdb_id, poster_path,
          overview, status, personal_rating, tmdb_rating, notes, watch_source,
          current_episode, current_season, air_status, total_episodes, total_seasons, seasons_data,
          date_added, date_updated, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)
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
        (movie as any).personal_rating || 0,
        (movie as any).tmdb_rating || null,
        (movie as any).notes || null,
        (movie as any).watch_source || null,
        (movie as any).current_episode || 0,
        (movie as any).current_season || 1,
        (movie as any).air_status || null,
        (movie as any).total_episodes || null,
        (movie as any).total_seasons || null,
        (movie as any).seasons_data ? JSON.stringify((movie as any).seasons_data) : null,
        (movie as any).date_added || timestamp,
        (movie as any).date_updated || timestamp,
        (movie as any).created_at || timestamp,
        (movie as any).updated_at || timestamp
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
        date_added: (movie as any).date_added || timestamp,
        date_updated: (movie as any).date_updated || timestamp
      } as Movie
      
      return { success: true, data: newMovie }
    } catch (error) {
      return { success: false, error: `添加影视作品失败: ${error}` }
    }
  }

  // 更新电影
  static async updateMovie(movie: Movie): Promise<ApiResponse<Movie>> {
    try {
      const db = await DatabaseService.getInstance()
      const timestamp = await DatabaseUtils.getCurrentTimestamp()
      

      
      const query = `
        UPDATE movies SET
          title = $1, overview = $2, poster_path = $3, backdrop_path = $4,
          year = $5, tmdb_rating = $6, runtime = $7, genres = $8,
          status = $9, personal_rating = $10, watch_count = $11,
          current_episode = $12, current_season = $13, total_episodes = $14, total_seasons = $15,
          seasons_data = $16, air_status = $17, notes = $18, watch_source = $19,
          date_updated = $20, updated_at = $21
        WHERE id = $22
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
        (movie as any).seasons_data ? JSON.stringify((movie as any).seasons_data) : null,
        (movie as any).air_status || null,
        (movie as any).notes || null,
        (movie as any).watch_source || null,
        (movie as any).date_updated || timestamp,
        (movie as any).updated_at || timestamp,
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

  // 删除电影
  static async deleteMovie(movieId: string): Promise<ApiResponse<string>> {
    try {
      const db = await DatabaseService.getInstance()
      await db.execute('DELETE FROM movies WHERE id = $1', [movieId])
      return { success: true, data: '电影删除成功' }
    } catch (error) {
      return { success: false, error: `删除电影失败: ${error}` }
    }
  }

  // 获取所有电影（用于兼容性）
  static async getAllMovies(): Promise<ApiResponse<Movie[]>> {
    return this.getMovies()
  }
}

/**
 * 统计数据访问对象
 */
export class StatisticsDAO {
  // 获取统计数据
  static async getStatistics(): Promise<ApiResponse<Statistics>> {
    try {
      const db = await DatabaseService.getInstance()
      
      // 并行执行所有统计查询
      const [
        totalMoviesResult,
        completedMoviesResult,
        averageRatingResult,
        monthlyResult,
        yearlyResult
      ] = await Promise.all([
        db.select('SELECT COUNT(*) as count FROM movies'),
        db.select('SELECT COUNT(*) as count FROM movies WHERE status = $1', ['completed']),
        db.select('SELECT AVG(CAST(personal_rating as REAL)) as avg_rating FROM movies WHERE personal_rating IS NOT NULL AND personal_rating > 0'),
        db.select("SELECT COUNT(*) as count FROM movies WHERE created_at >= date('now', 'start of month')"),
        db.select("SELECT COUNT(*) as count FROM movies WHERE created_at >= date('now', 'start of year')")
      ])
      
      const statistics: Statistics = {
        total_movies: (totalMoviesResult as any[])[0]?.count || 0,
        completed_movies: (completedMoviesResult as any[])[0]?.count || 0,
        average_rating: (averageRatingResult as any[])[0]?.avg_rating || 0.0,
        movies_this_month: (monthlyResult as any[])[0]?.count || 0,
        movies_this_year: (yearlyResult as any[])[0]?.count || 0
      }
      
      return { success: true, data: statistics }
    } catch (error) {
      return { success: false, error: `获取统计数据失败: ${error}` }
    }
  }
}