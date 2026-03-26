import { computed, ref, watch, type Ref } from 'vue';
import type { SeasonsData } from '../types';
import {
  clampEpisodeForSeason,
  getLastEpisodeInSeason,
  getNormalizedProgress,
  getSeasonEpisodeCount,
  getSeasonOptions
} from '../utils/seasonProgress';

type WatchRecordLike = {
  type?: string | null;
  watched_date?: string | null;
  current_season?: number | null;
  current_episode?: number | null;
  total_episodes?: number | null;
  total_seasons?: number | null;
  seasons_data?: SeasonsData | null;
};

interface WatchRecordFieldOptions {
  onDateValidityChange?: (isValid: boolean) => void;
  onEpisodeChange?: (episode: number) => void;
}

const getWatchedDateValidation = (watchedDate?: string | null) => {
  if (!watchedDate) {
    return {
      isValid: false,
      error: '请选择观看日期'
    };
  }

  const currentDate = new Date().toISOString().split('T')[0];
  if (watchedDate > currentDate) {
    return {
      isValid: false,
      error: '观看日期不能大于当前日期'
    };
  }

  return {
    isValid: true,
    error: ''
  };
};

export function useWatchRecordFields<T extends WatchRecordLike>(
  record: Ref<T>,
  options: WatchRecordFieldOptions = {}
) {
  const dateError = ref('');

  const updateEpisode = (episode: number) => {
    if (options.onEpisodeChange) {
      options.onEpisodeChange(episode);
      return;
    }

    record.value.current_episode = episode as T['current_episode'];
  };

  const validateWatchedDate = () => {
    const result = getWatchedDateValidation(record.value.watched_date);
    dateError.value = result.error;
    options.onDateValidityChange?.(result.isValid);
    return result.isValid;
  };

  const seasonOptions = computed(() => {
    return getSeasonOptions(record.value.seasons_data, record.value.total_seasons);
  });

  const currentSeasonMaxEpisodes = computed(() => {
    const normalized = getNormalizedProgress(record.value);
    return getSeasonEpisodeCount(record.value, normalized.season) || 999;
  });

  const setToLastEpisode = () => {
    const normalized = getNormalizedProgress(record.value);
    updateEpisode(getLastEpisodeInSeason(record.value, normalized.season));
  };

  const handleEpisodeInput = (event: Event) => {
    const target = event.target as HTMLInputElement;
    const rawValue = target.value === '' ? 0 : parseInt(target.value, 10) || 0;
    const normalized = getNormalizedProgress(record.value);
    const nextEpisode = clampEpisodeForSeason(record.value, normalized.season, rawValue);
    target.value = nextEpisode.toString();
    updateEpisode(nextEpisode);
  };

  watch(
    () => record.value.watched_date,
    () => {
      validateWatchedDate();
    },
    { immediate: true }
  );

  watch(
    () => record.value.current_season,
    (newSeason, oldSeason) => {
      if (newSeason !== oldSeason && oldSeason !== undefined) {
        updateEpisode(0);
      }
    }
  );

  return {
    dateError,
    seasonOptions,
    currentSeasonMaxEpisodes,
    validateWatchedDate,
    handleEpisodeInput,
    setToLastEpisode
  };
}
