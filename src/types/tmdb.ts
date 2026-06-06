/**
 * TMDb API 响应类型定义
 * 基于 https://api.themoviedb.org/3/tv/106449 的响应结构
 */

// 基础类型
export interface TMDbGenre {
  id: number;
  name: string;
}

export interface TMDbProductionCompany {
  id: number;
  logo_path: string | null;
  name: string;
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

// 创作者信息
export interface TMDbCreator {
  id: number;
  credit_id: string;
  name: string;
  gender: number;
  profile_path: string | null;
}

// 电影系列信息
export interface TMDbCollection {
  id: number;
  name: string;
  poster_path: string | null;
  backdrop_path: string | null;
}

export interface TMDbNetwork {
  id: number;
  logo_path: string | null;
  name: string;
  origin_country: string;
}

// 剧集相关
export interface TMDbEpisode {
  id: number;
  name: string;
  overview: string;
  vote_average: number;
  vote_count: number;
  air_date: string;
  episode_number: number;
  episode_type: string;
  production_code: string;
  runtime: number;
  season_number: number;
  show_id: number;
  still_path: string | null;
}

export interface TMDbSeason {
  air_date: string;
  episode_count: number;
  id: number;
  name: string;
  overview: string;
  poster_path: string | null;
  season_number: number;
  vote_average: number;
}

// 电视剧详情
export interface TMDbTVDetails {
  adult: boolean;
  backdrop_path: string | null;
  created_by: TMDbCreator[];
  episode_run_time: number[];
  first_air_date: string;
  genres: TMDbGenre[];
  homepage: string;
  id: number;
  in_production: boolean;
  languages: string[];
  last_air_date: string;
  last_episode_to_air: TMDbEpisode | null;
  name: string;
  next_episode_to_air: TMDbEpisode | null;
  networks: TMDbNetwork[];
  number_of_episodes: number;
  number_of_seasons: number;
  origin_country: string[];
  original_language: string;
  original_name: string;
  overview: string;
  popularity: number;
  poster_path: string | null;
  production_companies: TMDbProductionCompany[];
  production_countries: TMDbProductionCountry[];
  seasons: TMDbSeason[];
  spoken_languages: TMDbSpokenLanguage[];
  status: string; // "Returning Series", "Ended", "Canceled", etc.
  tagline: string;
  type: string;
  vote_average: number;
  vote_count: number;
}

// 电影详情
export interface TMDbMovieDetails {
  adult: boolean;
  backdrop_path: string | null;
  belongs_to_collection: TMDbCollection | null;
  budget: number;
  genres: TMDbGenre[];
  homepage: string;
  id: number;
  imdb_id: string | null;
  original_language: string;
  original_title: string;
  overview: string;
  popularity: number;
  poster_path: string | null;
  production_companies: TMDbProductionCompany[];
  production_countries: TMDbProductionCountry[];
  release_date: string;
  revenue: number;
  runtime: number | null;
  spoken_languages: TMDbSpokenLanguage[];
  status: string; // "Released", "Post Production", etc.
  tagline: string;
  title: string;
  video: boolean;
  vote_average: number;
  vote_count: number;
}

// 搜索结果基础类型
export interface TMDbSearchResult {
  adult: boolean;
  backdrop_path: string | null;
  id: number;
  media_type: 'movie' | 'tv';
  original_language: string;
  overview: string;
  popularity: number;
  poster_path: string | null;
  vote_average: number;
  vote_count: number;
  genre_ids: number[];
}

export interface TMDbMovieSearchResult extends TMDbSearchResult {
  media_type: 'movie';
  title: string;
  original_title: string;
  release_date: string;
  video: boolean;
}

export interface TMDbTVSearchResult extends TMDbSearchResult {
  media_type: 'tv';
  name: string;
  original_name: string;
  first_air_date: string;
  origin_country: string[];
}

// API 响应包装类型
export interface TMDbApiResponse<T> {
  page?: number;
  results?: T[];
  total_pages?: number;
  total_results?: number;
}

// 状态映射
export const TMDB_TV_STATUS_MAP = {
  'Returning Series': '连载中',
  'Ended': '已完结',
  'Canceled': '已取消',
  'In Production': '制作中',
  'Pilot': '试播',
  'Planned': '计划中'
} as const;

export const TMDB_MOVIE_STATUS_MAP = {
  'Released': '已上映',
  'Post Production': '后期制作',
  'In Production': '制作中',
  'Planned': '计划中',
  'Rumored': '传闻',
  'Canceled': '已取消'
} as const;

// 类型别名
export type TMDbMovie = TMDbMovieSearchResult;
export type TMDbTV = TMDbTVSearchResult;
export type TMDbMediaItem = TMDbMovie | TMDbTV;

// 工具函数类型
export interface TMDbImageConfig {
  base_url: string;
  secure_base_url: string;
  backdrop_sizes: string[];
  logo_sizes: string[];
  poster_sizes: string[];
  profile_sizes: string[];
  still_sizes: string[];
}

/**
 * 示例数据结构（基于凡人修仙传的API响应）
 * 
 * TV Series Example:
 * - ID: 106449
 * - Name: "凡人修仙传"
 * - Status: "Returning Series"
 * - Number of Episodes: 182
 * - Number of Seasons: 1
 * - In Production: true
 * - Networks: [bilibili]
 * - Vote Average: 9.1
 * - Vote Count: 43
 */