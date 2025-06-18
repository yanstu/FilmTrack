/**
 * FilmTrack 应用配置
 * @author yanstu
 */

export const APP_CONFIG = {
  // 应用基础信息
  app: {
    name: 'FilmTrack',
    version: '0.1.0',
    author: 'yanstu',
    description: '个人影视管理平台'
  },

  // TMDb API配置
  tmdb: {
    apiKey: '06e492fa8930c108b57945b4fda6f397',
    baseUrl: 'https://api.themoviedb.org/3',
    imageBaseUrl: 'https://image.tmdb.org/t/p',
    // 图片尺寸配置
    imageSizes: {
      poster: 'w500',
      backdrop: 'w1280',
      profile: 'w185',
      logo: 'w185'
    }
  },

  // 数据库配置
  database: {
    name: 'filmtrack.db',
    version: 1
  },

  // UI配置
  ui: {
    // 窗口配置
    window: {
      width: 1600,
      height: 900,
      minWidth: 1200,
      minHeight: 800
    },
    // 动画配置
    animation: {
      duration: 300,
      easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'
    },
    // 分页配置
    pagination: {
      defaultPageSize: 20,
      maxPageSize: 100
    }
  },

  // 功能特性配置
  features: {
    // 支持的影视类型（参考TMDb API）
    mediaTypes: {
      movie: '电影',
      tv: '电视剧'
    },
    // 观看状态
    watchStatus: {
      watching: '在看',
      completed: '已看',
      planned: '想看',
      paused: '暂停',
      dropped: '弃坑'
    },
    // 评分范围
    rating: {
      min: 0,
      max: 10,
      step: 0.5
    },
    // 播出状态配置
    airStatus: {
      airing: '正在播出',
      ended: '已完结',
      cancelled: '已取消',
      pilot: '试播',
      planned: '计划中',
      'Returning Series': '连载中',
      'Ended': '已完结',
      'Canceled': '已取消',
      'In Production': '制作中'
    }
  }
} as const;

export type AppConfig = typeof APP_CONFIG;
export type MediaType = keyof typeof APP_CONFIG.features.mediaTypes;
export type WatchStatus = keyof typeof APP_CONFIG.features.watchStatus; 