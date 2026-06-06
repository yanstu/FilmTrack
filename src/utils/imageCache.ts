/**
 * 图片缓存公共入口
 * 提供业务侧稳定 API，并在应用退出时统一回收 blob URL
 */

import { imageCache } from './imageCacheCore'

let lifecycleBound = false

function handlePageExit(): void {
  imageCache.clearMemoryCache()
}

export function setupImageCacheLifecycle(): void {
  if (lifecycleBound || typeof window === 'undefined') {
    return
  }

  lifecycleBound = true
  window.addEventListener('pagehide', handlePageExit)
  window.addEventListener('beforeunload', handlePageExit)
}

export async function getCachedImageUrl(imageUrl: string): Promise<string> {
  return imageCache.getCachedImageUrl(imageUrl)
}

export async function prefetchImages(imageUrls: string[]): Promise<void> {
  return imageCache.prefetchImages(imageUrls)
}

export function clearMemoryCache(): void {
  imageCache.clearMemoryCache()
}

export async function removeCachedImage(imageUrl: string): Promise<boolean> {
  return imageCache.removeCachedImage(imageUrl)
}

export async function removeCachedImages(imageUrls: string[]): Promise<boolean> {
  return imageCache.removeCachedImages(imageUrls)
}
