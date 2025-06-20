/**
 * 数据库服务
 * 导出所有数据库相关服务
 * @author yanstu
 */

// 导出数据库连接管理
export { DatabaseConnection } from './connection'

// 导出数据库表结构管理
export { DatabaseSchema } from './schema'

// 导出数据库工具类
export { DatabaseUtils } from './utils'

// 导出数据访问对象
export { MovieDAO } from './dao/movie.dao'
export { StatisticsDAO } from './dao/statistics.dao'

// 为了向后兼容，保留原始的DatabaseService别名
import { DatabaseConnection } from './connection'
import { DatabaseSchema } from './schema'

/**
 * 数据库服务类（兼容旧版API）
 */
export class DatabaseService {
  // 保持与旧版API兼容的静态方法
  static async connect() {
    return DatabaseConnection.connect()
  }
  
  static async getInstance() {
    return DatabaseConnection.getInstance()
  }
  
  static async close() {
    return DatabaseConnection.close()
  }
  
  static async initialize() {
    await DatabaseConnection.initialize()
    await DatabaseSchema.ensureTableStructure()
  }
  
  static async ensureTableStructure() {
    return DatabaseSchema.ensureTableStructure()
  }
} 