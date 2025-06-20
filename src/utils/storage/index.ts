/**
 * 存储服务
 * 封装localStorage操作
 */

import { StorageKey } from './constants';

/**
 * 存储服务类
 */
export class StorageService {
  /**
   * 设置存储项
   * @param key 存储键
   * @param value 存储值
   */
  static set<T>(key: string, value: T): void {
    try {
      const stringValue = JSON.stringify(value);
      localStorage.setItem(key, stringValue);
    } catch (error) {
      console.error(`存储数据失败 [${key}]:`, error);
    }
  }
  
  /**
   * 获取存储项
   * @param key 存储键
   * @param defaultValue 默认值（如果不存在）
   * @returns 存储值或默认值
   */
  static get<T>(key: string, defaultValue?: T): T | undefined {
    try {
      const value = localStorage.getItem(key);
      
      if (value === null) {
        return defaultValue;
      }
      
      return JSON.parse(value) as T;
    } catch (error) {
      console.error(`获取数据失败 [${key}]:`, error);
      return defaultValue;
    }
  }
  
  /**
   * 移除存储项
   * @param key 存储键
   */
  static remove(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error(`移除数据失败 [${key}]:`, error);
    }
  }
  
  /**
   * 清除所有存储
   */
  static clear(): void {
    try {
      localStorage.clear();
    } catch (error) {
      console.error('清除所有数据失败:', error);
    }
  }
  
  /**
   * 检查存储项是否存在
   * @param key 存储键
   * @returns 是否存在
   */
  static has(key: string): boolean {
    return localStorage.getItem(key) !== null;
  }
  
  /**
   * 获取所有存储键
   * @returns 存储键数组
   */
  static keys(): string[] {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        keys.push(key);
      }
    }
    return keys;
  }
  
  /**
   * 修复存储数据
   * 当数据格式出现问题时，尝试修复存储的数据
   */
  static repairStorage(): void {
    try {
      
      // 获取所有存储键
      const keys = this.keys();
      
      // 遍历所有键，尝试读取并重新保存
      for (const key of keys) {
        try {
          // 尝试直接获取原始值
          const rawValue = localStorage.getItem(key);
          
          if (rawValue) {
            // 对于缓存类键，如果出现问题直接重置
            if (key === StorageKey.API_CACHE || key === StorageKey.TMDB_CACHE) {
              try {
                JSON.parse(rawValue);
                // 即使格式正确，也重置为空对象，避免后续问题
                localStorage.setItem(key, JSON.stringify({}));
                continue;
              } catch (jsonError) {
                localStorage.setItem(key, JSON.stringify({}));
                continue;
              }
            }
            
            // 尝试解析JSON
            try {
              // 如果能直接解析为JSON，说明数据格式正确
              JSON.parse(rawValue);
            } catch (jsonError) {
              // 无法解析为JSON，数据可能已损坏
              // 对于重要的系统键，尝试重置为默认值
              if (key === StorageKey.SETTINGS) {
                const defaultSettings = {
                  minimizeToTray: true
                };
                localStorage.setItem(key, JSON.stringify(defaultSettings));
              } else {
                // 对于其他键，如果损坏则删除
                localStorage.removeItem(key);
              }
            }
          }
        } catch (keyError) {
          // 如果处理过程中出错，删除该键
          localStorage.removeItem(key);
        }
      }

    } catch (error) {
      // 修复失败时静默处理
    }
  }
}

// 导出默认实例和类型
export default StorageService;
export * from './constants'; 