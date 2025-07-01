/**
 * FilmTrack 应用配置
 * @author yanstu
 */

export const APP_CONFIG = {
  // 应用基础信息
  app: {
    name: 'FilmTrack',
    description: '个人影视管理平台',
  },

  // TMDb API配置
  tmdb: {
    apiKey: '06e492fa8930c108b57945b4fda6f397',
    baseUrl: 'https://api.themoviedb.org/3',
    imageBaseUrl: 'https://image.tmdb.org/t/p',
    // API请求配置
    request: {
      interval: 200, // 请求间隔，毫秒
      timeout: 10000, // 请求超时，毫秒
      retries: 3, // 重试次数
      cacheTimeInHours: 24, // API缓存时长（小时）
    },
  },

  // API通用配置
  api: {
    cache: {
      expirationHours: 24, // 缓存过期时间（小时）
      enabled: true, // 是否启用缓存
    },
  },

  // 数据库配置
  database: {
    name: 'filmtrack.db',
  },

  // 存储配置
  storage: {
    keyPrefix: 'filmtrack', // 存储键前缀
    expirationTimeInHours: 24 * 7, // 缓存过期时间（小时）
  },
  // 功能特性配置
  features: {
    // 支持的影视类型（参考TMDb API）
    mediaTypes: {
      movie: '电影',
      tv: '电视剧',
    },
    // 观看状态
    watchStatus: {
      watching: '在看',
      completed: '已看',
      planned: '想看',
      paused: '暂停',
      dropped: '弃坑',
    },
    // 播出状态配置
    airStatus: {
      airing: '正在播出',
      ended: '已完结',
      cancelled: '已取消',
      pilot: '试播',
      planned: '计划中',
      'Returning Series': '连载中',
      Ended: '已完结',
      Canceled: '已取消',
      'In Production': '制作中',
    },
  },
} as const;

export type AppConfig = typeof APP_CONFIG;
export type MediaType = keyof typeof APP_CONFIG.features.mediaTypes;
export type WatchStatus = keyof typeof APP_CONFIG.features.watchStatus;
