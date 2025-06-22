/**
 * API 工具函数
 * 包含TMDb API调用和数据库操作的封装
 * @author yanstu
 */

import { invoke } from '@tauri-apps/api/core';
import axios from 'axios';
import { APP_CONFIG } from '../../config/app.config';
import type {
  TMDbResponse,
  TMDbMovie,
  TMDbMovieDetail,
  ParsedMovie,
  WatchHistory,
  ApiResponse,
  Movie,
  Statistics,
} from '../types';
import { ref } from 'vue';
import { generateSearchKeywords, generateSearchVariants, cleanTitle } from './titleUtils';
import { generateTMDbSearchStrategies, calculateRelevanceScore, generateEnglishKeywords } from './tmdbSearchEnhancer';
import StorageService from './storage';
import { databaseAPI } from '../services/database-api';

// 类型别名
export type TMDbSearchResponse = TMDbResponse<TMDbMovie>;

// 请求队列类型定义
interface QueuedRequest {
  request: () => Promise<any>;
  resolve: (value: any) => void;
  reject: (error: any) => void;
}

// ==================== TMDb API 客户端 ====================

// 创建TMDb API客户端实例
const tmdbClient = axios.create({
  baseURL: APP_CONFIG.tmdb.baseUrl,
  params: {
    api_key: APP_CONFIG.tmdb.apiKey,
    language: 'zh-CN',
  },
});

// ==================== TMDb API 请求队列 ====================

// API请求队列
class RequestQueue {
  private queue: Array<() => Promise<any>> = [];
  private processing = false;
  private requestInterval = 1000; // 请求间隔，默认1秒

  constructor(interval?: number) {
    if (interval) {
      this.requestInterval = interval;
    }
  }

  // 添加请求到队列
  public add<T>(request: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await request();
          resolve(result);
          return result;
        } catch (error) {
          reject(error);
          throw error;
        }
      });

      if (!this.processing) {
        this.processQueue();
      }
    });
  }

  // 处理队列
  private async processQueue() {
    if (this.queue.length === 0) {
      this.processing = false;
      return;
    }

    this.processing = true;
    const request = this.queue.shift();

    if (request) {
      try {
        await request();
      } catch (error) {
        console.error('请求执行失败:', error);
      }

      // 等待指定时间后处理下一个请求
      await new Promise((resolve) => setTimeout(resolve, this.requestInterval));
      this.processQueue();
    }
  }

  // 设置请求间隔
  public setInterval(interval: number) {
    this.requestInterval = interval;
  }

  // 清空队列
  public clear() {
    this.queue = [];
  }

  // 获取队列长度
  public get length(): number {
    return this.queue.length;
  }
}

// 创建TMDb API请求队列实例
export const tmdbQueue = new RequestQueue(APP_CONFIG.tmdb.request.interval); // 使用配置的请求间隔

/**
 * TMDb API 接口
 *
 * 所有API调用遵循统一的模式：
 * 1. 生成缓存键
 * 2. 检查缓存，如果有缓存直接返回
 * 3. 使用tmdbQueue添加请求到队列
 * 4. 请求成功后缓存结果
 * 5. 返回标准格式的ApiResponse
 */
export const tmdbAPI = {
  // 通用API请求方法
  async _request(
    endpoint: string,
    params: Record<string, any> = {},
    cacheKey: string
  ): Promise<ApiResponse<any>> {
    // 检查缓存
    const cachedResult = apiCache.get(cacheKey) as ApiResponse<any> | null;
    if (cachedResult) {
      return cachedResult;
    }

    return tmdbQueue.add(async () => {
      try {
        const response = await tmdbClient.get(endpoint, { params });
        const result = { success: true, data: response.data };

        // 缓存结果
        apiCache.set(cacheKey, result);

        return result;
      } catch (error) {
        console.error(`API请求失败 [${endpoint}]:`, error);
        return { success: false, error: `API请求失败: ${error}` };
      }
    });
  },

  // 搜索电影（增强版）
  async searchMovies(
    query: string,
    page = 1
  ): Promise<ApiResponse<TMDbResponse<TMDbMovie>>> {
    if (!query) return { success: false, error: '搜索关键词不能为空' };

    // 使用增强的搜索变体生成
    const uniqueStrategies = generateSearchVariants(query);

    for (const searchKeyword of uniqueStrategies) {
      try {
        const cacheKey = `search_movies_${searchKeyword}_${page}`;
        const result = await this._request(
          '/search/movie',
          {
            query: searchKeyword,
            page,
            include_adult: true,
            language: 'zh-CN'
          },
          cacheKey
        );

        if (result.success && result.data?.results && result.data.results.length > 0) {
          return result;
        }
      } catch (error) {
        continue;
      }
    }

    return {
      success: true,
      data: { page: 1, results: [], total_pages: 0, total_results: 0 }
    };
  },

  // 搜索电视剧（增强版）
  async searchTVShows(
    query: string,
    page = 1
  ): Promise<ApiResponse<TMDbResponse<TMDbMovie>>> {
    if (!query) return { success: false, error: '搜索关键词不能为空' };

    // 使用增强的搜索变体生成
    const uniqueStrategies = generateSearchVariants(query);

    for (const searchKeyword of uniqueStrategies) {
      try {
        const cacheKey = `search_tv_${searchKeyword}_${page}`;
        const result = await this._request(
          '/search/tv',
          {
            query: searchKeyword,
            page,
            include_adult: true,
            language: 'zh-CN'
          },
          cacheKey
        );

        if (result.success && result.data?.results && result.data.results.length > 0) {
          return result;
        }
      } catch (error) {
        continue;
      }
    }

    return {
      success: true,
      data: { page: 1, results: [], total_pages: 0, total_results: 0 }
    };
  },

  // 多类型搜索（增强版）
  async searchMulti(
    query: string,
    page = 1
  ): Promise<ApiResponse<TMDbResponse<TMDbMovie>>> {
    if (!query) return { success: false, error: '搜索关键词不能为空' };

    // 使用增强的 TMDb 搜索策略
    const searchStrategies = generateTMDbSearchStrategies(query);

    // 添加英文关键词策略（如果是中文标题）
    const englishKeywords = generateEnglishKeywords(query);
    if (englishKeywords.length > 0) {
      searchStrategies.push(...englishKeywords);
    }

    let bestResult: any = null;
    let bestScore = 0;

    for (const searchKeyword of searchStrategies) {
      try {
        const cacheKey = `search_multi_${searchKeyword}_${page}`;

        const result = await this._request(
          '/search/multi',
          {
            query: searchKeyword,
            page,
            include_adult: false,
            language: 'zh-CN'
          },
          cacheKey
        );

        if (result.success && result.data?.results && result.data.results.length > 0) {
          const topResult = result.data.results[0];
          const relevanceScore = calculateRelevanceScore(query, topResult);

          if (relevanceScore > 0.8) {
            return result;
          }

          if (relevanceScore > bestScore) {
            bestScore = relevanceScore;
            bestResult = result;
          }
        }
      } catch (error) {
        continue;
      }
    }

    if (bestResult && bestScore > 0.3) {
      return bestResult;
    }
    return {
      success: true,
      data: {
        page: 1,
        results: [],
        total_pages: 0,
        total_results: 0
      }
    };
  },

  // 获取电影详情
  async getMovieDetails(
    movieId: number
  ): Promise<ApiResponse<TMDbMovieDetail>> {
    if (!movieId) return { success: false, error: '电影ID不能为空' };

    // 生成缓存键
    const cacheKey = `movie_details_${movieId}`;

    return this._request(
      `/movie/${movieId}`,
      { append_to_response: 'credits,images,videos,recommendations' },
      cacheKey
    );
  },

  // 获取电视剧详情
  async getTVDetails(tvId: number): Promise<ApiResponse<TMDbMovieDetail>> {
    if (!tvId) return { success: false, error: '电视剧ID不能为空' };

    // 生成缓存键
    const cacheKey = `tv_details_${tvId}`;

    return this._request(
      `/tv/${tvId}`,
      { append_to_response: 'credits,images,videos,recommendations' },
      cacheKey
    );
  },

  // 获取热门电影
  async getPopularMovies(
    page: number = 1
  ): Promise<ApiResponse<TMDbResponse<TMDbMovie>>> {
    // 生成缓存键
    const cacheKey = `popular_movies_${page}`;

    return this._request('/movie/popular', { page }, cacheKey);
  },

  // 获取热门电视剧
  async getPopularTV(
    page: number = 1
  ): Promise<ApiResponse<TMDbResponse<TMDbMovie>>> {
    // 生成缓存键
    const cacheKey = `popular_tv_${page}`;

    return this._request('/tv/popular', { page }, cacheKey);
  },

  // 获取图片URL
  getImageURL(path: string): string {
    if (!path) return '';
    return `${APP_CONFIG.tmdb.imageBaseUrl}/w500${path}`;
  },



  // 获取类型列表
  async getGenres(mediaType: 'movie' | 'tv'): Promise<ApiResponse<any>> {
    // 生成缓存键
    const cacheKey = `genres_${mediaType}`;

    return this._request(`/genre/${mediaType}/list`, {}, cacheKey);
  },

  // 获取影视作品的背景图片
  async loadBackdropImages(
    tmdbId: number,
    mediaType: 'movie' | 'tv'
  ): Promise<string[]> {
    if (!tmdbId) return [];

    // 生成缓存键
    const cacheKey = `backdrops_${mediaType}_${tmdbId}`;

    // 检查缓存
    const cachedResult = apiCache.get<string[]>(cacheKey);
    if (cachedResult) {
      return cachedResult;
    }

    return tmdbQueue.add(async () => {
      try {
        const endpoint = `/${mediaType}/${tmdbId}/images`;
        const response = await tmdbClient.get(endpoint, {
          params: {
            include_image_language: 'zh,null',
          },
        });
        const data = response.data;

        let backdropImages: string[] = [];

        if (data.backdrops && data.backdrops.length > 0) {
          backdropImages = data.backdrops
            .sort((a: any, b: any) => b.vote_average - a.vote_average)
            .slice(0, 3)
            .map((img: any) => img.file_path);

          // 缓存结果
          apiCache.set(cacheKey, backdropImages);
        }

        return backdropImages;
      } catch (error) {
        console.error('获取剧照失败:', error);
        return [];
      }
    });
  },

  // 缓存健康检查
  performCacheHealthCheck(): void {
    try {
      const stats = apiCache.getStats();
      const cacheSize = parseInt(stats.size.replace('KB', '')) * 1024;

      if (cacheSize > 3 * 1024 * 1024) { // 超过3MB
        apiCache.cleanupExpiredCache();
      }
    } catch (error) {
      // 静默处理错误
    }
  },

  // 获取缓存统计
  getCacheStats(): any {
    return apiCache.getStats();
  },

  // 清理缓存
  clearCache(): void {
    apiCache.clear();
  }
};

// ==================== 响应包装器 ====================

/**
 * API响应包装器
 * @param fn 异步函数
 */
export async function withApiResponse<T>(
  fn: () => Promise<T>
): Promise<ApiResponse<T>> {
  try {
    const data = await fn();
    return {
      success: true,
      data,
      error: undefined,
    };
  } catch (error) {
    return {
      success: false,
      data: undefined,
      error: error instanceof Error ? error.message : '未知错误',
    };
  }
}

// ==================== 工具函数 ====================

/**
 * 延迟函数
 * @param ms 毫秒数
 */
export const delay = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * 防抖函数
 * @param fn 函数
 * @param delay 延迟时间
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: number | null = null;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };

    if (timeout !== null) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait) as unknown as number;
  };
}

/**
 * 节流函数
 * @param fn 函数
 * @param limit 时间限制
 */
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};

// 数据转换工具
export const transformTMDbToMovie = (tmdbMovie: TMDbMovie): any => {
  return {
    title: tmdbMovie.title || tmdbMovie.name || '',
    original_title: tmdbMovie.original_title || tmdbMovie.original_name || '',
    overview: tmdbMovie.overview || '',
    poster: tmdbMovie.poster_path || '',
    backdrop: tmdbMovie.backdrop_path || '',
    year: tmdbMovie.release_date
      ? new Date(tmdbMovie.release_date).getFullYear()
      : tmdbMovie.first_air_date
      ? new Date(tmdbMovie.first_air_date).getFullYear()
      : null,
    type: tmdbMovie.media_type || (tmdbMovie.title ? 'movie' : 'tv'),
    tmdb_rating: tmdbMovie.vote_average || 0,
    genres: tmdbMovie.genre_ids?.join(',') || '',
    status: 'planned',
    date_added: new Date().toISOString(),
    date_updated: new Date().toISOString(),
  };
};

// 错误处理工具
export const handleAPIError = (error: any): string => {
  if (error.response) {
    return (
      error.response.data?.message || error.response.statusText || '请求失败'
    );
  } else if (error.request) {
    return '网络连接失败';
  } else {
    return error.message || '未知错误';
  }
};

// 添加本地缓存功能
interface CacheItem<T> {
  data: T;
  timestamp: number;
}

class ApiCache {
  private cache: Record<string, CacheItem<any>> = {};
  private expirationTime: number = 24 * 60 * 60 * 1000; // 默认缓存24小时
  private maxCacheSize: number = 200; // 每个类型最大缓存项数量
  private maxStorageSize: number = 2 * 1024 * 1024; // 每个类型最大存储大小 2MB

  // 缓存类型映射
  private cacheTypes = {
    'movie_details_': 'movie-details',
    'tv_details_': 'tv-details',
    'search_multi_': 'search-multi',
    'search_movies_': 'search-movies',
    'search_tv_': 'search-tv',
    'backdrops_movie_': 'backdrops-movie',
    'backdrops_tv_': 'backdrops-tv',
    'popular_movies_': 'popular-movies',
    'popular_tv_': 'popular-tv',
    'genres_': 'genres'
  };

  constructor(expirationTimeInHours?: number) {
    if (expirationTimeInHours) {
      this.expirationTime = expirationTimeInHours * 60 * 60 * 1000;
    }

    // 从存储加载缓存
    this.loadFromStorage();

    // 启动时清理过期缓存
    this.cleanupExpiredCache();
  }

  // 获取缓存类型
  private getCacheType(key: string): string {
    for (const [prefix, type] of Object.entries(this.cacheTypes)) {
      if (key.startsWith(prefix)) {
        return type;
      }
    }
    return 'other';
  }

  // 获取缓存项
  public get<T>(key: string): T | null {
    const item = this.cache[key];

    if (!item) {
      // 尝试从分离存储中加载
      this.loadSpecificCache(key);
      const reloadedItem = this.cache[key];
      if (!reloadedItem) return null;

      // 检查是否过期
      if (Date.now() - reloadedItem.timestamp > this.expirationTime) {
        this.delete(key);
        return null;
      }

      return reloadedItem.data as T;
    }

    // 检查是否过期
    if (Date.now() - item.timestamp > this.expirationTime) {
      this.delete(key);
      return null;
    }

    return item.data as T;
  }

  // 设置缓存项
  public set<T>(key: string, data: T): void {
    const cacheType = this.getCacheType(key);

    // 检查该类型的缓存大小限制
    const typeKeys = Object.keys(this.cache).filter(k => this.getCacheType(k) === cacheType);
    if (typeKeys.length >= this.maxCacheSize) {
      this.cleanupOldestCacheByType(cacheType);
    }

    this.cache[key] = {
      data,
      timestamp: Date.now(),
    };

    // 保存到分离存储
    this.saveSpecificCache(key);
  }

  // 删除缓存项
  public delete(key: string): void {
    delete this.cache[key];
    this.deleteSpecificCache(key);
  }

  // 加载特定缓存项
  private loadSpecificCache(key: string): void {
    try {
      const cacheType = this.getCacheType(key);
      const storageKey = `filmtrack-tmdb-${cacheType}`;
      const typeCache = StorageService.get<Record<string, CacheItem<any>>>(storageKey as any, {});

      if (typeCache && typeCache[key]) {
        this.cache[key] = typeCache[key];
      }
    } catch (error) {
      // 静默处理加载错误
    }
  }

  // 保存特定缓存项
  private saveSpecificCache(key: string): void {
    try {
      const cacheType = this.getCacheType(key);
      const storageKey = `filmtrack-tmdb-${cacheType}`;

      // 获取该类型的所有缓存
      const typeCache = StorageService.get<Record<string, CacheItem<any>>>(storageKey as any, {});
      typeCache[key] = this.cache[key];

      // 检查大小限制
      const cacheString = JSON.stringify(typeCache);
      const cacheSize = new Blob([cacheString]).size;

      if (cacheSize > this.maxStorageSize) {
        this.cleanupTypeCacheBySize(cacheType, typeCache, storageKey);
        return;
      }

      StorageService.set(storageKey as any, typeCache);
    } catch (error: any) {
      if (error.name === 'QuotaExceededError') {
        const cacheType = this.getCacheType(key);
        this.emergencyCleanupType(cacheType);
      }
    }
  }

  // 删除特定缓存项
  private deleteSpecificCache(key: string): void {
    try {
      const cacheType = this.getCacheType(key);
      const storageKey = `filmtrack-tmdb-${cacheType}`;
      const typeCache = StorageService.get<Record<string, CacheItem<any>>>(storageKey as any, {});

      if (typeCache && typeCache[key]) {
        delete typeCache[key];
        StorageService.set(storageKey as any, typeCache);
      }
    } catch (error) {
      // 静默处理删除错误
    }
  }



  // 保存到存储（已废弃，使用分离式存储）
  private saveToStorage(): void {
    // 分离式存储不需要统一保存
  }

  // 从存储加载（分离式加载）
  private loadFromStorage(): void {
    try {
      // 分离式存储按需加载，这里只初始化空缓存
      this.cache = {};
    } catch (error) {
      this.cache = {};
    }
  }

  // 清理过期缓存
  public cleanupExpiredCache(): void {
    const now = Date.now();
    let cleanedCount = 0;

    Object.keys(this.cache).forEach(key => {
      const item = this.cache[key];
      if (now - item.timestamp > this.expirationTime) {
        delete this.cache[key];
        cleanedCount++;
      }
    });

    if (cleanedCount > 0) {
      this.saveToStorage();
    }
  }



  // 按类型清理最旧的缓存项
  private cleanupOldestCacheByType(cacheType: string): void {
    const typeKeys = Object.keys(this.cache).filter(k => this.getCacheType(k) === cacheType);
    const entries = typeKeys.map(key => [key, this.cache[key]] as [string, CacheItem<any>]);

    // 按时间戳排序，删除最旧的 20%
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
    const deleteCount = Math.floor(entries.length * 0.2);

    for (let i = 0; i < deleteCount; i++) {
      delete this.cache[entries[i][0]];
    }

    // 静默清理
  }

  // 按大小清理类型缓存
  private cleanupTypeCacheBySize(_cacheType: string, typeCache: Record<string, CacheItem<any>>, storageKey: string): void {
    const entries = Object.entries(typeCache);

    // 计算每个缓存项的大小
    const entriesWithSize = entries.map(([key, value]) => ({
      key,
      value,
      size: JSON.stringify(value).length
    }));

    // 按大小排序，删除最大的项目
    entriesWithSize.sort((a, b) => b.size - a.size);

    let deletedSize = 0;
    let deletedCount = 0;
    const targetSize = this.maxStorageSize * 0.7; // 清理到70%

    for (const entry of entriesWithSize) {
      delete typeCache[entry.key];
      delete this.cache[entry.key];
      deletedSize += entry.size;
      deletedCount++;

      const remainingSize = JSON.stringify(typeCache).length;
      if (remainingSize < targetSize) break;
    }

    // 静默清理
    StorageService.set(storageKey as any, typeCache);
  }

  // 紧急清理特定类型
  private emergencyCleanupType(cacheType: string): void {
    const storageKey = `filmtrack-tmdb-${cacheType}`;
    const typeKeys = Object.keys(this.cache).filter(k => this.getCacheType(k) === cacheType);
    const now = Date.now();
    const recentThreshold = 60 * 60 * 1000; // 1小时

    const newTypeCache: Record<string, CacheItem<any>> = {};

    typeKeys.forEach(key => {
      const item = this.cache[key];
      if (now - item.timestamp < recentThreshold) {
        newTypeCache[key] = item;
      } else {
        delete this.cache[key];
      }
    });

    try {
      StorageService.set(storageKey as any, newTypeCache);
    } catch (error) {
      StorageService.remove(storageKey as any);
      typeKeys.forEach(key => delete this.cache[key]);
    }
  }



  // 清空所有缓存
  public clear(): void {
    this.cache = {};
    try {
      // 清空所有分离式缓存
      Object.values(this.cacheTypes).forEach(type => {
        const storageKey = `filmtrack-tmdb-${type}`;
        StorageService.remove(storageKey as any);
      });
    } catch (error) {
      // 静默处理错误
    }
  }

  // 获取缓存统计信息
  public getStats(): { count: number; size: string; oldestItem: string } {
    const count = Object.keys(this.cache).length;
    const cacheString = JSON.stringify(this.cache);
    const size = `${(new Blob([cacheString]).size / 1024).toFixed(2)}KB`;

    let oldestTimestamp = Date.now();
    Object.values(this.cache).forEach(item => {
      if (item.timestamp < oldestTimestamp) {
        oldestTimestamp = item.timestamp;
      }
    });

    const oldestItem = new Date(oldestTimestamp).toLocaleString();

    return { count, size, oldestItem };
  }
}

// 创建API缓存实例
export const apiCache = new ApiCache(APP_CONFIG.tmdb.request.cacheTimeInHours);
