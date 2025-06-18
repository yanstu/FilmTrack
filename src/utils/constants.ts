/**
 * 常量和工具函数
 * @author yanstu
 */

import { APP_CONFIG } from '../../config/app.config';

// 导出配置常量
export const { mediaTypes, watchStatus } = APP_CONFIG.features;

// 状态选项
export const STATUS_OPTIONS = [
  { value: '', label: '全部状态' },
  ...Object.entries(watchStatus).map(([key, label]) => ({
    value: key,
    label
  }))
];

// 类型选项
export const TYPE_OPTIONS = [
  { value: '', label: '全部类型' },
  ...Object.entries(mediaTypes).map(([key, label]) => ({
    value: key,
    label
  }))
];

// 记录状态选项（用于添加记录）
export const RECORD_STATUS_OPTIONS = [
  { value: '', label: '请选择状态' },
  ...Object.entries(watchStatus).map(([key, label]) => ({
    value: key,
    label
  }))
];

// 工具函数
export const getStatusLabel = (status: string): string => {
  return watchStatus[status as keyof typeof watchStatus] || status;
};

export const getTypeLabel = (type?: string): string => {
  if (!type) return '未知';
  return mediaTypes[type as keyof typeof mediaTypes] || type;
};

export const getStatusBadgeClass = (status: string): string => {
  const classes = {
    watching: 'bg-green-100 text-green-800',
    completed: 'bg-blue-100 text-blue-800',
    planned: 'bg-yellow-100 text-yellow-800',
    paused: 'bg-orange-100 text-orange-800',
    dropped: 'bg-red-100 text-red-800'
  };
  return classes[status as keyof typeof classes] || 'bg-gray-100 text-gray-800';
};

export const getYear = (dateString?: string): number | undefined => {
  if (!dateString) return undefined;
  return new Date(dateString).getFullYear();
};

// 格式化日期
export const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('zh-CN');
};

// 格式化时长
export const formatDuration = (minutes?: number): string => {
  if (!minutes) return '未知';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return hours > 0 ? `${hours}小时${mins}分钟` : `${mins}分钟`;
};

// 格式化评分
export const formatRating = (rating?: number): string => {
  if (!rating || rating === 0) return '暂无评分';
  return rating.toFixed(1);
};

// 获取播出状态标签
export const getAirStatusLabel = (status?: string): string => {
  if (!status) return '未知';
  return APP_CONFIG.features.airStatus[status as keyof typeof APP_CONFIG.features.airStatus] || status;
};

// 颜色常量
export const COLORS = {
  primary: '#3b82f6',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  gray: '#6b7280'
};

// 动画持续时间
export const ANIMATION_DURATION = {
  fast: 150,
  normal: 300,
  slow: 500
};

// 分页配置
export const PAGINATION = {
  defaultPageSize: 20,
  maxPageSize: 100
};

// 图片尺寸
export const IMAGE_SIZES = {
  poster: {
    small: 'w185',
    medium: 'w342',
    large: 'w500',
    xlarge: 'w780'
  },
  backdrop: {
    small: 'w300',
    medium: 'w780',
    large: 'w1280'
  }
};

// 默认值
export const DEFAULTS = {
  rating: 0,
  status: 'planned',
  pageSize: 20
};

 