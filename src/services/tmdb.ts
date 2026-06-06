/**
 * TMDb 服务兼容入口
 * 统一复用 src/utils/api.ts 中的真实实现，避免出现双轨 API 逻辑
 * @author yanstu
 */

import { tmdbAPI as sharedTmdbAPI } from '../utils/api'
import type {
  Movie,
  TMDbMovie,
  TMDbResponse
} from '../types'

export type TMDbSearchResponse = TMDbResponse<TMDbMovie>

const getMediaType = (movie: TMDbMovie): 'movie' | 'tv' => {
  if (movie.media_type) {
    return movie.media_type
  }
  return movie.title ? 'movie' : 'tv'
}

/**
 * 兼容旧版 TMDbService 静态调用方式
 */
export class TMDbService {
  static searchMovies(query: string, page: number = 1) {
    return sharedTmdbAPI.searchMovies(query, page)
  }

  static searchTVShows(query: string, page: number = 1) {
    return sharedTmdbAPI.searchTVShows(query, page)
  }

  static searchMulti(query: string, page: number = 1) {
    return sharedTmdbAPI.searchMulti(query, page)
  }

  static getPopularMovies(page: number = 1) {
    return sharedTmdbAPI.getPopularMovies(page)
  }

  static getPopularTV(page: number = 1) {
    return sharedTmdbAPI.getPopularTV(page)
  }

  static getMovieDetails(id: number) {
    return sharedTmdbAPI.getMovieDetails(id)
  }

  static getTVDetails(id: number) {
    return sharedTmdbAPI.getTVDetails(id)
  }

  static getGenres(mediaType: 'movie' | 'tv') {
    return sharedTmdbAPI.getGenres(mediaType)
  }

  static getImageURL(path: string): string {
    return sharedTmdbAPI.getImageURL(path)
  }

  static getFullImageURL(
    path: string | null,
    defaultImage: string = '/images/placeholder-movie.jpg'
  ): string {
    return path ? sharedTmdbAPI.getImageURL(path) : defaultImage
  }

  static loadBackdropImages(tmdbId: number, mediaType: 'movie' | 'tv') {
    return sharedTmdbAPI.loadBackdropImages(tmdbId, mediaType)
  }
}

/**
 * 兼容旧版 TMDbTransformer 工具
 */
export class TMDbTransformer {
  static tmdbToMovie(tmdbMovie: TMDbMovie): Partial<Movie> {
    const releaseDate = tmdbMovie.release_date || tmdbMovie.first_air_date
    const year = releaseDate ? new Date(releaseDate).getFullYear() : null

    return {
      title: tmdbMovie.title || tmdbMovie.name || '',
      original_title: tmdbMovie.original_title || tmdbMovie.original_name || '',
      overview: tmdbMovie.overview || null,
      poster_path: tmdbMovie.poster_path || null,
      backdrop_path: tmdbMovie.backdrop_path || null,
      year,
      type: getMediaType(tmdbMovie),
      tmdb_id: tmdbMovie.id,
      tmdb_rating: tmdbMovie.vote_average || 0,
      vote_average: tmdbMovie.vote_average || 0,
      runtime: null,
      genres: [],
      status: 'planned',
      personal_rating: null,
      watch_count: 0,
      tags: null
    }
  }

  static formatReleaseDate(dateString: string | null): string {
    if (!dateString) {
      return '未知'
    }

    const timestamp = new Date(dateString).getTime()
    return Number.isNaN(timestamp)
      ? '未知'
      : new Date(timestamp).getFullYear().toString()
  }

  static formatRating(rating: number): string {
    return rating.toFixed(1)
  }

  static formatRuntime(runtime: number | null): string {
    if (!runtime) {
      return '未知'
    }

    const hours = Math.floor(runtime / 60)
    const minutes = runtime % 60

    if (hours > 0) {
      return `${hours}小时${minutes}分钟`
    }

    return `${minutes}分钟`
  }
}

export const tmdbAPI = {
  ...sharedTmdbAPI,
  getFullImageURL: TMDbService.getFullImageURL
}
