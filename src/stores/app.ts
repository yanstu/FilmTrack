/**
 * 应用全局状态管理
 */
import { defineStore } from 'pinia';
import { ref, reactive, nextTick } from 'vue';
import StorageService, { StorageKey } from '../utils/storage';

export interface ModalState {
  isOpen: boolean;
  type: 'info' | 'success' | 'warning' | 'error' | 'confirm';
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  showCancel: boolean;
  onConfirm?: () => void;
  onCancel?: () => void;
}

export interface WindowSettings {
  width: number;
  height: number;
  minWidth: number;
  minHeight: number;
  maxWidth?: number;
  maxHeight?: number;
  resizable: boolean;
}

export interface AppSettings {
  minimizeToTray: boolean;
  window: WindowSettings;
}

export const useAppStore = defineStore('app', () => {
  // 加载状态
  const isLoading = ref(false);
  
  // 错误信息
  const error = ref<string | null>(null);
  
  // 模态框状态
  const modalState = reactive<ModalState>({
    isOpen: false,
    type: 'info',
    title: '',
    message: '',
    confirmText: '确定',
    cancelText: '取消',
    showCancel: false
  });
  
  // 应用设置
  const settings = reactive<AppSettings>({
    minimizeToTray: true,
    window: {
      width: 1600,
      height: 900,
      minWidth: 800,
      minHeight: 600,
      maxWidth: undefined,
      maxHeight: undefined,
      resizable: true
    }
  });
  
  // 设置加载状态
  function setLoading(status: boolean) {
    isLoading.value = status;
  }
  
  // 设置错误信息
  function setError(message: string | null) {
    error.value = message;
  }
  
  // 清除错误信息
  function clearError() {
    error.value = null;
  }
  
  // 模态框服务
  const modalService = {
    // 打开模态框
    open(options: Partial<ModalState>) {
      nextTick(() => {
        Object.assign(modalState, {
          isOpen: true,
          ...options
        });
      });
    },
    
    // 关闭模态框
    close() {
      nextTick(() => {
        modalState.isOpen = false;
      });
    },
    
    // 确认
    confirm() {
      const callback = modalState.onConfirm;
      nextTick(() => {
        modalState.isOpen = false;
        if (callback) {
          callback();
        }
      });
    },
    
    // 取消
    cancel() {
      const callback = modalState.onCancel;
      nextTick(() => {
        modalState.isOpen = false;
        if (callback) {
          callback();
        }
      });
    },
    
    // 显示确认对话框
    showConfirm(title: string, message: string, onConfirm?: () => void, onCancel?: () => void) {
      nextTick(() => {
        Object.assign(modalState, {
          isOpen: true,
          type: 'confirm',
          title,
          message,
          confirmText: '确定',
          cancelText: '取消',
          showCancel: true,
          onConfirm,
          onCancel
        });
      });
    },
    
    // 显示信息对话框
    showInfo(title: string, message: string, onConfirm?: () => void) {
      nextTick(() => {
        Object.assign(modalState, {
          isOpen: true,
          type: 'info',
          title,
          message,
          confirmText: '确定',
          showCancel: false,
          onConfirm,
          onCancel: undefined
        });
      });
    },
    
    // 显示错误对话框
    showError(title: string, message: string, onConfirm?: () => void) {
      nextTick(() => {
        Object.assign(modalState, {
          isOpen: true,
          type: 'error',
          title,
          message,
          confirmText: '确定',
          showCancel: false,
          onConfirm,
          onCancel: undefined
        });
      });
    },
    
    // 显示警告对话框
    showWarning(title: string, message: string, onConfirm?: () => void) {
      nextTick(() => {
        Object.assign(modalState, {
          isOpen: true,
          type: 'warning',
          title,
          message,
          confirmText: '确定',
          showCancel: false,
          onConfirm,
          onCancel: undefined
        });
      });
    }
  };
  
  // 加载设置
  function loadSettings() {
    try {
      const savedSettings = StorageService.get<AppSettings>(StorageKey.SETTINGS);
      if (savedSettings) {
        Object.assign(settings, savedSettings);
      }
    } catch (error) {
      console.error('加载设置失败:', error);
    }
  }
  
  // 保存设置
  function saveSettings() {
    StorageService.set(StorageKey.SETTINGS, settings);
  }
  
  // 更新设置
  function updateSettings(newSettings: Partial<AppSettings>) {
    Object.assign(settings, newSettings);
    saveSettings();
  }
  
  // 初始化
  try {
    // 加载设置
    loadSettings();
  } catch (error) {
    console.error('初始化应用状态失败:', error);
  }
  
  return {
    isLoading,
    error,
    modalState,
    settings,
    setLoading,
    setError,
    clearError,
    modalService,
    loadSettings,
    saveSettings,
    updateSettings
  };
});