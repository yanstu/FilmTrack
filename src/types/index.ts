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
  media_type?: 'movie' | 'tv' | 'person';
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
  year: number;
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
  current_episode?: number; // 当前观看到的集数
  current_season?: number; // 当前观看到的季数
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

/** 观看历史记录 */
export interface WatchHistory extends BaseEntity {
  id: string;
  movie_id: string;
  watched_date: string; // 兼容性字段
  watch_date: string;
  episode?: number;
  episode_number?: number; // 兼容性字段
  season?: number;
  duration: number; // 观看时长（分钟）
  progress: number; // 观看进度（0-1）
  notes?: string;
  timestamp?: string; // 兼容性字段
  status?: string; // 兼容性字段
  movie?: Movie; // 关联的电影信息
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
  seasons_data?: SeasonsData;
}

/** 更新影视作品表单 */
export interface UpdateMovieForm extends Partial<AddMovieForm> {
  id: string;
}

/** 观看历史记录表单 */
export interface WatchHistoryForm {
  movie_id: string;
  watch_date: string;
  episode?: number;
  season?: number;
  duration: number;
  progress: number;
  notes?: string;
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