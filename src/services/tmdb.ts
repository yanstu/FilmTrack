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
   * 搜索电影和电视剧
   */
  static async searchMulti(
    query: string, 
    page: number = 1
  ): Promise<ApiResponse<TMDbSearchResponse>> {
    try {
      const response = await tmdbClient.get('/search/multi', {
        params: { query, page }
      })
      return { success: true, data: response.data }
    } catch (error) {
      return { 
        success: false, 
        error: `搜索失败: ${error instanceof Error ? error.message : '未知错误'}` 
      }
    }
  }

  /**
   * 获取热门电影
   */
  static async getPopularMovies(
    page: number = 1
  ): Promise<ApiResponse<TMDbSearchResponse>> {
    try {
      const response = await tmdbClient.get('/movie/popular', {
        params: { page }
      })
      return { success: true, data: response.data }
    } catch (error) {
      return { 
        success: false, 
        error: `获取热门电影失败: ${error instanceof Error ? error.message : '未知错误'}` 
      }
    }
  }

  /**
   * 获取热门电视剧
   */
  static async getPopularTV(
    page: number = 1
  ): Promise<ApiResponse<TMDbSearchResponse>> {
    try {
      const response = await tmdbClient.get('/tv/popular', {
        params: { page }
      })
      return { success: true, data: response.data }
    } catch (error) {
      return { 
        success: false, 
        error: `获取热门电视剧失败: ${error instanceof Error ? error.message : '未知错误'}` 
      }
    }
  }

  /**
   * 获取电影详情
   */
  static async getMovieDetails(
    id: number
  ): Promise<ApiResponse<TMDbMovieDetail>> {
    try {
      const response = await tmdbClient.get(`/movie/${id}`)
      return { success: true, data: response.data }
    } catch (error) {
      return { 
        success: false, 
        error: `获取电影详情失败: ${error instanceof Error ? error.message : '未知错误'}` 
      }
    }
  }

  /**
   * 获取电视剧详情
   */
  static async getTVDetails(
    id: number
  ): Promise<ApiResponse<TMDbMovieDetail>> {
    try {
      const response = await tmdbClient.get(`/tv/${id}`)
      return { success: true, data: response.data }
    } catch (error) {
      return { 
        success: false, 
        error: `获取电视剧详情失败: ${error instanceof Error ? error.message : '未知错误'}` 
      }
    }
  }

  /**
   * 获取类型列表
   */
  static async getGenres(
    mediaType: 'movie' | 'tv'
  ): Promise<ApiResponse<any>> {
    try {
      const response = await tmdbClient.get(`/genre/${mediaType}/list`)
      return { success: true, data: response.data }
    } catch (error) {
      return { 
        success: false, 
        error: `获取类型列表失败: ${error instanceof Error ? error.message : '未知错误'}` 
      }
    }
  }

  /**
   * 获取图片URL
   */
  static getImageURL(path: string, size: string = 'w500'): string {
    if (!path) return ''
    return `${APP_CONFIG.tmdb.imageBaseUrl}/${size}${path}`
  }

  /**
   * 获取完整图片URL（带默认值）
   */
  static getFullImageURL(
    path: string | null, 
    size: string = 'w500',
    defaultImage?: string
  ): string {
    if (!path) {
      return defaultImage || '/images/placeholder-movie.jpg'
    }
    return this.getImageURL(path, size)
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
    return {
      title: tmdbMovie.title || tmdbMovie.name || '',
      overview: tmdbMovie.overview || null,
      poster_path: tmdbMovie.poster_path || null,
      backdrop_path: tmdbMovie.backdrop_path || null,
      release_date: tmdbMovie.release_date || tmdbMovie.first_air_date || null,
      vote_average: tmdbMovie.vote_average || 0,
      runtime: tmdbMovie.runtime || null,
      genres: tmdbMovie.genre_ids ? this.genreIdsToNames(tmdbMovie.genre_ids) : null,
      status: 'planned' as const,
      user_rating: null,
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
  searchMulti: TMDbService.searchMulti,
  getPopularMovies: TMDbService.getPopularMovies,
  getPopularTV: TMDbService.getPopularTV,
  getMovieDetails: TMDbService.getMovieDetails,
  getTVDetails: TMDbService.getTVDetails,
  getGenres: TMDbService.getGenres,
  getImageURL: TMDbService.getImageURL,
  getFullImageURL: TMDbService.getFullImageURL
} 