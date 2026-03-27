/**
 * 豆瓣导入功能的 Hook
 */

import { computed, ref } from 'vue';
import { invoke } from '@tauri-apps/api/core';
import { useMovieStore } from '../../../stores/movie';
import { databaseAPI } from '../../../services/database-api';
import { tmdbAPI } from '../../../utils/api';
import {
  cleanTitle,
  calculateTitleSimilarity,
  generateSearchVariants,
} from '../../../utils/titleUtils';
import {
  calculateRelevanceScore,
  generateTMDbSearchStrategies,
} from '../../../utils/tmdbSearchEnhancer';
import {
  buildSeasonsDataFromTmdb,
  normalizeProgressForStatus,
} from '../../../utils/seasonProgress';
import type {
  ImportProgress,
  ImportLog,
  DoubanMovie,
  ImportReviewItem,
} from '../../../types/import';
import type {
  Movie,
  TMDbMovie,
  TMDbMovieDetail,
  UpdateMovieForm,
} from '../../../types';

interface ImportSettings {
  enableTitleCleaning: boolean;
  enableTMDbMatching: boolean;
}

type MediaType = 'movie' | 'tv';

type IndexedMovie = Movie & {
  normalizedTitle: string;
};

type MatchedDetail = {
  mediaType: MediaType;
  detail: TMDbMovieDetail;
  result: TMDbMovie;
  strategy: string;
  score: number;
};

type RankedCandidate = {
  mediaType: MediaType;
  result: TMDbMovie;
  strategy: string;
  score: number;
};

type ImportOperation =
  | { kind: 'skip'; message: string }
  | { kind: 'merge'; payload: UpdateMovieForm; message: string; logType?: ImportLog['type'] }
  | { kind: 'insert'; payload: Partial<Movie>; message: string };

const MATCH_SCORE_THRESHOLD = 0.45;
const HIGH_CONFIDENCE_SCORE = 0.82;
const SEARCH_RESULT_LIMIT = 5;
const STRONG_STRATEGY_LIMIT = 3;
const DETAIL_FETCH_LIMIT = 2;

function createEmptyImportProgress(): ImportProgress {
  return {
    total: 0,
    current: 0,
    success: 0,
    skipped: 0,
    failed: 0,
    processed: 0,
    matched: 0,
  };
}

// 导入状态提升到模块级，避免切换页面后组件重建导致进度丢失
const doubanUserId = ref('');
const isImporting = ref(false);
const importSettings = ref<ImportSettings>({
  enableTitleCleaning: true,
  enableTMDbMatching: true,
});
const importProgress = ref<ImportProgress>(createEmptyImportProgress());
const importLogs = ref<ImportLog[]>([]);
const reviewItems = ref<ImportReviewItem[]>([]);
const shouldStop = ref(false);
const importSessionId = ref<string>('');
const hasImportSession = computed(() =>
  isImporting.value ||
  importProgress.value.total > 0 ||
  importLogs.value.length > 0
);
const pendingReviewCount = computed(() => reviewItems.value.filter(item => item.status === 'pending').length);
const latestReviewItems = computed(() => reviewItems.value.slice(0, 8));

function createReviewItem(
  movie: DoubanMovie,
  category: ImportReviewItem['category'],
  reason: string,
  options: Partial<Omit<ImportReviewItem, 'id' | 'title' | 'originalTitle' | 'type' | 'category' | 'status' | 'reason' | 'actionLabel' | 'query' | 'timestamp'>> & {
    actionLabel?: string;
    query?: string;
  } = {}
): ImportReviewItem {
  return {
    id: `${movie.douban_id || movie.title}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    title: movie.title,
    originalTitle: movie.original_title || undefined,
    type: movie.type_ === 'movie' ? 'movie' : 'tv',
    category,
    status: 'pending',
    reason,
    actionLabel: options.actionLabel || '去修正',
    query: options.query || movie.original_title || movie.title,
    tmdbId: options.tmdbId,
    seasonNumber: options.seasonNumber,
    doubanId: movie.douban_id,
    matchedTitle: options.matchedTitle,
    score: options.score,
    timestamp: Date.now(),
  };
}

function upsertReviewItem(item: ImportReviewItem) {
  const existingIndex = reviewItems.value.findIndex(existing =>
    existing.title === item.title &&
    existing.category === item.category &&
    existing.status === 'pending'
  );

  if (existingIndex >= 0) {
    reviewItems.value.splice(existingIndex, 1, {
      ...reviewItems.value[existingIndex],
      ...item,
      id: reviewItems.value[existingIndex].id,
    });
    return;
  }

  reviewItems.value.unshift(item);
}

function normalizeTitle(title: string): string {
  return cleanTitle(title)
    .toLowerCase()
    .replace(/[\s\-_:：·•'".,!?！？（）()]/g, '');
}

function toArray<T>(value: T | T[] | null | undefined): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function uniqueStrings(values: Array<string | null | undefined>): string[] {
  return [...new Set(values.map(value => value?.trim()).filter((value): value is string => Boolean(value)))];
}

function formatMatchedTitle(detail: TMDbMovieDetail): string {
  return detail.title || detail.name || detail.original_title || detail.original_name || '未知标题';
}

function getPreferredWatchedDate(movie: DoubanMovie, existing: Movie): string | undefined {
  const candidates = uniqueStrings([movie.watched_date, existing.watched_date, existing.date_added]);
  if (candidates.length === 0) {
    return undefined;
  }

  return candidates.sort()[0];
}

function getPreferredRating(movie: DoubanMovie, existing: Movie): number | undefined {
  const ratingCandidates = [movie.rating, existing.personal_rating]
    .filter((rating): rating is number => typeof rating === 'number' && rating > 0);

  if (ratingCandidates.length === 0) {
    return undefined;
  }

  return Math.max(...ratingCandidates);
}

function mergeNotes(existingNotes?: string | null, newNotes?: string | null): string | undefined {
  const values = uniqueStrings([existingNotes ?? undefined, newNotes ?? undefined]);
  if (values.length === 0) {
    return undefined;
  }

  return values.join('\n\n');
}

function normalizeAirStatus(status?: string): Movie['air_status'] {
  switch (status) {
    case 'Returning Series':
    case 'In Production':
      return 'airing';
    case 'Ended':
      return 'ended';
    case 'Canceled':
      return 'cancelled';
    case 'Pilot':
      return 'pilot';
    case 'Planned':
      return 'planned';
    default:
      return undefined;
  }
}

function extractSeasonNumber(title: string): number | null {
  if (!title) return null;

  const chineseSeasonMatch = title.match(/第([一二三四五六七八九十\d]+)季/);
  if (chineseSeasonMatch) {
    const seasonText = chineseSeasonMatch[1];
    const chineseNumbers: Record<string, number> = {
      一: 1,
      二: 2,
      三: 3,
      四: 4,
      五: 5,
      六: 6,
      七: 7,
      八: 8,
      九: 9,
      十: 10,
    };

    if (chineseNumbers[seasonText]) {
      return chineseNumbers[seasonText];
    }

    return parseInt(seasonText, 10);
  }

  const englishSeasonMatch =
    title.match(/Season\s*(\d+)/i) || title.match(/S(\d+)/i);
  if (englishSeasonMatch) {
    return parseInt(englishSeasonMatch[1], 10);
  }

  return null;
}

function buildSearchStrategies(movie: DoubanMovie, enableTitleCleaning: boolean): string[] {
  const rawTitle = movie.title.trim();
  const originalTitle = movie.original_title?.trim() || '';
  const cleanedTitle = enableTitleCleaning ? cleanTitle(rawTitle) : rawTitle;
  const baseTitle = movie.type_ === 'tv' ? cleanedTitle : rawTitle;

  const strategies = [
    rawTitle,
    baseTitle,
    originalTitle,
    ...generateSearchVariants(rawTitle),
    ...generateTMDbSearchStrategies(baseTitle),
    ...generateSearchVariants(originalTitle),
  ];

  return [...new Set(strategies.map(item => item.trim()).filter(item => item.length >= 2))];
}

function buildMovieIndexes(movies: Movie[]) {
  const byTmdbId = new Map<number, IndexedMovie>();
  const byId = new Map<string, IndexedMovie>();
  const byType = new Map<MediaType, IndexedMovie[]>();

  for (const type of ['movie', 'tv'] as const) {
    byType.set(type, []);
  }

  for (const movie of movies) {
    const indexedMovie: IndexedMovie = {
      ...movie,
      normalizedTitle: normalizeTitle(movie.title),
    };

    byId.set(indexedMovie.id, indexedMovie);

    if (indexedMovie.tmdb_id) {
      byTmdbId.set(indexedMovie.tmdb_id, indexedMovie);
    }

    const typedList = byType.get(indexedMovie.type as MediaType);
    if (typedList) {
      typedList.push(indexedMovie);
    }
  }

  return { byTmdbId, byId, byType };
}

function findExistingByTitle(
  indexes: ReturnType<typeof buildMovieIndexes>,
  title: string,
  type: MediaType
): IndexedMovie | undefined {
  const normalizedTarget = normalizeTitle(title);
  const candidates = indexes.byType.get(type) || [];

  return candidates.find(movie =>
    movie.normalizedTitle === normalizedTarget ||
    calculateTitleSimilarity(movie.title, title) >= 0.85
  );
}

function updateIndexes(
  indexes: ReturnType<typeof buildMovieIndexes>,
  movie: Movie,
  previousMovie?: Movie
) {
  if (previousMovie?.tmdb_id) {
    indexes.byTmdbId.delete(previousMovie.tmdb_id);
  }

  if (previousMovie) {
    indexes.byId.delete(previousMovie.id);
  }

  if (previousMovie) {
    const previousList = indexes.byType.get(previousMovie.type as MediaType);
    if (previousList) {
      const previousIndex = previousList.findIndex(item => item.id === previousMovie.id);
      if (previousIndex !== -1) {
        previousList.splice(previousIndex, 1);
      }
    }
  }

  const indexedMovie: IndexedMovie = {
    ...movie,
    normalizedTitle: normalizeTitle(movie.title),
  };

  if (indexedMovie.tmdb_id) {
    indexes.byTmdbId.set(indexedMovie.tmdb_id, indexedMovie);
  }

  indexes.byId.set(indexedMovie.id, indexedMovie);

  const nextList = indexes.byType.get(indexedMovie.type as MediaType);
  if (nextList) {
    const existingIndex = nextList.findIndex(item => item.id === indexedMovie.id);
    if (existingIndex !== -1) {
      nextList.splice(existingIndex, 1, indexedMovie);
    } else {
      nextList.push(indexedMovie);
    }
  }
}

async function fetchSearchCandidates(
  mediaType: MediaType,
  strategy: string
): Promise<TMDbMovie[]> {
  const searchResult = mediaType === 'movie'
    ? await tmdbAPI.searchMoviesExact(strategy)
    : await tmdbAPI.searchTVShowsExact(strategy);

  const results = searchResult.data?.results || [];
  return results.slice(0, SEARCH_RESULT_LIMIT);
}

async function fetchMatchedDetail(
  mediaType: MediaType,
  result: TMDbMovie
): Promise<TMDbMovieDetail | null> {
  const detailResponse = mediaType === 'movie'
    ? await tmdbAPI.getMovieDetails(result.id)
    : await tmdbAPI.getTVDetails(result.id);

  if (!detailResponse.success || !detailResponse.data) {
    return null;
  }

  return detailResponse.data;
}

async function matchTmdbRecord(
  movie: DoubanMovie,
  addLog: (type: ImportLog['type'], message: string) => Promise<void>,
  enableTitleCleaning: boolean
): Promise<MatchedDetail | null> {
  const strategies = buildSearchStrategies(movie, enableTitleCleaning);
  const preferredTypes: MediaType[] = movie.type_ === 'movie'
    ? ['movie', 'tv']
    : ['tv', 'movie'];

  const rankedCandidates: RankedCandidate[] = [];
  const seenCandidateIds = new Set<string>();
  let bestCandidateScore = 0;
  let shouldStopSearch = false;

  for (let strategyIndex = 0; strategyIndex < strategies.length; strategyIndex++) {
    if (shouldStopSearch) {
      break;
    }

    const strategy = strategies[strategyIndex];
    const allowCrossTypeFallback = strategyIndex < STRONG_STRATEGY_LIMIT;
    const mediaTypes = allowCrossTypeFallback ? preferredTypes : [preferredTypes[0]];

    for (const mediaType of mediaTypes) {
      const candidates = await fetchSearchCandidates(mediaType, strategy);

      if (candidates.length === 0) {
        continue;
      }

      for (const result of candidates) {
        const score = Math.max(
          calculateRelevanceScore(movie.title, result),
          movie.original_title ? calculateRelevanceScore(movie.original_title, result) : 0,
          strategy !== movie.title ? calculateRelevanceScore(strategy, result) : 0
        );

        if (score < MATCH_SCORE_THRESHOLD) {
          continue;
        }

        const candidateKey = `${mediaType}:${result.id}`;
        const existingIndex = rankedCandidates.findIndex(candidate => candidate.mediaType === mediaType && candidate.result.id === result.id);

        if (existingIndex >= 0) {
          if (score > rankedCandidates[existingIndex].score) {
            rankedCandidates[existingIndex] = {
              mediaType,
              result,
              strategy,
              score,
            };
            bestCandidateScore = Math.max(bestCandidateScore, score);
          }
          continue;
        }

        if (seenCandidateIds.has(candidateKey)) {
          continue;
        }

        seenCandidateIds.add(candidateKey);
        rankedCandidates.push({
          mediaType,
          result,
          strategy,
          score,
        });
        bestCandidateScore = Math.max(bestCandidateScore, score);
      }
    }

    if (bestCandidateScore >= HIGH_CONFIDENCE_SCORE) {
      shouldStopSearch = true;
    }
  }

  if (rankedCandidates.length === 0) {
    await addLog(
      'warning',
      `TMDb未命中: "${movie.title}" - 已尝试 ${strategies.length} 个搜索策略与跨类型兜底`
    );
    return null;
  }

  rankedCandidates.sort((left, right) => right.score - left.score);

  const finalists = rankedCandidates.slice(0, DETAIL_FETCH_LIMIT);
  let bestMatch: MatchedDetail | null = null;

  for (const finalist of finalists) {
    const detail = await fetchMatchedDetail(finalist.mediaType, finalist.result);
    if (!detail) {
      continue;
    }

    bestMatch = {
      mediaType: finalist.mediaType,
      detail,
      result: finalist.result,
      strategy: finalist.strategy,
      score: finalist.score,
    };

    if (finalist.score >= HIGH_CONFIDENCE_SCORE) {
      return bestMatch;
    }

    break;
  }

  if (!bestMatch) {
    await addLog(
      'warning',
      `TMDb详情获取失败: "${movie.title}" - 已找到候选结果但无法获取最终详情`
    );
    return null;
  }

  return bestMatch;
}

function buildMoviePayload(
  movie: DoubanMovie,
  seasonNumber: number | null,
  matched: MatchedDetail | null
): Partial<Movie> {
  if (!matched) {
    return {
      title: movie.title,
      original_title: movie.original_title || movie.title,
      type: movie.type_ === 'movie' ? 'movie' : 'tv',
      status: 'completed',
      personal_rating: movie.rating || null,
      notes: movie.comment || null,
      watched_date: movie.watched_date || undefined,
    };
  }

  const { detail, mediaType } = matched;
  const payload: Partial<Movie> = {
    title: detail.title || detail.name || movie.title,
    original_title:
      detail.original_title ||
      detail.original_name ||
      movie.original_title ||
      detail.title ||
      detail.name ||
      movie.title,
    overview: detail.overview,
    poster_path: detail.poster_path,
    backdrop_path: detail.backdrop_path,
    tmdb_id: detail.id,
    tmdb_rating: detail.vote_average,
    year: new Date(detail.release_date || detail.first_air_date || '').getFullYear() || null,
    runtime: detail.runtime || toArray(detail.episode_run_time)[0] || null,
    genres: detail.genres?.map(genre => genre.name) || [],
    type: mediaType,
    status: 'completed',
    personal_rating: movie.rating || null,
    notes: movie.comment || null,
    watched_date: movie.watched_date || undefined,
  };

  if (mediaType === 'tv') {
    payload.total_seasons = detail.number_of_seasons || null;
    payload.total_episodes = detail.number_of_episodes || null;
    payload.seasons_data = buildSeasonsDataFromTmdb(detail.seasons);
    payload.air_status = normalizeAirStatus(detail.status);
    payload.current_season =
      seasonNumber ??
      (detail.number_of_seasons === 1 ? 1 : payload.current_season);
  }

  return normalizeProgressForStatus(payload);
}

function buildMergePayload(
  existingMovie: Movie,
  movie: DoubanMovie,
  seasonNumber: number | null,
  matched: MatchedDetail | null
): UpdateMovieForm {
  const tmdbPayload = buildMoviePayload(movie, seasonNumber, matched);
  const mergedNotes = mergeNotes(existingMovie.notes, movie.comment);
  const mergedWatchedDate = getPreferredWatchedDate(movie, existingMovie);
  const mergedRating = getPreferredRating(movie, existingMovie);
  const nextCurrentSeason =
    seasonNumber && seasonNumber > (existingMovie.current_season || 0)
      ? seasonNumber
      : existingMovie.current_season;

  const mergedPayload: UpdateMovieForm = {
    id: existingMovie.id,
    title: matched ? (tmdbPayload.title || existingMovie.title) : existingMovie.title,
    status: existingMovie.status === 'completed' ? 'completed' : 'completed',
    personal_rating: mergedRating,
    notes: mergedNotes,
    watch_source: existingMovie.watch_source || undefined,
    watched_date: mergedWatchedDate,
    current_episode: existingMovie.current_episode,
    current_season: nextCurrentSeason,
  };

  if (matched) {
    mergedPayload.title = tmdbPayload.title || existingMovie.title;
    mergedPayload.overview = tmdbPayload.overview || existingMovie.overview || undefined;
    mergedPayload.poster_path = tmdbPayload.poster_path || existingMovie.poster_path || undefined;
    mergedPayload.backdrop_path = tmdbPayload.backdrop_path || existingMovie.backdrop_path || undefined;
    mergedPayload.year = tmdbPayload.year ?? existingMovie.year ?? undefined;
    mergedPayload.tmdb_rating = tmdbPayload.tmdb_rating ?? existingMovie.tmdb_rating ?? undefined;
    mergedPayload.runtime = tmdbPayload.runtime ?? existingMovie.runtime ?? undefined;
    mergedPayload.genres = (tmdbPayload.genres as string[] | undefined) || existingMovie.genres;
    mergedPayload.total_episodes = tmdbPayload.total_episodes ?? existingMovie.total_episodes ?? undefined;
    mergedPayload.total_seasons = tmdbPayload.total_seasons ?? existingMovie.total_seasons ?? undefined;
    mergedPayload.air_status = tmdbPayload.air_status || existingMovie.air_status;
    mergedPayload.tmdb_id = tmdbPayload.tmdb_id ?? existingMovie.tmdb_id ?? undefined;
    mergedPayload.original_title =
      (tmdbPayload.original_title as string | undefined) ||
      existingMovie.original_title;
  }

  return normalizeProgressForStatus(mergedPayload);
}

function describeMerge(existingMovie: Movie, nextPayload: UpdateMovieForm): string {
  const changes: string[] = [];

  if (nextPayload.current_season && nextPayload.current_season !== existingMovie.current_season) {
    changes.push(`季数 ${existingMovie.current_season || 0} -> ${nextPayload.current_season}`);
  }

  if (nextPayload.personal_rating && nextPayload.personal_rating !== existingMovie.personal_rating) {
    changes.push(`评分 -> ${nextPayload.personal_rating}`);
  }

  if (nextPayload.watched_date && nextPayload.watched_date !== existingMovie.watched_date) {
    changes.push(`观看日期 -> ${nextPayload.watched_date}`);
  }

  if (nextPayload.notes && nextPayload.notes !== existingMovie.notes) {
    changes.push('合并评语');
  }

  if (nextPayload.tmdb_id && nextPayload.tmdb_id !== existingMovie.tmdb_id) {
    changes.push(`补齐 TMDb ID ${nextPayload.tmdb_id}`);
  }

  return changes.join('，');
}

function decideImportOperation(
  movie: DoubanMovie,
  indexes: ReturnType<typeof buildMovieIndexes>,
  seasonNumber: number | null,
  matched: MatchedDetail | null
): ImportOperation {
  const matchedExisting = matched?.detail.id
    ? indexes.byTmdbId.get(matched.detail.id)
    : undefined;

  const fallbackType: MediaType = matched?.mediaType ?? (movie.type_ === 'movie' ? 'movie' : 'tv');
  const fallbackExisting = findExistingByTitle(indexes, movie.title, fallbackType);

  const existingMovie = matchedExisting || fallbackExisting;

  if (existingMovie) {
    const mergePayload = buildMergePayload(existingMovie, movie, seasonNumber, matched);
    const mergeSummary = describeMerge(existingMovie, mergePayload);

    if (!mergeSummary) {
      return {
        kind: 'skip',
        message: `跳过 "${movie.title}" - 已存在且无可合并的新信息`,
      };
    }

    return {
      kind: 'merge',
      payload: mergePayload,
      message: `合并更新 "${existingMovie.title}" - ${mergeSummary}`,
      logType: 'info',
    };
  }

  if (!matched) {
    return {
      kind: 'skip',
      message: `跳过 "${movie.title}" - 未找到可接受的 TMDb 匹配`,
    };
  }

  return {
    kind: 'insert',
    payload: buildMoviePayload(movie, seasonNumber, matched),
    message: `成功匹配 TMDb: "${movie.title}" -> "${formatMatchedTitle(matched.detail)}" (score=${matched.score.toFixed(2)}, strategy="${matched.strategy}")`,
  };
}

/**
 * 豆瓣导入 Hook
 */
export function useDoubanImport() {
  const movieStore = useMovieStore();

  const addLog = async (type: ImportLog['type'], message: string) => {
    importLogs.value.push({
      type,
      message,
      timestamp: Date.now(),
    });

    try {
      const logMessage = `[${type.toUpperCase()}] ${message}`;
      await invoke('write_douban_import_log', {
        logMessage,
        sessionId: importSessionId.value || undefined,
      });
    } catch (error) {
      console.error('写入日志文件失败:', error);
    }
  };

  const resetImport = () => {
    importProgress.value = createEmptyImportProgress();
    importLogs.value = [];
    reviewItems.value = [];
    shouldStop.value = false;
    importSessionId.value = new Date()
      .toISOString()
      .replace(/[:.]/g, '-')
      .slice(0, 19);
  };

  const clearImportSession = () => {
    if (isImporting.value) {
      return;
    }

    importProgress.value = createEmptyImportProgress();
    importLogs.value = [];
    reviewItems.value = [];
    shouldStop.value = false;
    importSessionId.value = '';
  };

  const openReviewItem = async (item: ImportReviewItem) => {
    item.status = 'resolved';
    const { default: router } = await import('../../../router');
    await router.push({
      name: 'Record',
      query: {
        query: item.query,
        from: 'douban-import',
        importReview: item.id,
      }
    });
  };

  const startDoubanImport = async () => {
    if (isImporting.value) return;

    resetImport();
    isImporting.value = true;

    try {
      await addLog('info', `正在获取豆瓣用户 ${doubanUserId.value} 的电影数量...`);
      const movieCount = await invoke<number>('estimate_douban_movie_count', {
        userId: doubanUserId.value,
      });

      if (movieCount === 0) {
        await addLog('error', '未找到电影数据，请检查豆瓣用户ID是否正确');
        return;
      }

      importProgress.value.total = movieCount;
      await addLog('info', `找到 ${movieCount} 部电影/电视剧，开始导入...`);

      const localMoviesResponse = await databaseAPI.getMovies();
      if (!localMoviesResponse.success || !localMoviesResponse.data) {
        throw new Error(localMoviesResponse.error || '读取本地影视库失败');
      }

      const indexes = buildMovieIndexes(localMoviesResponse.data);
      let start = 0;

      while (start < movieCount && !shouldStop.value) {
        const doubanMovies = await invoke<DoubanMovie[]>('fetch_douban_movies', {
          userId: doubanUserId.value,
          start,
        });

        if (doubanMovies.length === 0) {
          break;
        }

        for (const movie of doubanMovies) {
          if (shouldStop.value) break;

          importProgress.value.current++;
          importProgress.value.processed++;
          let seasonNumber: number | null = null;
          let matched: MatchedDetail | null = null;

          try {
            seasonNumber = extractSeasonNumber(movie.title);
            matched = importSettings.value.enableTMDbMatching
              ? await matchTmdbRecord(movie, addLog, importSettings.value.enableTitleCleaning)
              : null;

            if (matched) {
              importProgress.value.matched++;
            }

            const operation = decideImportOperation(movie, indexes, seasonNumber, matched);

            if (operation.kind === 'skip') {
              importProgress.value.skipped++;
              upsertReviewItem(createReviewItem(movie, 'skipped', operation.message, {
                query: movie.original_title || movie.title,
                seasonNumber,
                score: matched?.score,
                matchedTitle: matched ? formatMatchedTitle(matched.detail) : undefined,
              }));
              await addLog('skip', operation.message);
              continue;
            }

            if (operation.kind === 'merge') {
              const existingMovie = indexes.byId.get(operation.payload.id);
              const result = await databaseAPI.updateMovie(operation.payload);

              if (!result.success || !result.data) {
                importProgress.value.failed++;
                upsertReviewItem(createReviewItem(movie, 'failed', result.error || '更新数据库失败', {
                  query: movie.original_title || movie.title,
                  tmdbId: matched?.detail.id,
                  matchedTitle: matched ? formatMatchedTitle(matched.detail) : undefined,
                  score: matched?.score,
                  seasonNumber,
                }));
                await addLog(
                  'error',
                  `合并失败: "${movie.title}" - ${result.error || '更新数据库失败'}`
                );
                continue;
              }

              updateIndexes(indexes, result.data, existingMovie);
              importProgress.value.success++;
              if (matched && matched.score < HIGH_CONFIDENCE_SCORE) {
                upsertReviewItem(createReviewItem(movie, 'merged', '已完成合并，但匹配分数偏低，建议人工复核一次', {
                  query: result.data.title || movie.title,
                  tmdbId: matched.detail.id,
                  matchedTitle: formatMatchedTitle(matched.detail),
                  score: matched.score,
                  seasonNumber,
                  actionLabel: '去复核',
                }));
              }
              await addLog(operation.logType || 'success', operation.message);
              continue;
            }

            await addLog('info', operation.message);
            const result = await databaseAPI.addMovie(operation.payload);

            if (!result.success || !result.data) {
              importProgress.value.failed++;
              upsertReviewItem(createReviewItem(movie, 'failed', result.error || '写入数据库失败', {
                query: movie.original_title || movie.title,
                tmdbId: matched?.detail.id,
                matchedTitle: matched ? formatMatchedTitle(matched.detail) : undefined,
                score: matched?.score,
                seasonNumber,
              }));
              await addLog(
                'error',
                `导入失败: "${movie.title}" - ${result.error || '写入数据库失败'}`
              );
              continue;
            }

            updateIndexes(indexes, result.data);
            importProgress.value.success++;
            if (matched && matched.score < HIGH_CONFIDENCE_SCORE) {
              upsertReviewItem(createReviewItem(movie, 'matched', '已导入，但匹配分数偏低，建议检查是否导入到了正确条目', {
                query: result.data.title || movie.title,
                tmdbId: matched.detail.id,
                matchedTitle: formatMatchedTitle(matched.detail),
                score: matched.score,
                seasonNumber,
                actionLabel: '去确认',
              }));
            }
            await addLog('success', `成功导入: "${result.data.title}"`);
          } catch (error) {
            importProgress.value.failed++;
            upsertReviewItem(createReviewItem(movie, 'failed', String(error), {
              query: movie.original_title || movie.title,
              seasonNumber,
              score: matched?.score,
            }));
            await addLog('error', `处理失败: "${movie.title}" - ${error}`);
          }
        }

        start += doubanMovies.length;
      }

      if (shouldStop.value) {
        await addLog('warning', '导入已手动停止');
      } else {
        await movieStore.fetchMovies({ force: true });
        await addLog(
          'success',
          `导入完成! 成功: ${importProgress.value.success}, 跳过: ${importProgress.value.skipped}, 失败: ${importProgress.value.failed}`
        );
      }
    } catch (error) {
      await addLog('error', `导入过程出错: ${error}`);
    } finally {
      isImporting.value = false;
    }
  };

  const stopImport = () => {
    shouldStop.value = true;
    void addLog('warning', '正在停止导入...');
  };

  const updateImportSettings = (settings: Partial<ImportSettings>) => {
    importSettings.value = { ...importSettings.value, ...settings };
  };

  return {
    doubanUserId,
    isImporting,
    hasImportSession,
    importProgress,
    importLogs,
    reviewItems,
    latestReviewItems,
    pendingReviewCount,
    importSettings,
    startDoubanImport,
    stopImport,
    clearImportSession,
    openReviewItem,
    updateImportSettings,
  };
}

export const __doubanImportInternals = {
  matchTmdbRecord,
};
