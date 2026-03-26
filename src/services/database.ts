/**
 * 数据库服务兼容入口
 * 统一复用 src/services/database/ 下的真实实现，避免出现双轨迁移逻辑
 * @author yanstu
 */

export {
  DatabaseConnection,
  DatabaseSchema,
  DatabaseService,
  DatabaseUtils,
  MovieDAO,
  ReplayRecordDAO,
  StatisticsDAO
} from './database/index'
