/**
 * 影视库页面相关类型定义
 */

import type { Movie } from '../../types';

export interface MovieRecord extends Movie {
  user_rating?: number;
}

export type ViewMode = 'grid' | 'list';

export interface LibraryState {
  searchQuery: string;
  selectedType: string;
  selectedStatus: string;
  viewMode: ViewMode;
  allMovies: MovieRecord[];
}

export interface SelectionState {
  isSelectionMode: boolean;
  selectedItems: string[];
  showDeleteConfirm: boolean;
  confirmInput: string;
}

export interface FilterOptions {
  type: string;
  status: string;
  searchQuery: string;
}

export interface LibraryActions {
  // 搜索和过滤
  handleSearchInput: () => void;
  handleFilterChange: () => void;
  
  // 视图模式
  saveViewMode: (mode: ViewMode) => void;
  loadViewMode: () => void;
  
  // 选择模式
  enableSelectionMode: () => void;
  cancelSelectionMode: () => void;
  toggleSelectItem: (id: string) => void;
  isItemSelected: (id: string) => boolean;
  
  // 删除操作
  confirmDelete: () => void;
  cancelDelete: () => void;
  executeDelete: () => void;
  
  // 导航
  navigateToDetail: (movieId: string) => void;
  
  // 工具函数
  getImageURL: (path: string | undefined) => string;
}

// 视图组件通用接口
export interface ViewProps {
  movies: MovieRecord[];
  isSelectionMode: boolean;
  isItemSelected: (id: string) => boolean;
  getImageURL: (path: string | undefined) => string;
}

export interface ViewEmits {
  (e: 'itemClick', id: string): void;
  (e: 'toggleSelect', id: string): void;
  (e: 'navigateToDetail', id: string): void;
}

// LibraryStates 组件类型
export interface LibraryStatesProps {
  loading: boolean;
  isEmpty: boolean;
  hasMore: boolean;
  itemCount: number;
  error?: string;
  searchQuery?: string;
}

export interface LibraryStatesEmits {
  (e: 'retry'): void;
}

// DeleteConfirmDialog 组件类型
export interface DeleteConfirmDialogProps {
  show: boolean;
  selectedCount: number;
  confirmInput: string;
}

export interface DeleteConfirmDialogEmits {
  (e: 'update:confirmInput', value: string): void;
  (e: 'cancel'): void;
  (e: 'confirm'): void;
}

// LibraryHeader 组件类型
export interface LibraryHeaderProps {
  searchQuery: string;
  selectedType: string;
  selectedStatus: string;
  viewMode: ViewMode;
  isSelectionMode: boolean;
  selectedCount: number;
  totalCount: number;
  showSearchStats: boolean;
}

export interface LibraryHeaderEmits {
  (e: 'update:searchQuery', value: string): void;
  (e: 'update:selectedType', value: string | number): void;
  (e: 'update:selectedStatus', value: string | number): void;
  (e: 'changeViewMode', mode: ViewMode): void;
  (e: 'enableSelection'): void;
  (e: 'cancelSelection'): void;
  (e: 'confirmDelete'): void;
}
