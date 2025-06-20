/**
 * API缓存服务
 * 提供API响应的内存和本地存储缓存功能
 * @author yanstu
 */

import StorageService, { StorageKey } from '../utils/storage';
import { APP_CONFIG } from '../../config/app.config';

/**
 * 缓存项接口
 */
interface CacheItem<T> {
  data: T;
  timestamp: number;
}

/**
 * API缓存服务类
 * 提供API响应的缓存功能，支持内存缓存和本地存储
 */
export class ApiCacheService {
  private cache: Record<string, CacheItem<any>> = {};
  private expirationTime: number;
  
  /**
   * 创建API缓存服务实例
   * @param expirationTimeInHours 缓存过期时间（小时）
   */
  constructor(expirationTimeInHours?: number) {
    // 使用配置文件中的缓存时长，或者默认24小时
    this.expirationTime = (expirationTimeInHours || APP_CONFIG.api.cache.expirationHours || 24) * 60 * 60 * 1000;
    this.loadFromStorage();
  }
  
  /**
   * 获取缓存数据
   * @param key 缓存键
   * @returns 缓存数据，如果不存在或已过期则返回null
   */
  public get<T>(key: string): T | null {
    const item = this.cache[key];
    
    if (!item) {
      return null;
    }
    
    const now = Date.now();
    if (now - item.timestamp > this.expirationTime) {
      // 缓存已过期，删除
      delete this.cache[key];
      this.saveToStorage();
      return null;
    }
    
    return item.data as T;
  }
  
  /**
   * 设置缓存数据
   * @param key 缓存键
   * @param data 缓存数据
   */
  public set<T>(key: string, data: T): void {
    this.cache[key] = {
      data,
      timestamp: Date.now()
    };
    
    this.saveToStorage();
  }
  
  /**
   * 删除缓存数据
   * @param key 缓存键
   */
  public delete(key: string): void {
    delete this.cache[key];
    this.saveToStorage();
  }
  
  /**
   * 清空所有缓存
   */
  public clear(): void {
    this.cache = {};
    this.saveToStorage();
  }
  
  /**
   * 将缓存保存到本地存储
   */
  private saveToStorage(): void {
    try {
      StorageService.set(StorageKey.API_CACHE, this.cache);
    } catch (error) {
      console.error('保存API缓存到本地存储失败:', error);
    }
  }
  
  /**
   * 从本地存储加载缓存
   */
  private loadFromStorage(): void {
    try {
      // 使用StorageService获取缓存数据
      const storedCache = StorageService.get<Record<string, CacheItem<any>>>(StorageKey.API_CACHE, {});
      if (storedCache) {
        this.cache = storedCache;
      } else {
        this.cache = {};
      }
    } catch (error) {
      console.error('从本地存储加载API缓存失败:', error);
      this.cache = {};
    }
  }
}

// 导出默认的API缓存实例
export const apiCache = new ApiCacheService(); 