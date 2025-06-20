/**
 * 存储键名常量
 * 统一管理所有本地存储的键名
 */

import { APP_CONFIG } from '../../../config/app.config';

// 存储键前缀
const KEY_PREFIX = APP_CONFIG.storage.keyPrefix.toLowerCase();

/**
 * 存储键名常量对象
 */
export const StorageKey = {
  /** 应用设置 */
  SETTINGS: `${KEY_PREFIX}-settings`,
  
  /** 缓存的TMDb API数据 */
  TMDB_CACHE: `${KEY_PREFIX}-tmdb-cache`,
  
  /** API缓存数据 */
  API_CACHE: `${KEY_PREFIX}-api-cache`,
  
  /** 库视图模式 */
  LIBRARY_VIEW_MODE: `${KEY_PREFIX}-library-viewmode`,
} as const; 