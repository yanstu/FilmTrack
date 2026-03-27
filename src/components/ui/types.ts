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

export interface TextFieldProps {
  modelValue?: string | number | null | undefined;
  placeholder?: string;
  type?: 'text' | 'search' | 'number';
  inputMode?: 'text' | 'search' | 'numeric' | 'decimal';
  min?: number | string;
  max?: number | string;
  step?: number | string;
  disabled?: boolean;
  readonly?: boolean;
  leadingIcon?: object | null;
  trailingText?: string;
  invalid?: boolean;
  dense?: boolean;
}

export interface TextFieldEmits {
  (e: 'update:modelValue', value: string): void;
  (e: 'enter'): void;
  (e: 'blur'): void;
}

export interface TextAreaFieldProps {
  modelValue?: string | null | undefined;
  placeholder?: string;
  rows?: number;
  disabled?: boolean;
  invalid?: boolean;
}

export interface TextAreaFieldEmits {
  (e: 'update:modelValue', value: string): void;
  (e: 'blur'): void;
}

export interface ToggleSwitchProps {
  modelValue?: boolean;
  disabled?: boolean;
}

export interface ToggleSwitchEmits {
  (e: 'update:modelValue', value: boolean): void;
}

export interface DateFieldProps {
  modelValue?: string | null | undefined;
  placeholder?: string;
  max?: string;
  min?: string;
  disabled?: boolean;
  invalid?: boolean;
}

export interface DateFieldEmits {
  (e: 'update:modelValue', value: string): void;
  (e: 'blur'): void;
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
