/**
 * 请求队列服务
 * 用于限制API请求频率，避免触发API限流
 * @author yanstu
 */

import { APP_CONFIG } from '../../config/app.config';

/**
 * 请求队列类
 * 用于管理和限制API请求频率
 */
export class RequestQueue {
  private queue: Array<() => Promise<any>> = [];
  private processing = false;
  private requestInterval: number;
  
  /**
   * 创建请求队列实例
   * @param interval 请求间隔（毫秒）
   */
  constructor(interval?: number) {
    this.requestInterval = interval || APP_CONFIG.tmdb.request.interval;
  }
  
  /**
   * 添加请求到队列
   * @param request 请求函数
   * @returns 请求结果的Promise
   */
  public add<T>(request: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await request();
          resolve(result);
          return result;
        } catch (error) {
          reject(error);
          throw error;
        }
      });
      
      if (!this.processing) {
        this.processQueue();
      }
    });
  }
  
  /**
   * 处理请求队列
   */
  private async processQueue() {
    if (this.queue.length === 0) {
      this.processing = false;
      return;
    }
    
    this.processing = true;
    const request = this.queue.shift();
    
    if (request) {
      try {
        await request();
      } catch (error) {
        console.error('请求执行失败:', error);
      }
      
      // 等待指定时间后处理下一个请求
      await new Promise(resolve => setTimeout(resolve, this.requestInterval));
      this.processQueue();
    }
  }
  
  /**
   * 设置请求间隔
   * @param interval 请求间隔（毫秒）
   */
  public setInterval(interval: number) {
    this.requestInterval = interval;
  }
  
  /**
   * 清空队列
   */
  public clear() {
    this.queue = [];
  }
  
  /**
   * 获取队列长度
   */
  public get length(): number {
    return this.queue.length;
  }
}

// 导出默认的TMDb API请求队列实例
export const tmdbQueue = new RequestQueue(APP_CONFIG.tmdb.request.interval); 