/**
 * API工具函数
 * 提供API调用的通用工具函数
 * @author yanstu
 */

import type { ApiResponse } from '../types';

/**
 * API响应包装函数
 * 将异步函数包装为标准ApiResponse格式
 * @param fn 异步函数
 * @returns 标准ApiResponse格式的Promise
 */
export async function withApiResponse<T>(fn: () => Promise<T>): Promise<ApiResponse<T>> {
  try {
    const data = await fn();
    return {
      success: true,
      data
    };
  } catch (error) {
    console.error('API调用失败:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * 延迟函数
 * @param ms 延迟毫秒数
 * @returns Promise
 */
export const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * 防抖函数
 * 在指定时间内多次调用只执行最后一次
 * @param func 要防抖的函数
 * @param wait 等待时间（毫秒）
 * @returns 防抖后的函数
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: number | null = null;
  
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };
    
    if (timeout !== null) {
      clearTimeout(timeout);
    }
    timeout = window.setTimeout(later, wait);
  };
}

/**
 * 节流函数
 * 在指定时间内只执行一次
 * @param func 要节流的函数
 * @param limit 限制时间（毫秒）
 * @returns 节流后的函数
 */
export const throttle = <T extends (...args: unknown[]) => unknown>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;
  
  return function(...args: Parameters<T>): void {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
};