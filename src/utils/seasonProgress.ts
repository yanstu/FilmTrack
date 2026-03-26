import type { Movie, SeasonData, SeasonsData, TMDbSeason } from '../types';

export interface SeasonOption {
  value: number;
  label: string;
}

export interface WatchProgressSummary {
  current: number;
  total: number;
  percentage: number;
  isCompleted: boolean;
}

export interface ProgressSnapshot {
  season: number;
  episode: number;
}

type ProgressLike = {
  type?: string | null;
  status?: string | null;
  current_season?: number | null;
  current_episode?: number | null;
  total_episodes?: number | null;
  total_seasons?: number | null;
  seasons_data?: SeasonsData | null;
};

const DEFAULT_PROGRESS: ProgressSnapshot = {
  season: 1,
  episode: 0
};

const sortSeasons = (seasonsData?: SeasonsData | null): SeasonData[] => {
  if (!seasonsData) {
    return [];
  }

  return Object.values(seasonsData)
    .filter(season => season.season_number > 0)
    .sort((left, right) => left.season_number - right.season_number);
};

export const isTvMovie = (movie?: Pick<ProgressLike, 'type'> | null): boolean => movie?.type === 'tv';

export const getNormalizedProgress = (
  source?: Pick<ProgressLike, 'type' | 'current_season' | 'current_episode'> | null
): ProgressSnapshot => {
  if (!isTvMovie(source)) {
    return DEFAULT_PROGRESS;
  }

  const season = Math.max(1, Number(source?.current_season || 1));
  const episode = Math.max(0, Number(source?.current_episode || 0));

  return { season, episode };
};

export const getSeasonOptions = (
  seasonsData?: SeasonsData | null,
  totalSeasons?: number | null
): SeasonOption[] => {
  const sortedSeasons = sortSeasons(seasonsData);
  if (sortedSeasons.length > 0) {
    return sortedSeasons.map(season => ({
      value: season.season_number,
      label: `第 ${season.season_number} 季`
    }));
  }

  const maxSeasons = Math.max(1, Number(totalSeasons || 1));
  return Array.from({ length: maxSeasons }, (_, index) => ({
    value: index + 1,
    label: `第 ${index + 1} 季`
  }));
};

export const buildSeasonsDataFromTmdb = (
  seasons?: TMDbSeason[] | null
): SeasonsData | undefined => {
  if (!Array.isArray(seasons)) {
    return undefined;
  }

  const normalized = seasons.reduce<SeasonsData>((result, season) => {
    if (!season || season.season_number <= 0) {
      return result;
    }

    result[season.season_number.toString()] = {
      season_number: season.season_number,
      name: `第 ${season.season_number} 季`,
      episode_count: Math.max(0, season.episode_count || 0),
      air_date: season.air_date,
      poster_path: season.poster_path
    };

    return result;
  }, {});

  return Object.keys(normalized).length > 0 ? normalized : undefined;
};

export const getSeasonEpisodeCount = (
  source?: Pick<ProgressLike, 'type' | 'seasons_data' | 'total_episodes'> | null,
  seasonNumber = 1
): number => {
  if (!isTvMovie(source)) {
    return 0;
  }

  const normalizedSeason = Math.max(1, seasonNumber);
  const seasonData = source?.seasons_data?.[normalizedSeason.toString()];
  if (seasonData?.episode_count && seasonData.episode_count > 0) {
    return seasonData.episode_count;
  }

  return Math.max(0, Number(source?.total_episodes || 0));
};

export const getLastEpisodeInSeason = (
  source?: Pick<ProgressLike, 'type' | 'seasons_data' | 'total_episodes'> | null,
  seasonNumber = 1
): number => {
  return getSeasonEpisodeCount(source, seasonNumber);
};

export const clampEpisodeForSeason = (
  source: Pick<ProgressLike, 'type' | 'seasons_data' | 'total_episodes'>,
  seasonNumber: number,
  episodeNumber?: number | null
): number => {
  if (!isTvMovie(source)) {
    return 0;
  }

  const maxEpisodes = getSeasonEpisodeCount(source, seasonNumber);
  const episode = Math.max(0, Number(episodeNumber || 0));

  if (maxEpisodes <= 0) {
    return episode;
  }

  return Math.min(episode, maxEpisodes);
};

export const getLastAvailableProgress = (
  source?: Pick<
    ProgressLike,
    'type' | 'seasons_data' | 'total_seasons' | 'total_episodes' | 'current_season' | 'current_episode'
  > | null
): ProgressSnapshot => {
  if (!isTvMovie(source)) {
    return DEFAULT_PROGRESS;
  }

  const currentProgress = getNormalizedProgress(source);
  const seasons = sortSeasons(source?.seasons_data);
  if (seasons.length > 0) {
    const lastSeason = seasons[seasons.length - 1];
    return {
      season: lastSeason.season_number,
      episode: Math.max(0, lastSeason.episode_count || 0)
    };
  }

  const totalSeasons = Math.max(currentProgress.season, Number(source?.total_seasons || 1));
  const totalEpisodes =
    source?.total_episodes !== undefined && source?.total_episodes !== null
      ? Math.max(0, Number(source.total_episodes))
      : currentProgress.episode;
  return {
    season: totalSeasons,
    episode: totalEpisodes
  };
};

export const getNextWatchProgress = (
  source?: Pick<
    ProgressLike,
    'type' | 'current_season' | 'current_episode' | 'seasons_data' | 'total_seasons' | 'total_episodes'
  > | null
): ProgressSnapshot | null => {
  if (!isTvMovie(source)) {
    return null;
  }

  const current = getNormalizedProgress(source);
  const currentSeasonMax = getSeasonEpisodeCount(source, current.season);

  if (currentSeasonMax > 0 && current.episode < currentSeasonMax) {
    return {
      season: current.season,
      episode: current.episode + 1
    };
  }

  const seasonOptions = getSeasonOptions(source?.seasons_data, source?.total_seasons).map(option => option.value);
  const nextSeason = seasonOptions.find(option => option > current.season);
  if (nextSeason) {
    return {
      season: nextSeason,
      episode: 1
    };
  }

  if (currentSeasonMax <= 0) {
    const fallbackTotal = Math.max(0, Number(source?.total_episodes || 0));
    if (current.episode < fallbackTotal) {
      return {
        season: current.season,
        episode: current.episode + 1
      };
    }
  }

  return null;
};

export const getOverallWatchedEpisodes = (
  source?: Pick<ProgressLike, 'type' | 'current_season' | 'current_episode' | 'seasons_data'> | null
): number => {
  if (!isTvMovie(source)) {
    return 0;
  }

  const { season, episode } = getNormalizedProgress(source);
  const seasons = sortSeasons(source?.seasons_data);
  if (seasons.length === 0) {
    return episode;
  }

  let totalWatchedEpisodes = 0;
  for (const item of seasons) {
    if (item.season_number < season) {
      totalWatchedEpisodes += Math.max(0, item.episode_count || 0);
      continue;
    }

    if (item.season_number === season) {
      totalWatchedEpisodes += clampEpisodeForSeason(source || {}, season, episode);
      break;
    }
  }

  return totalWatchedEpisodes;
};

export const getWatchProgressSummary = (
  source?: Pick<ProgressLike, 'type' | 'current_season' | 'current_episode' | 'seasons_data' | 'total_episodes'> | null
): WatchProgressSummary => {
  const current = getOverallWatchedEpisodes(source);
  const total = Math.max(0, Number(source?.total_episodes || 0));
  const percentage = total > 0 ? Math.min(100, Math.round((current / total) * 100)) : 0;

  return {
    current,
    total,
    percentage,
    isCompleted: total > 0 && current >= total
  };
};

export const normalizeProgressForStatus = <
  T extends ProgressLike
>(
  source: T
): T => {
  if (!isTvMovie(source)) {
    return source;
  }

  if (source.status === 'completed') {
    const lastProgress = getLastAvailableProgress(source);
    return {
      ...source,
      current_season: lastProgress.season,
      current_episode: lastProgress.episode
    };
  }

  const normalized = getNormalizedProgress(source);
  return {
    ...source,
    current_season: normalized.season,
    current_episode: clampEpisodeForSeason(source, normalized.season, normalized.episode)
  };
};
