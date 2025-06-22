/**
 * TMDb API 服务
 * 负责所有与TMDb API相关的操作
 * @author yanstu
 */

import axios from 'axios'
import { APP_CONFIG } from '../../config/app.config'
import type {
  TMDbResponse,
  TMDbMovie,
  TMDbMovieDetail,
  ApiResponse,
  Movie
} from '../types'
import { apiCache } from './api-cache'
import { tmdbQueue } from './request-queue'
import { generateSearchKeywords } from '../utils/titleUtils'

// 类型别名
export type TMDbSearchResponse = TMDbResponse<TMDbMovie>

/**
 * TMDb API 客户端配置
 */
const tmdbClient = axios.create({
  baseURL: APP_CONFIG.tmdb.baseUrl,
  params: {
    api_key: APP_CONFIG.tmdb.apiKey,
    language: 'zh-CN'
  }
})

/**
 * TMDb API 服务类
 */
export class TMDbService {
  /**
   * 通用API请求方法
   * @param endpoint API端点
   * @param params 请求参数
   * @param cacheKey 缓存键
   * @returns API响应
   */
  private static async _request<T>(
    endpoint: string, 
    params: Record<string, any> = {}, 
    cacheKey: string
  ): Promise<ApiResponse<T>> {
    // 检查缓存
    const cachedResult = apiCache.get<ApiResponse<T>>(cacheKey);
    if (cachedResult) {
      return cachedResult;
    }
    
    return tmdbQueue.add(async () => {
      try {
        const response = await tmdbClient.get<T>(endpoint, { params });
        const result = { success: true, data: response.data };
        
        // 缓存结果
        apiCache.set(cacheKey, result);
        
        return result;
      } catch (error) {
        console.error(`API请求失败 [${endpoint}]:`, error);
        return { 
          success: false, 
          error: `API请求失败: ${error instanceof Error ? error.message : '未知错误'}` 
        };
      }
    });
  }

  /**
   * 搜索电影
   */
  static async searchMovies(
    query: string, 
    page: number = 1
  ): Promise<ApiResponse<TMDbSearchResponse>> {
    if (!query) return { success: false, error: '搜索关键词不能为空' };
    
    // 生成搜索关键词
    const searchKeyword = generateSearchKeywords(query);
    
    // 生成缓存键
    const cacheKey = `search_movies_${searchKeyword}_${page}`;
    
    return this._request<TMDbSearchResponse>(
      '/search/movie',
      { query: searchKeyword, page, include_adult: true },
      cacheKey
    );
  }

  /**
   * 搜索电视剧
   */
  static async searchTVShows(
    query: string, 
    page: number = 1
  ): Promise<ApiResponse<TMDbSearchResponse>> {
    if (!query) return { success: false, error: '搜索关键词不能为空' };
    
    // 生成搜索关键词
    const searchKeyword = generateSearchKeywords(query);
    
    // 生成缓存键
    const cacheKey = `search_tv_${searchKeyword}_${page}`;
    
    return this._request<TMDbSearchResponse>(
      '/search/tv',
      { query: searchKeyword, page, include_adult: true },
      cacheKey
    );
  }

  /**
   * 搜索电影和电视剧
   */
  static async searchMulti(
    query: string, 
    page: number = 1
  ): Promise<ApiResponse<TMDbSearchResponse>> {
    if (!query) return { success: false, error: '搜索关键词不能为空' };
    
    // 生成搜索关键词
    const searchKeyword = generateSearchKeywords(query);
    
    // 生成缓存键
    const cacheKey = `search_multi_${searchKeyword}_${page}`;
    
    return this._request<TMDbSearchResponse>(
      '/search/multi',
      { query: searchKeyword, page, include_adult: true },
      cacheKey
    );
  }

  /**
   * 获取热门电影
   */
  static async getPopularMovies(
    page: number = 1
  ): Promise<ApiResponse<TMDbSearchResponse>> {
    // 生成缓存键
    const cacheKey = `popular_movies_${page}`;
    
    return this._request<TMDbSearchResponse>(
      '/movie/popular',
      { page },
      cacheKey
    );
  }

  /**
   * 获取热门电视剧
   */
  static async getPopularTV(
    page: number = 1
  ): Promise<ApiResponse<TMDbSearchResponse>> {
    // 生成缓存键
    const cacheKey = `popular_tv_${page}`;
    
    return this._request<TMDbSearchResponse>(
      '/tv/popular',
      { page },
      cacheKey
    );
  }

  /**
   * 获取电影详情
   */
  static async getMovieDetails(
    id: number
  ): Promise<ApiResponse<TMDbMovieDetail>> {
    if (!id) return { success: false, error: '电影ID不能为空' };
    
    // 生成缓存键
    const cacheKey = `movie_details_${id}`;
    
    return this._request<TMDbMovieDetail>(
      `/movie/${id}`,
      { append_to_response: 'credits,images,videos,recommendations' },
      cacheKey
    );
  }

  /**
   * 获取电视剧详情
   */
  static async getTVDetails(
    id: number
  ): Promise<ApiResponse<TMDbMovieDetail>> {
    if (!id) return { success: false, error: '电视剧ID不能为空' };
    
    // 生成缓存键
    const cacheKey = `tv_details_${id}`;
    
    return this._request<TMDbMovieDetail>(
      `/tv/${id}`,
      { append_to_response: 'credits,images,videos,recommendations' },
      cacheKey
    );
  }

  /**
   * 获取类型列表
   */
  static async getGenres(
    mediaType: 'movie' | 'tv'
  ): Promise<ApiResponse<any>> {
    // 生成缓存键
    const cacheKey = `genres_${mediaType}`;
    
    return this._request<any>(
      `/genre/${mediaType}/list`,
      {},
      cacheKey
    );
  }

  /**
   * 获取图片URL
   */
  static getImageURL(path: string): string {
    if (!path) return ''
    return `${APP_CONFIG.tmdb.imageBaseUrl}/w500${path}`
  }

  /**
   * 获取完整图片URL（带默认值）
   */
  static getFullImageURL(
    path: string | null, 
    defaultImage?: string
  ): string {
    if (!path) {
      return defaultImage || '/images/placeholder-movie.jpg'
    }
    return this.getImageURL(path)
  }
  
  /**
   * 获取影视作品的背景图片
   */
  static async loadBackdropImages(
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
            include_image_language: 'zh,null'
          }
        });
        const data = response.data;
        
        let backdropImages: string[] = [];
        
        if (data.backdrops && data.backdrops.length > 0) {
          // 使用最佳质量的剧照，优先取高分和高分辨率的图片，最多取5张
          backdropImages = data.backdrops
            .sort((a: any, b: any) => {
              // 先按投票数排序
              if (b.vote_count !== a.vote_count) {
                return b.vote_count - a.vote_count;
              }
              // 再按评分排序
              if (b.vote_average !== a.vote_average) {
                return b.vote_average - a.vote_average;
              }
              // 最后按分辨率排序
              return (b.width * b.height) - (a.width * a.height);
            })
            .slice(0, 5)
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
  }
}

/**
 * TMDb 数据转换工具
 */
export class TMDbTransformer {
  /**
   * 将TMDb电影数据转换为本地Movie格式
   */
  static tmdbToMovie(tmdbMovie: TMDbMovie): Partial<Movie> {
    // 根据媒体类型处理不同的字段
    const isMovie = tmdbMovie.media_type === 'movie' || 'title' in tmdbMovie;
    
    // 获取年份
    const releaseDate = isMovie 
      ? (tmdbMovie as any).release_date 
      : (tmdbMovie as any).first_air_date;
    const year = releaseDate ? new Date(releaseDate).getFullYear() : null;
    
    return {
      title: isMovie ? tmdbMovie.title : tmdbMovie.name || '',
      overview: tmdbMovie.overview || null,
      poster_path: tmdbMovie.poster_path || null,
      backdrop_path: tmdbMovie.backdrop_path || null,
      year: year || 0,
      vote_average: tmdbMovie.vote_average || 0,
      runtime: (tmdbMovie as any).runtime || null,
      genres: tmdbMovie.genre_ids ? this.genreIdsToNames(tmdbMovie.genre_ids) : null,
      status: 'planned' as const,
      personal_rating: null,
      watch_count: 0,
      tags: null
    }
  }

  /**
   * 将类型ID转换为类型名称（需要预先加载类型映射）
   */
  private static genreIdsToNames(genreIds: number[]): string[] {
    // 这里应该使用预加载的类型映射
    // 暂时返回ID字符串，实际使用时需要实现类型映射
    return genreIds.map(id => `Genre ${id}`)
  }

  /**
   * 格式化发布日期
   */
  static formatReleaseDate(dateString: string | null): string {
    if (!dateString) return '未知'
    
    try {
      const date = new Date(dateString)
      return date.getFullYear().toString()
    } catch {
      return '未知'
    }
  }

  /**
   * 格式化评分
   */
  static formatRating(rating: number): string {
    return rating.toFixed(1)
  }

  /**
   * 格式化时长
   */
  static formatRuntime(runtime: number | null): string {
    if (!runtime) return '未知'
    
    const hours = Math.floor(runtime / 60)
    const minutes = runtime % 60
    
    if (hours > 0) {
      return `${hours}小时${minutes}分钟`
    } else {
      return `${minutes}分钟`
    }
  }
}

// 导出默认的TMDb API实例
export const tmdbAPI = {
  searchMovies: TMDbService.searchMovies,
  searchTVShows: TMDbService.searchTVShows,
  searchMulti: TMDbService.searchMulti,
  getPopularMovies: TMDbService.getPopularMovies,
  getPopularTV: TMDbService.getPopularTV,
  getMovieDetails: TMDbService.getMovieDetails,
  getTVDetails: TMDbService.getTVDetails,
  getGenres: TMDbService.getGenres,
  getImageURL: TMDbService.getImageURL,
  getFullImageURL: TMDbService.getFullImageURL,
  loadBackdropImages: TMDbService.loadBackdropImages
} 