/**
 * 数据库表结构定义
 * 负责数据库表的创建和升级
 * @author yanstu
 */

import { DatabaseConnection } from './connection'

/**
 * 数据库表结构管理类
 */
export class DatabaseSchema {
  /**
   * 确保表结构包含所有必要字段
   */
  static async ensureTableStructure(): Promise<void> {
    try {
      const db = await DatabaseConnection.getInstance()
      
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
          // 表创建失败（可能已存在）
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
} 