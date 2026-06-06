/**
 * 缓存管理工具
 * 提供缓存监控、清理和优化功能
 */

import StorageService, { StorageKey } from './storage';
import type { CacheItem } from '../types';

export interface CacheStats {
  totalSize: number;
  itemCount: number;
  oldestItem: Date;
  newestItem: Date;
  sizeByType: Record<string, number>;
  itemsByType: Record<string, number>;
}

export class CacheManager {
  /**
   * 获取详细的缓存统计信息
   */
  static getCacheStats(): CacheStats {
    try {
      const cache = StorageService.get(StorageKey.TMDB_CACHE) || {};
      const entries = Object.entries(cache);
      
      if (entries.length === 0) {
        return {
          totalSize: 0,
          itemCount: 0,
          oldestItem: new Date(),
          newestItem: new Date(),
          sizeByType: {},
          itemsByType: {}
        };
      }

      let totalSize = 0;
      let oldestTimestamp = Date.now();
      let newestTimestamp = 0;
      const sizeByType: Record<string, number> = {};
      const itemsByType: Record<string, number> = {};

      entries.forEach(([key, value]) => {
        const itemSize = JSON.stringify(value).length;
        totalSize += itemSize;

        // 更新时间戳
        const timestamp = (value as CacheItem<unknown>).timestamp || 0;
        if (timestamp < oldestTimestamp) oldestTimestamp = timestamp;
        if (timestamp > newestTimestamp) newestTimestamp = timestamp;

        // 按类型分类
        const type = this.getCacheType(key);
        sizeByType[type] = (sizeByType[type] || 0) + itemSize;
        itemsByType[type] = (itemsByType[type] || 0) + 1;
      });

      return {
        totalSize,
        itemCount: entries.length,
        oldestItem: new Date(oldestTimestamp),
        newestItem: new Date(newestTimestamp),
        sizeByType,
        itemsByType
      };
    } catch (error) {
      console.error('获取缓存统计失败:', error);
      return {
        totalSize: 0,
        itemCount: 0,
        oldestItem: new Date(),
        newestItem: new Date(),
        sizeByType: {},
        itemsByType: {}
      };
    }
  }

  /**
   * 根据缓存键确定类型
   */
  private static getCacheType(key: string): string {
    if (key.startsWith('movie_details_')) return '电影详情';
    if (key.startsWith('tv_details_')) return '电视剧详情';
    if (key.startsWith('search_multi_')) return '多类型搜索';
    if (key.startsWith('search_movies_')) return '电影搜索';
    if (key.startsWith('search_tv_')) return '电视剧搜索';
    if (key.includes('images')) return '图片数据';
    if (key.includes('credits')) return '演职员信息';
    return '其他';
  }

  /**
   * 清理特定类型的缓存
   */
  static cleanupCacheByType(type: string): number {
    try {
      const cache = StorageService.get(StorageKey.TMDB_CACHE) || {};
      const entries = Object.entries(cache);
      let deletedCount = 0;

      entries.forEach(([key, value]) => {
        if (this.getCacheType(key) === type) {
          delete cache[key];
          deletedCount++;
        }
      });

      if (deletedCount > 0) {
        StorageService.set(StorageKey.TMDB_CACHE, cache);
      }

      return deletedCount;
    } catch (error) {
      console.error('清理缓存失败:', error);
      return 0;
    }
  }

  /**
   * 清理过期缓存
   */
  static cleanupExpiredCache(maxAgeHours: number = 24): number {
    try {
      const cache = StorageService.get(StorageKey.TMDB_CACHE) || {};
      const entries = Object.entries(cache);
      const now = Date.now();
      const maxAge = maxAgeHours * 60 * 60 * 1000;
      let deletedCount = 0;

      entries.forEach(([key, value]) => {
        const timestamp = (value as CacheItem<unknown>).timestamp || 0;
        if (now - timestamp > maxAge) {
          delete cache[key];
          deletedCount++;
        }
      });

      if (deletedCount > 0) {
        StorageService.set(StorageKey.TMDB_CACHE, cache);
      }

      return deletedCount;
    } catch (error) {
      console.error('清理过期缓存失败:', error);
      return 0;
    }
  }

  /**
   * 完全清空缓存
   */
  static clearAllCache(): void {
    try {
      StorageService.remove(StorageKey.TMDB_CACHE);
    } catch (error) {
      console.error('清空缓存失败:', error);
    }
  }

  /**
   * 优化缓存（保留重要和最新的数据）
   */
  static optimizeCache(): number {
    try {
      const cache = StorageService.get(StorageKey.TMDB_CACHE) || {};
      const entries = Object.entries(cache);
      const now = Date.now();
      
      // 重要缓存类型（保留时间更长）
      const importantTypes = ['电影详情', '电视剧详情'];
      const recentThreshold = 2 * 60 * 60 * 1000; // 2小时
      const importantThreshold = 7 * 24 * 60 * 60 * 1000; // 7天

      const optimizedCache: Record<string, unknown> = {};
      let deletedCount = 0;

      entries.forEach(([key, value]) => {
        const timestamp = (value as CacheItem<unknown>).timestamp || 0;
        const age = now - timestamp;
        const type = this.getCacheType(key);
        const isImportant = importantTypes.includes(type);

        // 保留条件：最近2小时的所有数据，或7天内的重要数据
        if (age < recentThreshold || (isImportant && age < importantThreshold)) {
          optimizedCache[key] = value;
        } else {
          deletedCount++;
        }
      });

      StorageService.set(StorageKey.TMDB_CACHE, optimizedCache);
      
      return deletedCount;
    } catch (error) {
      console.error('缓存优化失败:', error);
      return 0;
    }
  }

  /**
   * 格式化缓存大小
   */
  static formatSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * 打印缓存统计报告
   */
  static printCacheReport(): void {
    const stats = this.getCacheStats();
    
    Object.entries(stats.sizeByType).forEach(([type, size]) => {
      const count = stats.itemsByType[type] || 0;
    });
    console.groupEnd();
    
    console.groupEnd();
  }
}

// 导出全局缓存管理器实例
export const cacheManager = CacheManager;

// 在开发环境下暴露到全局对象，便于调试
if (typeof window !== 'undefined' && import.meta.env.DEV) {
  (window as unknown as Window & { cacheManager: typeof cacheManager }).cacheManager = cacheManager;
}
