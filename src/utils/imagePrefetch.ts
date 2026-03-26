/**
 * 图片预取懒加载入口
 * 单独拆分，避免和主缓存模块产生动静态混用
 */

import { imageCache } from './imageCacheCore'

export async function prefetchImages(imageUrls: string[]): Promise<void> {
  return imageCache.prefetchImages(imageUrls)
}
