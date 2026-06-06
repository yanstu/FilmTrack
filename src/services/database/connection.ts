/**
 * 数据库连接管理
 * 负责数据库连接的创建、获取和关闭
 * @author yanstu
 */

import type Database from '@tauri-apps/plugin-sql'
import { APP_CONFIG } from '../../../config/app.config'
import { DatabaseSchema } from './schema'

/**
 * 数据库连接管理类
 */
export class DatabaseConnection {
  private static instance: Database | null = null
  private static initialized = false
  private static initializationPromise: Promise<void> | null = null

  /**
   * 创建数据库连接
   */
  static async connect(): Promise<Database> {
    try {
      const sqlModule = await import('@tauri-apps/plugin-sql')
      
      // 使用配置中的数据库名称
      const dbName = APP_CONFIG.database.name
      const db = await sqlModule.default.load(`sqlite:${dbName}`)
      
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
    await this.initialize()
    return this.instance as Database
  }

  /**
   * 获取原始数据库连接，不触发表结构初始化。
   * 仅用于初始化流程内部，避免迁移期间递归等待自身完成。
   */
  static async getRawInstance(): Promise<Database> {
    if (!this.instance) {
      this.instance = await this.connect()
    }

    return this.instance
  }

  /**
   * 关闭数据库连接
   */
  static async close(): Promise<void> {
    if (this.initializationPromise) {
      try {
        await this.initializationPromise
      } catch {
        // 忽略初始化阶段的异常，继续尝试关闭连接
      }
    }

    if (this.instance) {
      await this.instance.close()
      this.instance = null
    }

    this.initialized = false
    this.initializationPromise = null
    DatabaseSchema.resetInitializationState()
  }

  /**
   * 初始化数据库
   */
  static async initialize(): Promise<void> {
    if (this.initialized) {
      return
    }

    if (this.initializationPromise) {
      return this.initializationPromise
    }

    this.initializationPromise = (async () => {
      try {
        await this.getRawInstance()

        // 确保数据库表结构正确创建
        await this.ensureTableStructure()
        this.initialized = true
      } catch (error) {
        this.initialized = false
        DatabaseSchema.resetInitializationState()

        if (this.instance) {
          try {
            await this.instance.close()
          } catch (closeError) {
            console.warn('数据库初始化失败后关闭连接时出错:', closeError)
          }
        }

        this.instance = null

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
      } finally {
        this.initializationPromise = null
      }
    })()

    return this.initializationPromise
  }

  /**
   * 确保数据库表结构正确创建
   */
  private static async ensureTableStructure(): Promise<void> {
    await DatabaseSchema.ensureTableStructure()
  }
}
