/**
 * Detail 页面相关类型定义
 */

import type { Movie, ModalType } from '../../types';
import type { WatchTimelineItem } from '../../utils/watchInsights';

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
  type: ModalType;
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

// 通用组件 Props 接口
export interface BaseDetailProps {
  movie: Movie;
}

export interface DetailPropsWithFormat extends BaseDetailProps {
  formatDate: (dateString: string) => string;
}

export interface DetailHeaderProps extends BaseDetailProps {
  backdropImages: string[];
  currentBackdropIndex: number;
  getImageUrl: (path: string | undefined) => string;
  getBackdropUrl: (path: string | undefined) => string;
  isValidUrl: (string: string) => boolean;
}

// 通用组件 Emits 接口
export interface BaseDetailEmits {
  (e: 'copyTitle', title: string): void;
}

export interface DetailSidebarEmits {
  (e: 'editRecord'): void;
  (e: 'markEpisodeWatched'): void;
  (e: 'updateMovieInfo'): void;
  (e: 'deleteRecord'): void;
}

export interface DetailHeaderEmits extends BaseDetailEmits {
  (e: 'goBack'): void;
  (e: 'showPosterPreview'): void;
  (e: 'openExternalLink', url: string): void;
}

// DetailModals 组件类型
export interface DetailModalsProps {
  modalState: ModalState;
  movie: Movie | null;
  getImageUrl: (path: string | undefined) => string;
}

export interface DetailModalsEmits {
  (e: 'closeEditModal'): void;
  (e: 'closePosterPreview'): void;
  (e: 'closeDialog'): void;
  (e: 'saveRecord', movie: Movie): void;
}

// DetailContent 组件类型
export interface DetailContentProps {
  movie: Movie;
  watchProgress: WatchProgress;
  getProgressColor: (progress: number) => string;
  formatDate: (dateString: string) => string;
  watchTimeline: WatchTimelineItem[];
}

// WatchSource 组件类型
export interface WatchSourceProps {
  watchSource: string;
  isValidUrl: (string: string) => boolean;
}

export interface WatchSourceEmits {
  (e: 'openLink', url: string): void;
}

// WatchProgress 组件类型
export interface WatchProgressProps {
  movie: Movie;
  watchProgress: WatchProgress;
  getProgressColor: (progress: number) => string;
}

// ReplayRecordSection 组件类型
export interface ReplayRecordSectionProps {
  movie: Movie;
}

// ActionButtons 组件类型
export interface ActionButtonsProps {
  movie: Movie;
}

export interface ActionButtonsEmits {
  (e: 'editRecord'): void;
  (e: 'markEpisodeWatched'): void;
  (e: 'updateMovieInfo'): void;
  (e: 'deleteRecord'): void;
}

// DeleteSection 组件类型
export interface DeleteSectionEmits {
  (e: 'deleteRecord'): void;
}
