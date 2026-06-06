/**
 * TMDb 缓存维护工具
 * 提供启动期可独立调用的轻量缓存维护逻辑，避免主入口提前拉起整套 TMDb API
 * @author yanstu
 */

import StorageService from './storage'

type CacheItem<T> = {
  data: T
  timestamp: number
}

const CACHE_TYPE_KEYS = [
  'movie-details',
  'tv-details',
  'search-multi',
  'search-movies',
  'search-tv',
  'backdrops-movie',
  'backdrops-tv',
  'popular-movies',
  'popular-tv',
  'genres'
] as const

const getStorageKey = (cacheType: typeof CACHE_TYPE_KEYS[number]) =>
  `filmtrack-tmdb-${cacheType}`

const getCachePayloadSize = (value: unknown): number => {
  const json = JSON.stringify(value ?? {})
  return new Blob([json]).size
}

const cleanupExpiredEntries = (
  typeCache: Record<string, CacheItem<unknown>>,
  expirationTime: number
): Record<string, CacheItem<unknown>> => {
  const now = Date.now()
  const cleanedEntries = Object.entries(typeCache).filter(([, item]) => {
    if (!item || typeof item.timestamp !== 'number') {
      return false
    }
    return now - item.timestamp <= expirationTime
  })

  return Object.fromEntries(cleanedEntries)
}

export function performTMDbCacheHealthCheck(
  expirationTimeInHours: number,
  maxTotalSizeInBytes: number = 3 * 1024 * 1024
): void {
  try {
    const expirationTime = expirationTimeInHours * 60 * 60 * 1000
    let totalSize = 0

    for (const cacheType of CACHE_TYPE_KEYS) {
      const storageKey = getStorageKey(cacheType)
      const typeCache = StorageService.get<Record<string, CacheItem<unknown>>>(
        storageKey as keyof typeof StorageService,
        {}
      )
      const normalizedCache = cleanupExpiredEntries(typeCache || {}, expirationTime)

      totalSize += getCachePayloadSize(normalizedCache)

      if (Object.keys(normalizedCache).length > 0) {
        StorageService.set(storageKey as keyof typeof StorageService, normalizedCache)
      } else {
        StorageService.remove(storageKey as keyof typeof StorageService)
      }
    }

    if (totalSize > maxTotalSizeInBytes) {
      for (const cacheType of CACHE_TYPE_KEYS) {
        StorageService.remove(getStorageKey(cacheType) as keyof typeof StorageService)
      }
    }
  } catch {
    // 启动阶段的缓存维护不应阻塞应用
  }
}
