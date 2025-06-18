/**
 * API 工具函数
 * 包含TMDb API调用和数据库操作的封装
 * @author yanstu
 */

import { invoke } from '@tauri-apps/api/core'
import axios from 'axios'
import { APP_CONFIG } from '../../config/app.config'
import type {
  TMDbResponse,
  TMDbMovie,
  TMDbMovieDetail,
  ParsedMovie,
  WatchHistory,
  Tag,
  ApiResponse,
  Movie,
  Statistics
} from '../types'
import { 
  DatabaseService, 
  MovieDAO, 
  StatisticsDAO,
  TagDAO
} from '../services/database'

// 类型别名
export type TMDbSearchResponse = TMDbResponse<TMDbMovie>

// ==================== TMDb API 客户端 ====================

const tmdbClient = axios.create({
  baseURL: APP_CONFIG.tmdb.baseUrl,
  params: {
    api_key: APP_CONFIG.tmdb.apiKey,
    language: 'zh-CN'
  }
})

export const tmdbAPI = {
  // 搜索电影和电视剧
  async searchMulti(query: string, page: number = 1): Promise<TMDbSearchResponse> {
    const response = await tmdbClient.get('/search/multi', {
      params: { query, page }
    })
    return response.data
  },

  // 获取热门电影
  async getPopularMovies(page: number = 1): Promise<TMDbSearchResponse> {
    const response = await tmdbClient.get('/movie/popular', {
      params: { page }
    })
    return response.data
  },

  // 获取热门电视剧
  async getPopularTV(page: number = 1): Promise<TMDbSearchResponse> {
    const response = await tmdbClient.get('/tv/popular', {
      params: { page }
    })
    return response.data
  },

  // 获取电影详情
  async getMovieDetails(id: number): Promise<TMDbMovie> {
    const response = await tmdbClient.get(`/movie/${id}`)
    return response.data
  },

  // 获取电视剧详情
  async getTVDetails(id: number): Promise<TMDbMovie> {
    const response = await tmdbClient.get(`/tv/${id}`)
    return response.data
  },

  // 获取图片URL
  getImageURL(path: string, size: string = 'w500'): string {
    return `${APP_CONFIG.tmdb.imageBaseUrl}/${size}${path}`
  },

  // 获取类型列表
  async getGenres(mediaType: 'movie' | 'tv'): Promise<any> {
    const response = await tmdbClient.get(`/genre/${mediaType}/list`)
    return response.data
  }
}

// ==================== 数据库操作封装 ====================

export const databaseAPI = {
  // 初始化数据库
  async initDatabase() {
    await DatabaseService.connect()
    return { success: true, data: 'Database initialized successfully' }
  },

  // 获取电影列表
  async getMovies(status?: string, limit?: number, offset?: number) {
    return await MovieDAO.getMovies(status, limit, offset)
  },

  // 添加电影
  async addMovie(movie: any) {
    return await MovieDAO.addMovie(movie)
  },

  // 更新电影
  async updateMovie(movie: any) {
    return await MovieDAO.updateMovie(movie)
  },

  // 删除电影
  async deleteMovie(movieId: string) {
    return await MovieDAO.deleteMovie(movieId)
  },

  // 根据ID获取电影
  async getMovieById(id: string) {
    return await MovieDAO.getMovieById(id)
  },

  // 添加观看历史（基于movies表模拟）
  async addWatchHistory(movieId: string, notes?: string) {
    // 更新电影的观看时间
    const movie = await MovieDAO.getMovieById(movieId)
    if (movie.success && movie.data) {
      const updatedMovie = {
        ...movie.data,
        updated_at: new Date().toISOString(),
        notes: notes || movie.data.notes
      }
      return await MovieDAO.updateMovie(updatedMovie)
    }
    return { success: false, error: '电影不存在' }
  },

  // 获取观看历史（基于movies表）
  async getWatchHistory(movieId?: string, limit?: number) {
    const moviesResult = await MovieDAO.getMovies()
    if (moviesResult.success && moviesResult.data) {
      const historyData = moviesResult.data
        .filter(movie => movieId ? movie.id === movieId : true)
        .map(movie => ({
          id: movie.id,
          movie_id: movie.id,
          watch_date: movie.updated_at,
          watched_date: movie.updated_at,
          episode_number: movie.current_episode,
          season_number: movie.current_season,
          duration_minutes: null,
          progress: movie.status === 'completed' ? 1.0 : 0.5,
          notes: movie.notes,
          created_at: movie.created_at
        }))
        .sort((a, b) => new Date(b.watched_date).getTime() - new Date(a.watched_date).getTime())
        .slice(0, limit || 50)
      
      return { success: true, data: historyData }
    }
    return { success: false, error: '获取观看历史失败' }
  },

  // 获取统计数据
  async getStatistics() {
    return await StatisticsDAO.getStatistics()
  },

  // 获取标签
  async getTags() {
    return await TagDAO.getTags()
  }
}

// ==================== 响应包装器 ====================

/**
 * API响应包装器
 * @param fn 异步函数
 */
export async function withApiResponse<T>(fn: () => Promise<T>): Promise<ApiResponse<T>> {
  try {
    const data = await fn()
    return {
      success: true,
      data,
      error: undefined
    }
  } catch (error) {
    return {
      success: false,
      data: undefined,
      error: error instanceof Error ? error.message : '未知错误'
    }
  }
}

// ==================== 工具函数 ====================

/**
 * 延迟函数
 * @param ms 毫秒数
 */
export const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

/**
 * 防抖函数
 * @param fn 函数
 * @param delay 延迟时间
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: number | null = null
  
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null
      func(...args)
    }
    
    if (timeout !== null) {
      clearTimeout(timeout)
    }
    timeout = setTimeout(later, wait) as unknown as number
  }
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
  let inThrottle: boolean
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => inThrottle = false, limit)
    }
  }
}

// 数据转换工具
export const transformTMDbToMovie = (tmdbMovie: TMDbMovie): any => {
  return {
    title: tmdbMovie.title || tmdbMovie.name || '',
    original_title: tmdbMovie.original_title || tmdbMovie.original_name || '',
    overview: tmdbMovie.overview || '',
    poster: tmdbMovie.poster_path || '',
    backdrop: tmdbMovie.backdrop_path || '',
    year: tmdbMovie.release_date ? new Date(tmdbMovie.release_date).getFullYear() : 
          tmdbMovie.first_air_date ? new Date(tmdbMovie.first_air_date).getFullYear() : null,
    type: tmdbMovie.media_type || (tmdbMovie.title ? 'movie' : 'tv'),
    tmdb_rating: tmdbMovie.vote_average || 0,
    genres: tmdbMovie.genre_ids?.join(',') || '',
    status: 'planned',
    date_added: new Date().toISOString(),
    date_updated: new Date().toISOString()
  }
}

// 错误处理工具
export const handleAPIError = (error: any): string => {
  if (error.response) {
    return error.response.data?.message || error.response.statusText || '请求失败'
  } else if (error.request) {
    return '网络连接失败'
  } else {
    return error.message || '未知错误'
  }
} 