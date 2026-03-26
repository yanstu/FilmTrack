/**
 * Record 页面相关类型定义
 */

import type { TMDbMovie, SeasonsData, Movie, ModalType } from '../../types';

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
  seasons_data?: SeasonsData;
  air_status: Movie['air_status'] | '';
}

export interface DialogState {
  visible: boolean;
  type: ModalType;
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

// 通用组件 Props 接口
export interface BaseRecordProps {
  getImageUrl: (path: string | null) => string;
}

export interface RecordFormProps extends BaseRecordProps {
  form: RecordForm;
}

export interface RecordModalsProps extends BaseRecordProps {
  imagePreviewVisible: boolean;
  dialog: DialogState;
  form: RecordForm;
}

export interface SearchSectionProps extends BaseRecordProps {
  searchQuery: string;
  results: TMDbMovie[];
  loading: boolean;
  showSearchTips: boolean;
  isAlreadyAdded: (result: TMDbMovie) => boolean;
}

// 通用组件 Emits 接口
export interface RecordModalsEmits {
  (e: 'closeImagePreview'): void;
  (e: 'closeDialog'): void;
}

export interface MovieInfoSectionEmits {
  (e: 'showImagePreview'): void;
}

export interface SearchSectionEmits {
  (e: 'update:searchQuery', value: string): void;
  (e: 'selectFirst'): void;
  (e: 'resultClick', result: TMDbMovie): void;
}

// SearchResults 组件类型
export interface SearchResultsProps {
  results: TMDbMovie[];
  getImageUrl: (path: string | null) => string;
  isAlreadyAdded: (result: TMDbMovie) => boolean;
}

export interface SearchResultsEmits {
  (e: 'resultClick', result: TMDbMovie): void;
}

// UserRecordForm 组件类型
export interface UserRecordFormProps {
  form: RecordForm;
  statusOptions: StatusOption[];
}

export interface UserRecordFormEmits {
  (e: 'update:status', value: string): void;
  (e: 'update:personalRating', value: number): void;
  (e: 'update:currentSeason', value: number): void;
  (e: 'update:currentEpisode', value: number): void;
  (e: 'update:watchSource', value: string): void;
  (e: 'update:watchedDate', value: string): void;
  (e: 'update:notes', value: string): void;
  (e: 'setToLastEpisode'): void;
  (e: 'update:dateValid', value: boolean): void;
}

// ActionButtons 组件类型
export interface ActionButtonsProps {
  showButtons: boolean;
  canSubmit: boolean;
  isSubmitting: boolean;
}

export interface ActionButtonsEmits {
  (e: 'reset'): void;
  (e: 'submit'): void;
}
