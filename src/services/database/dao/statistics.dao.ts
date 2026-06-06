/**
 * 统计数据访问对象
 * 提供统计数据的查询操作
 * @author yanstu
 */

import type { ApiResponse, Statistics, DatabaseRow } from '../../../types'
import { DatabaseConnection } from '../connection'

/**
 * 统计数据访问对象
 */
export class StatisticsDAO {
  /**
   * 获取统计数据
   * 汇总电影数据的统计信息
   */
  static async getStatistics(): Promise<ApiResponse<Statistics>> {
    try {
      const db = await DatabaseConnection.getInstance()
      
      // 并行执行所有统计查询
      const [
        totalMoviesResult,
        completedMoviesResult,
        averageRatingResult,
        monthlyResult,
        yearlyResult
      ] = await Promise.all([
        db.select('SELECT COUNT(*) as count FROM movies'),
        db.select('SELECT COUNT(*) as count FROM movies WHERE status = $1', ['completed']),
        db.select('SELECT AVG(CAST(personal_rating as REAL)) as avg_rating FROM movies WHERE personal_rating IS NOT NULL AND personal_rating > 0'),
        db.select("SELECT COUNT(*) as count FROM movies WHERE created_at >= date('now', 'start of month')"),
        db.select("SELECT COUNT(*) as count FROM movies WHERE created_at >= date('now', 'start of year')")
      ])
      
      const statistics: Statistics = {
        total_movies: (totalMoviesResult as DatabaseRow[])[0]?.count as number || 0,
        completed_movies: (completedMoviesResult as DatabaseRow[])[0]?.count as number || 0,
        average_rating: (averageRatingResult as DatabaseRow[])[0]?.avg_rating as number || 0.0,
        movies_this_month: (monthlyResult as DatabaseRow[])[0]?.count as number || 0,
        movies_this_year: (yearlyResult as DatabaseRow[])[0]?.count as number || 0
      }
      
      return { success: true, data: statistics }
    } catch (error) {
      return { success: false, error: `获取统计数据失败: ${error}` }
    }
  }
}