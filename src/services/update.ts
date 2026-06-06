/**
 * 更新服务
 * 处理应用程序更新检查和下载
 */

import type { UpdateInfo, UpdateCheckResult } from '../types';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

/**
 * 更新服务类
 */
export class UpdateService {
  private static updateListener: (() => void) | null = null;
  private static updateCallback: ((result: UpdateCheckResult) => void) | null =
    null;

  /**
   * 设置更新回调函数
   * @param callback 更新回调函数
   */
  static setUpdateCallback(callback: (result: UpdateCheckResult) => void) {
    this.updateCallback = callback;
  }

  /**
   * 初始化更新监听器
   */
  static async initUpdateListener() {
    // 避免重复监听
    if (this.updateListener) return;

    this.updateListener = await listen<UpdateCheckResult>(
      'update-available',
      async (event) => {
        const result = event.payload;
        if (result && result.has_update) {
          // 通过回调函数通知更新
          if (this.updateCallback) {
            this.updateCallback(result);
          }
        }
      }
    );
  }

  /**
   * 检查更新
   * @returns 更新信息
   */
  static async checkForUpdate(): Promise<UpdateCheckResult> {
    try {
      const response = await invoke<{ data: UpdateCheckResult }>(
        'check_for_update'
      );
      return response.data;
    } catch (error) {
      console.error('检查更新失败:', error);
      throw error;
    }
  }

  /**
   * 下载并安装更新
   * @param downloadUrl 下载链接
   */
  static async downloadUpdate(downloadUrl: string): Promise<void> {
    try {
      await invoke<{ data: string }>('open_download_url', { url: downloadUrl });
    } catch (error) {
      console.error('下载更新失败:', error);
      throw error;
    }
  }

  /**
   * 忽略版本
   * @param version 版本号
   */
  static async ignoreVersion(version: string): Promise<void> {
    try {
      await invoke<{ data: string }>('ignore_version', { version });
    } catch (error) {
      console.error('忽略版本失败:', error);
      throw error;
    }
  }
}

export default UpdateService;
