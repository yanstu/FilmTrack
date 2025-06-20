/**
 * 数据库API服务
 * 提供数据库操作的API封装
 * @author yanstu
 */

import { invoke } from '@tauri-apps/api/core';
import type { ApiResponse, Movie, Statistics, WatchHistory } from '../types';
import { DatabaseService, MovieDAO, StatisticsDAO } from './database';
import { withApiResponse } from '../utils/api-utils';

/**
 * 数据库API服务类
 * 提供与数据库交互的高级API
 */
export class DatabaseApiService {
  /**
   * 初始化数据库
   */
  static async initDatabase(): Promise<ApiResponse<string>> {
    return withApiResponse(async () => {
      await DatabaseService.initialize();
      return 'Database initialized successfully';
    });
  }
  
  /**
   * 检查电影是否已存在
   * @param title 电影标题
   * @param externalId 外部ID（如TMDb ID）
   */
  static async checkExistingMovie(
    title: string, 
    externalId?: string
  ): Promise<ApiResponse<{ exists: boolean }>> {
    return withApiResponse(async () => {
      try {
        const result = await MovieDAO.getMovies();
        if (!result.success) {
          return { exists: false };
        }
        const movies = result.data;
        const exists = movies.some(movie => 
          movie.title === title || 
          (externalId && movie.tmdb_id?.toString() === externalId)
        );
        return { exists };
      } catch (error) {
        console.error('检查电影是否存在失败:', error);
        throw new Error(`检查电影是否存在失败: ${error}`);
      }
    });
  }
  
  /**
   * 获取电影列表
   * @param status 观看状态
   * @param limit 限制数量
   * @param offset 偏移量
   */
  static async getMovies(
    status?: string, 
    limit?: number, 
    offset?: number
  ): Promise<ApiResponse<Movie[]>> {
    return MovieDAO.getMovies(status, limit, offset);
  }
  
  /**
   * 添加电影
   * @param movie 电影数据
   */
  static async addMovie(movie: any): Promise<ApiResponse<Movie>> {
    return MovieDAO.addMovie(movie);
  }
  
  /**
   * 更新电影
   * @param movie 电影数据
   */
  static async updateMovie(movie: any): Promise<ApiResponse<Movie>> {
    return MovieDAO.updateMovie(movie);
  }
  
  /**
   * 删除电影
   * @param movieId 电影ID
   */
  static async deleteMovie(movieId: string): Promise<ApiResponse<string>> {
    return MovieDAO.deleteMovie(movieId);
  }
  
  /**
   * 获取电影详情
   * @param id 电影ID
   */
  static async getMovieById(id: string): Promise<ApiResponse<Movie | null>> {
    return MovieDAO.getMovieById(id);
  }
  
  /**
   * 添加观看历史
   * @param movieId 电影ID
   * @param notes 观看笔记
   */
  static async addWatchHistory(
    movieId: string, 
    notes?: string
  ): Promise<ApiResponse<WatchHistory>> {
    return withApiResponse(async () => {
      // 更新电影的观看时间
      const movie = await MovieDAO.getMovieById(movieId)
      if (movie.success && movie.data) {
        const updatedMovie = {
          ...movie.data,
          updated_at: new Date().toISOString(),
          notes: notes || movie.data.notes
        }
        const result = await MovieDAO.updateMovie(updatedMovie)
        if (result.success) {
          return {
            id: movieId,
            movie_id: movieId,
            watch_date: new Date().toISOString(),
            watched_date: new Date().toISOString(),
            notes: notes || null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          } as WatchHistory;
        }
      }
      throw new Error('电影不存在或更新失败');
    });
  }
  
  /**
   * 获取观看历史
   * @param movieId 电影ID（可选）
   * @param limit 限制数量
   */
  static async getWatchHistory(
    movieId?: string, 
    limit?: number
  ): Promise<ApiResponse<WatchHistory[]>> {
    return withApiResponse(async () => {
      const moviesResult = await MovieDAO.getMovies()
      if (moviesResult.success && moviesResult.data) {
        const moviesData = moviesResult.data
          .filter(movie => movieId ? movie.id === movieId : true);
          
        const historyData = moviesData
          .map(movie => ({
            id: movie.id,
            movie_id: movie.id,
            watch_date: movie.updated_at,
            watched_date: movie.updated_at,
            episode_number: movie.current_episode,
            season_number: movie.current_season,
            duration_minutes: null,
            duration: 0,
            progress: movie.status === 'completed' ? 1.0 : 0.5,
            notes: movie.notes,
            created_at: movie.created_at,
            updated_at: movie.updated_at
          } as WatchHistory))
          .sort((a, b) => new Date(b.watched_date).getTime() - new Date(a.watched_date).getTime())
          .slice(0, limit || 50);
        
        return historyData;
      }
      return [];
    });
  }
  
  /**
   * 获取统计数据
   */
  static async getStatistics(): Promise<ApiResponse<Statistics>> {
    return StatisticsDAO.getStatistics();
  }
  
  /**
   * 开始事务
   */
  static async beginTransaction(): Promise<ApiResponse<boolean>> {
    return withApiResponse(async () => {
      try {
        const db = await DatabaseService.getInstance();
        await db.execute('BEGIN TRANSACTION');
        return true;
      } catch (error) {
        console.error('开始事务失败:', error);
        throw new Error(`开始事务失败: ${error}`);
      }
    });
  }
  
  /**
   * 提交事务
   */
  static async commitTransaction(): Promise<ApiResponse<boolean>> {
    return withApiResponse(async () => {
      try {
        const db = await DatabaseService.getInstance();
        await db.execute('COMMIT');
        return true;
      } catch (error) {
        console.error('提交事务失败:', error);
        throw new Error(`提交事务失败: ${error}`);
      }
    });
  }
  
  /**
   * 回滚事务
   */
  static async rollbackTransaction(): Promise<ApiResponse<boolean>> {
    return withApiResponse(async () => {
      try {
        const db = await DatabaseService.getInstance();
        await db.execute('ROLLBACK');
        return true;
      } catch (error) {
        console.error('回滚事务失败:', error);
        throw new Error(`回滚事务失败: ${error}`);
      }
    });
  }
}

// 导出默认的数据库API实例
export const databaseAPI = {
  initDatabase: DatabaseApiService.initDatabase,
  checkExistingMovie: DatabaseApiService.checkExistingMovie,
  getMovies: DatabaseApiService.getMovies,
  addMovie: DatabaseApiService.addMovie,
  updateMovie: DatabaseApiService.updateMovie,
  deleteMovie: DatabaseApiService.deleteMovie,
  getMovieById: DatabaseApiService.getMovieById,
  addWatchHistory: DatabaseApiService.addWatchHistory,
  getWatchHistory: DatabaseApiService.getWatchHistory,
  getStatistics: DatabaseApiService.getStatistics,
  beginTransaction: DatabaseApiService.beginTransaction,
  commitTransaction: DatabaseApiService.commitTransaction,
  rollbackTransaction: DatabaseApiService.rollbackTransaction
}; 