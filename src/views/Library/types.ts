/**
 * 影视库页面相关类型定义
 */

export interface MovieRecord {
  id: string;
  title: string;
  original_title?: string;
  type: string;
  status: string;
  user_rating?: number;
  year?: string;
  overview?: string;
  poster_path?: string;
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
  // 搜索和筛选
  handleSearchInput: () => void;
  handleFilterChange: () => void;
  
  // 视图模式
  saveViewMode: (mode: ViewMode) => void;
  loadViewMode: () => void;
  
  // 批量选择
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
