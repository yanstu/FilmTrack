/**
 * Record 页面相关类型定义
 */

import type { TMDbMovie } from '../../types';

export interface RecordForm {
  title: string;
  original_title: string;
  type: 'movie' | 'tv' | '';
  year?: number;
  status: string;
  personal_rating: number;
  watch_source: string;
  overview: string;
  notes: string;
  watched_date: string;
  tmdb_id?: number;
  tmdb_rating?: number;
  poster_path: string;
  total_episodes?: number;
  total_seasons?: number;
  current_episode: number;
  current_season: number;
  air_status: string;
}

export interface DialogState {
  visible: boolean;
  type: 'success' | 'error' | 'warning' | 'info' | 'confirm';
  title: string;
  message: string;
  onConfirm: () => void;
}

export interface SearchState {
  query: string;
  results: TMDbMovie[];
  loading: boolean;
  showTips: boolean;
}

export interface UIState {
  isSubmitting: boolean;
  imagePreviewVisible: boolean;
}

export interface StatusOption {
  value: string;
  label: string;
}

export interface RecordActions {
  // 搜索相关
  handleTMDbSearch: () => void;
  selectFirstResult: () => void;
  selectTMDbResult: (result: TMDbMovie) => Promise<void>;
  handleTMDbResultClick: (result: TMDbMovie) => Promise<void>;
  
  // 表单操作
  handleSubmit: () => Promise<void>;
  handleReset: () => void;
  setToLastEpisode: () => void;
  
  // UI 操作
  showImagePreview: () => void;
  showDialog: (type: DialogState['type'], title: string, message: string, onConfirm?: () => void) => void;
  
  // 工具函数
  getImageURL: (path: string | null) => string;
  isAlreadyAdded: (result: TMDbMovie) => boolean;
}

export interface RecordState {
  form: RecordForm;
  search: SearchState;
  ui: UIState;
  dialog: DialogState;
  statusOptions: StatusOption[];
}
