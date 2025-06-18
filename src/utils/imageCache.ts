/**
 * 图片缓存工具
 * 负责图片的缓存和获取
 */

import { invoke } from '@tauri-apps/api/core';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

class ImageCacheManager {
  private cachePromises = new Map<string, Promise<string>>();
  private urlCache = new Map<string, string>();

  /**
   * 获取图片URL（优先使用缓存）
   * @param imageUrl 原始图片URL
   * @returns 本地缓存路径或原始URL
   */
  async getCachedImageUrl(imageUrl: string): Promise<string> {
    try {
      // 检查内存缓存
      if (this.urlCache.has(imageUrl)) {
        const cachedUrl = this.urlCache.get(imageUrl)!;
        return cachedUrl;
      }
      
      // 检查是否已在文件缓存中
      const cachedResult = await invoke<ApiResponse<string | null>>('get_cached_image_path', {
        imageUrl
      });

      if (cachedResult.success && cachedResult.data) {
        // 读取缓存文件并转换为blob URL
        const blobUrl = await this.createBlobUrl(cachedResult.data);
        
        // 存储到内存缓存
        this.urlCache.set(imageUrl, blobUrl);
        return blobUrl;
      }

      // 如果没有缓存，开始缓存流程
      return await this.cacheAndGetUrl(imageUrl);
    } catch (error) {
      console.warn('获取缓存图片失败，使用原始URL:', error);
      return imageUrl;
    }
  }

  /**
   * 缓存图片并返回本地路径
   * @param imageUrl 原始图片URL
   * @returns 本地缓存路径
   */
  private async cacheAndGetUrl(imageUrl: string): Promise<string> {
    // 避免重复请求
    if (this.cachePromises.has(imageUrl)) {
      return this.cachePromises.get(imageUrl)!;
    }

    const cachePromise = this.doCacheImage(imageUrl);
    this.cachePromises.set(imageUrl, cachePromise);

    try {
      const result = await cachePromise;
      return result;
    } finally {
      // 清理Promise缓存
      this.cachePromises.delete(imageUrl);
    }
  }

  /**
   * 执行图片缓存
   * @param imageUrl 原始图片URL
   * @returns 本地缓存路径或原始URL
   */
  private async doCacheImage(imageUrl: string): Promise<string> {
    try {
      const result = await invoke<ApiResponse<string>>('cache_image', {
        imageUrl
      });

      if (result.success && result.data) {
        // 创建blob URL
        const blobUrl = await this.createBlobUrl(result.data);
        
        // 存储到内存缓存
        this.urlCache.set(imageUrl, blobUrl);
        return blobUrl;
      } else {
        console.warn('缓存图片失败:', result.error);
        return imageUrl;
      }
    } catch (error) {
      console.warn('缓存图片异常:', error);
      return imageUrl;
    }
  }

  /**
   * 从文件路径创建blob URL
   * @param filePath 本地文件路径
   * @returns blob URL
   */
  private async createBlobUrl(filePath: string): Promise<string> {
    try {
      // 使用Tauri命令读取文件为base64
      const base64Result = await invoke<ApiResponse<string>>('read_file_as_base64', {
        filePath
      });

      if (base64Result.success && base64Result.data) {
        // 检测文件类型
        const mimeType = this.getMimeType(filePath);
        
        // 创建blob URL
        const binaryString = atob(base64Result.data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        
        const blob = new Blob([bytes], { type: mimeType });
        const blobUrl = URL.createObjectURL(blob);
        
        return blobUrl;
      } else {
        throw new Error(`读取文件失败: ${base64Result.error}`);
      }
    } catch (error) {
      console.error('创建blob URL失败:', error);
      throw error;
    }
  }

  /**
   * 根据文件路径获取MIME类型
   * @param filePath 文件路径
   * @returns MIME类型
   */
  private getMimeType(filePath: string): string {
    const extension = filePath.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'jpg':
      case 'jpeg':
        return 'image/jpeg';
      case 'png':
        return 'image/png';
      case 'gif':
        return 'image/gif';
      case 'webp':
        return 'image/webp';
      default:
        return 'image/jpeg';
    }
  }

  /**
   * 预缓存图片列表
   * @param imageUrls 图片URL列表
   */
  async prefetchImages(imageUrls: string[]): Promise<void> {
    const promises = imageUrls.map(url => this.getCachedImageUrl(url));
    try {
      await Promise.allSettled(promises);
    } catch (error) {
      console.warn('预缓存图片失败:', error);
    }
  }

  /**
   * 清理内存缓存
   */
  clearMemoryCache(): void {
    // 释放所有blob URLs
    this.urlCache.forEach(blobUrl => {
      if (blobUrl.startsWith('blob:')) {
        URL.revokeObjectURL(blobUrl);
      }
    });
    this.urlCache.clear();
  }
}

// 导出单例
export const imageCache = new ImageCacheManager();

/**
 * 获取缓存图片URL的便捷函数
 * @param imageUrl 原始图片URL
 * @returns 本地缓存路径或原始URL
 */
export async function getCachedImageUrl(imageUrl: string): Promise<string> {
  return imageCache.getCachedImageUrl(imageUrl);
}

/**
 * 预缓存图片的便捷函数
 * @param imageUrls 图片URL列表
 */
export async function prefetchImages(imageUrls: string[]): Promise<void> {
  return imageCache.prefetchImages(imageUrls);
}

/**
 * 清理内存缓存的便捷函数
 */
export function clearMemoryCache(): void {
  return imageCache.clearMemoryCache();
} 