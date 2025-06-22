/**
 * Detail 页面相关类型定义
 */

import type { Movie } from '../../types';

export interface DetailState {
  isLoading: boolean;
  movie: Movie | null;
  backdropImages: string[];
  currentBackdropIndex: number;
}

export interface ModalState {
  editModalVisible: boolean;
  posterPreviewVisible: boolean;
  dialog: DialogState;
}

export interface DialogState {
  visible: boolean;
  type: 'success' | 'error' | 'warning' | 'info' | 'confirm';
  title: string;
  message: string;
  onConfirm: () => void;
}

export interface DetailActions {
  // 导航操作
  goBack: () => void;
  
  // 内容操作
  copyTitle: (text: string) => void;
  showPosterPreview: () => void;
  openExternalLink: (url: string) => void;
  
  // 记录操作
  editRecord: () => void;
  markEpisodeWatched: () => Promise<void>;
  updateMovieInfo: () => Promise<void>;
  deleteRecord: () => Promise<void>;
  handleSaveRecord: (updatedMovie: Movie) => Promise<void>;
  
  // UI 操作
  showDialog: (type: DialogState['type'], title: string, message: string, onConfirm?: () => void) => void;
  
  // 工具函数
  getImageURL: (path: string | undefined) => string;
  getBackdropURL: (path: string | undefined) => string;
  getWatchProgress: () => number;
  getProgressColor: (progress: number) => string;
  formatDate: (dateString: string) => string;
  isValidUrl: (string: string) => boolean;
}

export interface WatchProgress {
  current: number;
  total: number;
  percentage: number;
  isCompleted: boolean;
}
