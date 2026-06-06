/**
 * 数据库工具函数
 * 提供数据库操作的通用工具函数
 * @author yanstu
 */

import { invoke } from '@tauri-apps/api/core'
import type { ApiResponse } from '../../types'

/**
 * 数据库工具类
 */
export class DatabaseUtils {
  /**
   * 生成UUID
   * 使用Tauri后端生成唯一ID
   */
  static async generateUuid(): Promise<string> {
    const response: ApiResponse<string> = await invoke('generate_uuid')
    return response.data || crypto.randomUUID()
  }

  /**
   * 获取当前时间戳
   * 返回ISO格式的时间字符串
   */
  static async getCurrentTimestamp(): Promise<string> {
    try {
      const response: ApiResponse<string> = await invoke('get_current_timestamp')
      return response.data || new Date().toISOString()
    } catch (error) {
      return new Date().toISOString()
    }
  }

  /**
   * 解析JSON字段
   * 将数据库中存储的JSON字符串解析为对象
   * @param jsonString JSON字符串
   * @returns 解析后的对象，解析失败则返回null
   */
  static parseJsonField<T>(jsonString: string | null): T | null {
    if (!jsonString) return null
    try {
      return JSON.parse(jsonString)
    } catch {
      return null
    }
  }

  /**
   * 序列化为JSON字符串
   * 将对象序列化为JSON字符串以存储到数据库
   * @param data 要序列化的对象
   * @returns JSON字符串，序列化失败则返回null
   */
  static stringifyJsonField<T>(data: T | null): string | null {
    if (!data) return null
    try {
      return JSON.stringify(data)
    } catch {
      return null
    }
  }
} 