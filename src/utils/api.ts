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
import { generateSearchKeywords, cleanTitle } from './titleUtils';
import StorageService, { StorageKey } from './storage';
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

  // 搜索电影
  async searchMovies(
    query: string,
    page = 1
  ): Promise<ApiResponse<TMDbResponse<TMDbMovie>>> {
    if (!query) return { success: false, error: '搜索关键词不能为空' };

    // 生成搜索关键词
    const searchKeyword = generateSearchKeywords(query);

    // 生成缓存键
    const cacheKey = `search_movies_${searchKeyword}_${page}`;

    return this._request(
      '/search/movie',
      { query: searchKeyword, page, include_adult: false },
      cacheKey
    );
  },

  // 搜索电视剧
  async searchTVShows(
    query: string,
    page = 1
  ): Promise<ApiResponse<TMDbResponse<TMDbMovie>>> {
    if (!query) return { success: false, error: '搜索关键词不能为空' };

    // 生成搜索关键词
    const searchKeyword = generateSearchKeywords(query);

    // 生成缓存键
    const cacheKey = `search_tv_${searchKeyword}_${page}`;

    return this._request(
      '/search/tv',
      { query: searchKeyword, page, include_adult: false },
      cacheKey
    );
  },

  // 多类型搜索
  async searchMulti(
    query: string,
    page = 1
  ): Promise<ApiResponse<TMDbResponse<TMDbMovie>>> {
    if (!query) return { success: false, error: '搜索关键词不能为空' };

    // 生成搜索关键词
    const searchKeyword = generateSearchKeywords(query);

    // 生成缓存键
    const cacheKey = `search_multi_${searchKeyword}_${page}`;

    return this._request(
      '/search/multi',
      { query: searchKeyword, page, include_adult: false },
      cacheKey
    );
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

  // 获取缓存的图片URL
  async getCachedImageURL(path: string): Promise<string> {
    if (!path) return '';
    const imageUrl = this.getImageURL(path);
    // 这里可以添加图片缓存逻辑
    return imageUrl;
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

  constructor(expirationTimeInHours?: number) {
    if (expirationTimeInHours) {
      this.expirationTime = expirationTimeInHours * 60 * 60 * 1000;
    }

    // 从存储加载缓存
    this.loadFromStorage();
  }

  // 获取缓存项
  public get<T>(key: string): T | null {
    const item = this.cache[key];

    if (!item) return null;

    // 检查是否过期
    if (Date.now() - item.timestamp > this.expirationTime) {
      this.delete(key);
      return null;
    }

    return item.data as T;
  }

  // 设置缓存项
  public set<T>(key: string, data: T): void {
    this.cache[key] = {
      data,
      timestamp: Date.now(),
    };

    // 保存到存储
    this.saveToStorage();
  }

  // 删除缓存项
  public delete(key: string): void {
    delete this.cache[key];
    this.saveToStorage();
  }

  // 清空缓存
  public clear(): void {
    this.cache = {};
    // 使用set而不是remove，确保格式一致
    StorageService.set(StorageKey.TMDB_CACHE, {});
  }

  // 保存到存储
  private saveToStorage(): void {
    try {
      StorageService.set(StorageKey.TMDB_CACHE, this.cache);
    } catch (error) {
      console.error('保存缓存到存储失败:', error);
    }
  }

  // 从存储加载
  private loadFromStorage(): void {
    try {
      const cached = StorageService.get<Record<string, CacheItem<any>>>(
        StorageKey.TMDB_CACHE,
        {}
      );
      if (cached) {
        this.cache = cached;
      } else {
        this.cache = {};
      }
    } catch (error) {
      console.error('从存储加载缓存失败:', error);
      this.cache = {};
      // 重置缓存
      try {
        StorageService.set(StorageKey.TMDB_CACHE, {});
      } catch (e) {
        console.error('重置TMDB缓存失败:', e);
      }
    }
  }
}

// 创建API缓存实例
export const apiCache = new ApiCache(APP_CONFIG.tmdb.request.cacheTimeInHours);
