/**
 * 数据库连接管理
 * 负责数据库连接的创建、获取和关闭
 * @author yanstu
 */

import Database from '@tauri-apps/plugin-sql'
import { APP_CONFIG } from '../../../config/app.config'

/**
 * 数据库连接管理类
 */
export class DatabaseConnection {
  private static instance: Database | null = null

  /**
   * 创建数据库连接
   */
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

  /**
   * 获取数据库实例（单例模式）
   */
  static async getInstance(): Promise<Database> {
    if (!this.instance) {
      await this.initialize()
    }
    return this.instance as Database
  }

  /**
   * 关闭数据库连接
   */
  static async close(): Promise<void> {
    if (this.instance) {
      await this.instance.close()
      this.instance = null
    }
  }

  /**
   * 初始化数据库
   */
  static async initialize(): Promise<void> {
    try {
      if (!this.instance) {
        this.instance = await this.connect()
      }
      
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