/**
 * 图片缓存核心实现
 * 负责图片缓存、blob URL 创建和缓存淘汰
 */

import { invoke } from '@tauri-apps/api/core'

interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

class ImageCacheManager {
  private cachePromises = new Map<string, Promise<string>>()
  private urlCache = new Map<string, string>()

  async getCachedImageUrl(imageUrl: string): Promise<string> {
    try {
      if (this.urlCache.has(imageUrl)) {
        return this.urlCache.get(imageUrl)!
      }

      const cachedResult = await invoke<ApiResponse<string | null>>('get_cached_image_path', {
        imageUrl
      })

      if (cachedResult.success && cachedResult.data) {
        const blobUrl = await this.createBlobUrl(cachedResult.data)
        this.urlCache.set(imageUrl, blobUrl)
        return blobUrl
      }

      return await this.cacheAndGetUrl(imageUrl)
    } catch (error) {
      console.warn('获取缓存图片失败，使用原始URL:', error)
      return imageUrl
    }
  }

  async prefetchImages(imageUrls: string[]): Promise<void> {
    const promises = imageUrls.map(url => this.getCachedImageUrl(url))
    try {
      await Promise.allSettled(promises)
    } catch (error) {
      console.warn('预缓存图片失败:', error)
    }
  }

  clearMemoryCache(): void {
    this.urlCache.forEach(blobUrl => {
      if (blobUrl.startsWith('blob:')) {
        URL.revokeObjectURL(blobUrl)
      }
    })
    this.urlCache.clear()
  }

  async removeCachedImage(imageUrl: string): Promise<boolean> {
    try {
      const cachedUrl = this.urlCache.get(imageUrl)
      if (cachedUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(cachedUrl)
      }
      this.urlCache.delete(imageUrl)

      const result = await invoke<ApiResponse<boolean>>('remove_cached_image', {
        imageUrl
      })

      return result.success && result.data === true
    } catch (error) {
      console.warn('删除缓存图片失败:', error)
      return false
    }
  }

  async removeCachedImages(imageUrls: string[]): Promise<boolean> {
    try {
      for (const imageUrl of imageUrls) {
        const cachedUrl = this.urlCache.get(imageUrl)
        if (cachedUrl?.startsWith('blob:')) {
          URL.revokeObjectURL(cachedUrl)
        }
        this.urlCache.delete(imageUrl)
      }

      const result = await invoke<ApiResponse<boolean>>('remove_cached_images', {
        imageUrls
      })

      return result.success && result.data === true
    } catch (error) {
      console.warn('删除缓存图片失败:', error)
      return false
    }
  }

  private async cacheAndGetUrl(imageUrl: string): Promise<string> {
    if (this.cachePromises.has(imageUrl)) {
      return this.cachePromises.get(imageUrl)!
    }

    const cachePromise = this.doCacheImage(imageUrl)
    this.cachePromises.set(imageUrl, cachePromise)

    try {
      return await cachePromise
    } finally {
      this.cachePromises.delete(imageUrl)
    }
  }

  private async doCacheImage(imageUrl: string): Promise<string> {
    try {
      const result = await invoke<ApiResponse<string>>('cache_image', {
        imageUrl
      })

      if (result.success && result.data) {
        const blobUrl = await this.createBlobUrl(result.data)
        this.urlCache.set(imageUrl, blobUrl)
        return blobUrl
      }

      console.warn('缓存图片失败:', result.error)
      return imageUrl
    } catch (error) {
      console.warn('缓存图片异常:', error)
      return imageUrl
    }
  }

  private async createBlobUrl(filePath: string): Promise<string> {
    const base64Result = await invoke<ApiResponse<string>>('read_file_as_base64', {
      filePath
    })

    if (!base64Result.success || !base64Result.data) {
      throw new Error(`读取文件失败: ${base64Result.error}`)
    }

    const mimeType = this.getMimeType(filePath)
    const binaryString = atob(base64Result.data)
    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }

    return URL.createObjectURL(new Blob([bytes], { type: mimeType }))
  }

  private getMimeType(filePath: string): string {
    const extension = filePath.split('.').pop()?.toLowerCase()
    switch (extension) {
      case 'jpg':
      case 'jpeg':
        return 'image/jpeg'
      case 'png':
        return 'image/png'
      case 'gif':
        return 'image/gif'
      case 'webp':
        return 'image/webp'
      default:
        return 'image/jpeg'
    }
  }
}

export const imageCache = new ImageCacheManager()
