/**
 * FilmTrack 类型定义
 * @author yanstu
 */

import type { MediaType, WatchStatus } from '../../config/app.config';

// ==================== 基础类型 ====================

/** 影视作品类型 */
export type MovieType = MediaType;

/** 观看状态类型 */
export type Status = WatchStatus;

/** 基础实体接口 */
export interface BaseEntity {
  created_at: string;
  updated_at: string;
}

// ==================== TMDb API 类型 ====================

/** TMDb API 响应基础结构 */
export interface TMDbResponse<T> {
  page: number;
  results: T[];
  total_pages: number;
  total_results: number;
}

/** TMDb 影视作品基础信息 */
export interface TMDbMovie {
  id: number;
  title?: string;
  name?: string; // TV剧使用name字段
  original_title?: string;
  original_name?: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  genre_ids: number[];
  release_date?: string;
  first_air_date?: string;
  vote_average: number;
  vote_count: number;
  popularity: number;
  adult: boolean;
  video?: boolean;
  media_type?: 'movie' | 'tv';
}

/** TMDb 详细信息 */
export interface TMDbMovieDetail extends TMDbMovie {
  genres: TMDbGenre[];
  runtime?: number;
  status: string;
  tagline: string;
  homepage: string;
  imdb_id: string;
  production_companies: TMDbProductionCompany[];
  production_countries: TMDbProductionCountry[];
  spoken_languages: TMDbSpokenLanguage[];
  budget?: number;
  revenue?: number;
  // TV剧特有字段
  number_of_episodes?: number;
  number_of_seasons?: number;
  seasons?: TMDbSeason[];
  networks?: TMDbNetwork[];
  created_by?: TMDbCreator[];
  episode_run_time?: number[];
  in_production?: boolean;
  last_air_date?: string;
  last_episode_to_air?: TMDbEpisode | null;
  next_episode_to_air?: TMDbEpisode | null;
  type?: string;
}

/** TMDb 类型 */
export interface TMDbGenre {
  id: number;
  name: string;
}

export interface TMDbProductionCompany {
  id: number;
  name: string;
  logo_path: string | null;
  origin_country: string;
}

export interface TMDbProductionCountry {
  iso_3166_1: string;
  name: string;
}

export interface TMDbSpokenLanguage {
  english_name: string;
  iso_639_1: string;
  name: string;
}

export interface TMDbSeason {
  id: number;
  name: string;
  overview: string;
  poster_path: string | null;
  season_number: number;
  episode_count: number;
  air_date: string;
}

/** TMDb 单集信息 */
export interface TMDbEpisode {
  id: number;
  name: string;
  overview: string;
  air_date: string;
  episode_number: number;
  season_number: number;
  still_path?: string | null;
  vote_average?: number;
  vote_count?: number;
  runtime?: number | null;
}

/** 季集数据 */
export interface SeasonData {
  season_number: number;
  name: string;
  episode_count: number;
  air_date?: string;
  poster_path?: string | null;
}

/** 季集数据集合 */
export interface SeasonsData {
  [seasonNumber: string]: SeasonData;
}

export interface TMDbNetwork {
  id: number;
  name: string;
  logo_path: string | null;
  origin_country: string;
}

export interface TMDbCreator {
  id: number;
  name: string;
  profile_path: string | null;
  credit_id: string;
  gender: number;
}

// ==================== 应用数据类型 ====================

/** 影视作品主要实体 */
export interface Movie extends BaseEntity {
  id: string;
  title: string;
  original_title?: string;
  year?: number | null;
  type: MovieType;
  poster_path?: string | null;
  backdrop_path?: string | null;
  overview?: string | null;
  genres: string[];
  runtime?: number | null;
  // TMDb相关字段
  tmdb_id?: number;
  tmdb_rating?: number;
  vote_average: number;
  // 集数相关字段
  total_episodes?: number | null; // 总集数
  total_seasons?: number | null; // 总季数
  current_episode?: number; // 当前季已看到的集数，允许 0 表示未开始
  current_season?: number; // 当前看到的季数，默认从第 1 季开始
  seasons_data?: SeasonsData | null; // 每季的详细信息
  air_status?: 'airing' | 'ended' | 'cancelled' | 'pilot' | 'planned'; // 播出状态
  // 观看相关字段
  status: 'watching' | 'completed' | 'planned' | 'paused' | 'dropped';
  personal_rating?: number | null; // 支持半星评分，使用小数
  notes?: string;
  watch_source?: string; // 观看平台/来源
  watched_date?: string; // 观看完成日期
  date_added: string;
  date_updated: string;
  watch_count: number;
  tags?: string[] | null;
}

/** 解析后的影视作品（与Movie保持一致） */
export interface ParsedMovie extends Movie {
  // 与Movie完全一致，保持向后兼容
}

/** 重刷记录 */
export interface ReplayRecord extends BaseEntity {
  id: string;
  movie_id: string;
  watch_date: string; // 主要观看日期字段
  episode?: number | null; // 观看的集数（电视剧）
  season?: number | null; // 观看的季数（电视剧）
  duration: number; // 观看时长（分钟）
  progress: number; // 观看进度（0-1）
  rating?: number | null; // 评分（0-5）
  notes?: string | null; // 观看笔记
  // 兼容性字段
  watched_date?: string; // 兼容旧版API
  episode_number?: number; // 兼容旧版API
  season_number?: number | null; // 兼容旧版API
  timestamp?: string; // 兼容旧版API
  status?: string; // 兼容旧版API
  // 关联数据
  movie?: Pick<Movie, 'id' | 'title' | 'type'> & Partial<Movie>; // 关联的电影信息（查询时可选包含）
}

/** 电视剧更新提醒数据 */
export interface TVEpisodeReminder {
  movie_id: string;
  tmdb_id?: number;
  title: string;
  status: Status;
  poster_path?: string | null;
  air_date: string;
  season_number?: number;
  episode_number?: number;
  episode_name?: string | null;
  overview?: string | null;
  still_path?: string | null;
}

/** 更新提醒按日期分组 */
export interface TVReminderGroup {
  date: string;
  items: TVEpisodeReminder[];
}

/** 评论/评价 */
export interface Review extends BaseEntity {
  id: string;
  movie_id: string;
  rating?: number;
  review_text?: string;
  is_spoiler: boolean;
}

// ==================== UI状态类型 ====================

/** 分页信息 */
export interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

/** 搜索筛选条件 */
export interface SearchFilters {
  query?: string;
  type?: MovieType[];
  status?: Status[];
  genres?: string[];
  yearRange?: [number, number];
  ratingRange?: [number, number];
  sortBy?: 'title' | 'year' | 'rating' | 'date_added' | 'date_updated';
  sortOrder?: 'asc' | 'desc';
}

/** 视图模式 */
export type ViewMode = 'grid' | 'list' | 'timeline';

/** 加载状态 */
export interface LoadingState {
  loading: boolean;
  error?: string;
}

/** API响应包装 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// ==================== 组件Props类型 ====================

/** 影视卡片组件Props */
export interface MovieCardProps {
  movie: ParsedMovie;
  viewMode?: ViewMode;
  showActions?: boolean;
  onClick?: (movie: ParsedMovie) => void;
}

/** 搜索结果组件Props */
export interface SearchResultProps {
  results: TMDbMovie[];
  loading: boolean;
  onSelect: (movie: TMDbMovie) => void;
}

/** 筛选器组件Props */
export interface FilterProps {
  filters: SearchFilters;
  onChange: (filters: SearchFilters) => void;
}

// ==================== 表单类型 ====================

/** 添加影视作品表单 */
export interface AddMovieForm {
  tmdb_id: number;
  type: MovieType;
  status: Status;
  personal_rating?: number;
  notes?: string;
  watch_source?: string;
  tags?: string[];
  current_episode?: number;
  current_season?: number;
  total_episodes?: number;
  total_seasons?: number;
  seasons_data?: SeasonsData;
  watched_date?: string; // 观看日期，用于设置date_added字段
}

/** 更新影视作品表单 */
export interface UpdateMovieForm extends Partial<Movie> {
  id: string;
}

/** 重刷记录表单 - 用于创建和更新重刷记录 */
export interface ReplayRecordForm {
  movie_id: string; // 关联的电影ID
  watch_date: string; // 观看日期 (ISO 8601格式)
  episode?: number | null; // 观看的集数（电视剧）
  season?: number | null; // 观看的季数（电视剧）
  duration: number; // 观看时长（分钟）
  progress: number; // 观看进度（0-1之间的小数）
  rating?: number | null; // 评分（0-5）
  notes?: string | null; // 观看笔记
}

/** 重刷记录查询参数 */
export interface ReplayRecordQuery {
  movieId?: string; // 筛选特定电影的重刷记录
  limit?: number; // 限制返回数量
  offset?: number; // 分页偏移量
  startDate?: string; // 开始日期筛选
  endDate?: string; // 结束日期筛选
  includeMovie?: boolean; // 是否包含关联的电影信息
}

/** 重刷记录统计信息 */
export interface ReplayRecordStats {
  total_records: number; // 总重刷记录数
  total_duration: number; // 总观看时长（分钟）
  average_progress: number; // 平均观看进度
  most_watched_movie?: {
    movie_id: string;
    title: string;
    watch_count: number;
  }; // 观看次数最多的电影
  recent_activity: {
    last_7_days: number;
    last_30_days: number;
  }; // 最近活动统计
}

// ==================== 路由类型 ====================

/** 路由名称 */
export type RouteName = 'Home' | 'Search' | 'Record' | 'History' | 'Detail';

/** 路由参数 */
export interface RouteParams {
  Home: {};
  Search: { query?: string };
  Record: {};
  History: {};
  Detail: { id: string };
}

// ==================== 事件类型 ====================

/** 窗口事件 */
export interface WindowEvent {
  type: 'minimize' | 'maximize' | 'close' | 'restore';
}

/** 托盘事件 */
export interface TrayEvent {
  type: 'show' | 'hide' | 'quit';
}

// ==================== 工具类型 ====================

/** 深度部分类型 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/** 选择性必须类型 */
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

/** 不包含某些字段的类型 */
export type OmitFields<T, K extends keyof T> = Omit<T, K>;

export interface Statistics {
  total_movies: number;
  completed_movies: number;
  average_rating: number;
  movies_this_month: number;
  movies_this_year: number;
}

/** 更新信息 */
export interface UpdateInfo {
  version: string;
  downloadUrl: string;
  releaseNotes?: string;
  publishDate?: string;
}

/** 更新检查结果 */
export interface UpdateCheckResult {
  has_update: boolean;
  version?: string;
  download_url?: string;
  release_notes?: string;
  publish_date?: string;
}

// ==================== API 相关类型 ====================

/** 请求队列项类型 */
export interface QueuedRequest<T = unknown> {
  request: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (error: Error) => void;
}

/** 缓存项类型 */
export interface CacheItem<T> {
  data: T;
  timestamp: number;
}

/** TMDb 图片响应类型 */
export interface TMDbImageResponse {
  backdrops: TMDbImage[];
  posters: TMDbImage[];
}

/** TMDb 图片类型 */
export interface TMDbImage {
  aspect_ratio: number;
  file_path: string;
  height: number;
  iso_639_1: string | null;
  vote_average: number;
  vote_count: number;
  width: number;
}

/** TMDb 流派响应类型 */
export interface TMDbGenreResponse {
  genres: TMDbGenre[];
}

/** 数据库行类型 */
export interface DatabaseRow {
  [key: string]: unknown;
}

/** 错误处理类型 */
export interface ErrorWithMessage {
  message: string;
  code?: string | number;
  status?: number;
  response?: {
    statusText?: string;
    data?: {
      message?: string;
    };
  };
  request?: unknown;
}

/** 模态框类型 */
export type ModalType = 'info' | 'warning' | 'error' | 'success' | 'confirm';

/** 窗口设置类型 */
export interface WindowSettings {
  width: number;
  height: number;
  minWidth: number;
  minHeight: number;
  maxWidth?: number;
  maxHeight?: number;
  resizable: boolean;
}

/** 设置类型 */
export interface AppSettings {
  minimizeToTray: boolean;
  usageAnalyticsEnabled: boolean;
  usageAnalyticsPrompted: boolean;
  window: WindowSettings;
}

/** 文件操作类型 */
export interface FileOperationResult {
  success: boolean;
  message?: string;
  data?: unknown;
}

/** CSV 解析结果类型 */
export interface CSVParseResult {
  [key: string]: string | number | boolean;
}

/** 豆瓣数据类型 */
export interface DoubanMovieData {
  title: string;
  year?: number;
  rating?: number;
  genres?: string[];
  [key: string]: unknown;
}

/** 搜索结果相关性评分类型 */
export interface RelevanceScoreResult {
  score: number;
  factors: {
    titleMatch: number;
    yearMatch: number;
    genreMatch: number;
  };
}
