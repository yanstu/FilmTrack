/**
 * Detail 页面相关类型定义
 */

import type {
  MatchResponsePayload,
  Movie,
  ModalType,
  MoviePlaybackProgress,
  SourceProfileSummary,
  VideoDetail
} from '../../types';
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
  (e: 'quickRecord'): void;
  (e: 'markEpisodeWatched'): void;
  (e: 'updateMovieInfo'): void;
  (e: 'deleteRecord'): void;
}

// DetailSidebar 组件类型（右侧信息列：操作 / 观看进度 / 影片信息 / 分集 / 删除）
export interface DetailSidebarProps extends DetailPropsWithFormat {
  watchProgress: WatchProgress;
  getProgressColor: (progress: number) => string;
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

// DetailPlayerPanel 组件类型（封面下方独立全宽播放区）
export interface DetailPlayerPanelProps {
  movie: Movie;
  playerState: PlayerPanelState;
  playerActions: PlayerPanelActions;
}

// DetailContent 组件类型（主内容列：简介 / 观看轨迹 / 重刷记录）
export interface DetailContentProps {
  movie: Movie;
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
  (e: 'quickRecord'): void;
  (e: 'markEpisodeWatched'): void;
  (e: 'updateMovieInfo'): void;
  (e: 'deleteRecord'): void;
}

// DeleteSection 组件类型
export interface DeleteSectionEmits {
  (e: 'deleteRecord'): void;
}

export interface PlayerPanelState {
  isLoadingProfiles: boolean;
  isMatchingSources: boolean;
  isLoadingDetail: boolean;
  isResolvingStream: boolean;
  isSwitchingCandidate: boolean;
  profiles: SourceProfileSummary[];
  sourceSummary: MatchResponsePayload | null;
  videoDetail: VideoDetail | null;
  selectedSourceKey: string | null;
  selectedGroupName: string | null;
  selectedEpisodeUrl: string | null;
  selectedStreamUrl: string;
  selectedStreamContentType: string;
  selectedStreamHeaders: Record<string, string>;
  selectedEpisodeName: string;
  latestProgress: MoviePlaybackProgress | null;
  episodeProgress: MoviePlaybackProgress | null;
  errorMessage: string;
  /** 自动回退中（依次尝试线路 / 片源），用于区分「过渡态」与「终态错误」 */
  isAutoRecovering: boolean;
  /** 重试令牌：递增以强制播放器重新挂载并重新拉流（即使地址相同） */
  playbackReloadToken: number;
}

export interface PlayerPanelActions {
  reloadProfiles: () => Promise<void>;
  matchSources: (force?: boolean) => Promise<void>;
  selectCandidate: (sourceKey: string, vodId: string, selectionMode?: 'auto' | 'manual') => Promise<void>;
  selectGroup: (groupName: string) => Promise<void>;
  selectEpisode: (episodeUrl: string, episodeName?: string, selectionMode?: 'auto' | 'manual') => Promise<void>;
  saveProgress: (payload: { positionSeconds: number; durationSeconds: number; playbackRate: number; completed: boolean }) => Promise<void>;
  openExternal: () => Promise<void>;
  handlePlaybackFailure: (message: string) => Promise<void>;
  /** 就地重试当前剧集（重新拉流并强制重挂播放器）；无选集时回退为重新匹配 */
  retryPlayback: () => Promise<void>;
}
