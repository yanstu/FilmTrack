/**
 * 存储服务
 * 封装localStorage操作
 */

import { StorageKey } from './constants';
import { DEFAULT_APP_SETTINGS } from '../appSettings';

/**
 * 存储服务类
 */
export class StorageService {
  private static getStorage(): Storage | null {
    const storage = globalThis.localStorage

    if (
      !storage ||
      typeof storage.getItem !== 'function' ||
      typeof storage.setItem !== 'function' ||
      typeof storage.removeItem !== 'function' ||
      typeof storage.clear !== 'function' ||
      typeof storage.key !== 'function'
    ) {
      return null
    }

    return storage
  }

  /**
   * 设置存储项
   * @param key 存储键
   * @param value 存储值
   */
  static set<T>(key: string, value: T): void {
    const storage = this.getStorage()
    if (!storage) {
      return
    }

    try {
      const stringValue = JSON.stringify(value);
      storage.setItem(key, stringValue);
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
    const storage = this.getStorage()
    if (!storage) {
      return defaultValue
    }

    try {
      const value = storage.getItem(key);
      
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
    const storage = this.getStorage()
    if (!storage) {
      return
    }

    try {
      storage.removeItem(key);
    } catch (error) {
      console.error(`移除数据失败 [${key}]:`, error);
    }
  }
  
  /**
   * 清除所有存储
   */
  static clear(): void {
    const storage = this.getStorage()
    if (!storage) {
      return
    }

    try {
      storage.clear();
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
    const storage = this.getStorage()
    if (!storage) {
      return false
    }

    return storage.getItem(key) !== null;
  }
  
  /**
   * 获取所有存储键
   * @returns 存储键数组
   */
  static keys(): string[] {
    const storage = this.getStorage()
    if (!storage) {
      return []
    }

    const keys: string[] = [];
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
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
    const storage = this.getStorage()
    if (!storage) {
      return
    }

    try {
      
      // 获取所有存储键
      const keys = this.keys();
      
      // 遍历所有键，尝试读取并重新保存
      for (const key of keys) {
        try {
          // 尝试直接获取原始值
          const rawValue = storage.getItem(key);
          
          if (rawValue) {
            // 对于缓存类键，如果出现问题直接重置
            if (key === StorageKey.API_CACHE || key === StorageKey.TMDB_CACHE) {
              try {
                JSON.parse(rawValue);
                // 即使格式正确，也重置为空对象，避免后续问题
                storage.setItem(key, JSON.stringify({}));
                continue;
              } catch (jsonError) {
                storage.setItem(key, JSON.stringify({}));
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
                storage.setItem(key, JSON.stringify(DEFAULT_APP_SETTINGS));
              } else {
                // 对于其他键，如果损坏则删除
                storage.removeItem(key);
              }
            }
          }
        } catch (keyError) {
          // 如果处理过程中出错，删除该键
          storage.removeItem(key);
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
