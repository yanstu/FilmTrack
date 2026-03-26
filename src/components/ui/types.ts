// UI组件通用类型定义

import type { Movie, ModalType, AppSettings, WindowSettings } from '../../types';
import type { UpdateCheckNotice } from '../../types';

// Modal组件类型
export interface ModalProps {
  isOpen: boolean;
  type?: ModalType;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  showCancel?: boolean;
  large?: boolean;
  confirmDisabled?: boolean; // 禁用确认按钮
  panelClass?: string;
  contentClass?: string;
  footerClass?: string;
}

export interface ModalEmits {
  (e: "close"): void;
  (e: "confirm"): void;
  (e: "cancel"): void;
}

// StarRating组件类型
export interface StarRatingProps {
  modelValue?: number | null | undefined;
  allowHalf?: boolean;
  showValue?: boolean;
  showReset?: boolean;
  size?: number;
  maxRating?: number;
  readonly?: boolean;
  interactive?: boolean;
}

export interface StarRatingEmits {
  (e: 'update:modelValue', value: number): void;
}

// CachedImage组件类型
export interface CachedImageProps {
  src: string;
  alt?: string;
  className?: string;
  fallback?: string;
}

// HeadlessSelect组件类型
export interface Option {
  value: string | number;
  label: string;
}

export interface HeadlessSelectProps {
  modelValue?: string | number | null | undefined;
  options: Option[];
  placeholder?: string;
}

export interface HeadlessSelectEmits {
  (e: 'update:modelValue', value: string | number): void;
}

export interface SettingsModalProps {
  isOpen: boolean;
  isCheckingUpdate?: boolean;
  updateCheckNotice?: UpdateCheckNotice | null;
}

export interface SettingsModalEmits {
  (e: 'close'): void;
  (e: 'save', settings: AppSettings): void;
  (e: 'check-update'): void;
}

// EditRecordModal组件类型
export interface EditRecordModalProps {
  isOpen: boolean;
  movie: Movie | null;
}

export interface EditRecordModalEmits {
  (e: 'close'): void;
  (e: 'save', movie: Movie): void;
}
