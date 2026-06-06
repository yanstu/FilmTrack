import { computed, reactive, watch, type Ref } from 'vue';
import { openUrl } from '@tauri-apps/plugin-opener';
import type { Movie, PlaybackProgressPayload } from '../../../types';
import type { DetailState, PlayerPanelActions, PlayerPanelState } from '../types';
import {
  createStreamProxyUrl,
  getLatestPlaybackProgress,
  getPlaybackProgressByEpisode,
  getSourceProfiles,
  loadVideoDetail,
  matchMovieSources,
  refreshSourceProfiles,
  resolveVideoStream,
  saveMovieSourcePreference,
  savePlaybackProgress
} from '../../../services/video-source';
import { useAppStore } from '../../../stores/app';
import { candidateKey, groupKey, planPlaybackFallback } from '../playbackFallback';

/** 自动回退到下一个片源/线路前展示的过渡文案 */
const RECOVER_LINE_HINT = '当前线路暂时不可用，正在自动切换线路…';
const RECOVER_SOURCE_HINT = '当前片源暂时不可用，正在自动切换片源…';
/** 自动回退穷尽后展示的终态文案 */
const TERMINAL_NO_SOURCE = '暂时没有可用片源，请稍后重试，或在设置里切换片单 / 片源 / 线路。';
const TERMINAL_EPISODE = '当前剧集暂时无法播放，请重试，或在设置里切换片源 / 线路。';

export function useDetailPlayer(detailState: Ref<DetailState>) {
  const appStore = useAppStore();
  // 记录本轮已尝试过的候选片源 / 线路，避免自动回退陷入死循环、重复尝试。
  const triedCandidates = new Set<string>();
  const triedGroups = new Set<string>();

  const playerState = reactive<PlayerPanelState>({
    isLoadingProfiles: false,
    isMatchingSources: false,
    isLoadingDetail: false,
    isResolvingStream: false,
    isSwitchingCandidate: false,
    profiles: [],
    sourceSummary: null,
    videoDetail: null,
    selectedSourceKey: null,
    selectedGroupName: null,
    selectedEpisodeUrl: null,
    selectedStreamUrl: '',
    selectedStreamContentType: '',
    selectedStreamHeaders: {},
    selectedEpisodeName: '',
    latestProgress: null,
    episodeProgress: null,
    errorMessage: '',
    isAutoRecovering: false,
    playbackReloadToken: 0
  });

  const currentMovie = computed(() => detailState.value.movie);

  function resetFallbackTracking() {
    triedCandidates.clear();
    triedGroups.clear();
  }

  function clearPlaybackSelection() {
    playerState.selectedEpisodeUrl = null;
    playerState.selectedStreamUrl = '';
    playerState.selectedStreamContentType = '';
    playerState.selectedStreamHeaders = {};
  }

  function hasStoredManualSelection(movie = currentMovie.value) {
    return Boolean(
      movie?.play_selection_mode === 'manual'
      && movie.play_source_key
      && movie.play_vod_id
    );
  }

  async function reloadProfiles(force = false) {
    playerState.isLoadingProfiles = true;
    playerState.errorMessage = '';
    try {
      const response = force ? await refreshSourceProfiles() : await getSourceProfiles();
      playerState.profiles = response.items;
    } catch (error) {
      playerState.errorMessage = error instanceof Error ? error.message : '片单加载失败';
    } finally {
      playerState.isLoadingProfiles = false;
    }
  }

  async function hydrateLatestProgress(movieId: string) {
    const response = await getLatestPlaybackProgress(movieId);
    playerState.latestProgress = response.success ? response.data ?? null : null;
  }

  async function hydrateEpisodeProgress(movieId: string, sourceKey: string, episodeUrl: string) {
    const response = await getPlaybackProgressByEpisode(movieId, sourceKey, episodeUrl);
    playerState.episodeProgress = response.success ? response.data ?? null : null;
  }

  function getCurrentGroup() {
    return playerState.videoDetail?.sources.find((group) => group.name === playerState.selectedGroupName)
      ?? playerState.videoDetail?.sources[0]
      ?? null;
  }

  function resolvePreferredGroupName() {
    const availableGroups = playerState.videoDetail?.sources ?? [];
    if (availableGroups.length === 0) {
      return null;
    }

    const preferManualSource = appStore.settings.videoSource.preferManualSource;
    const moviePreferred = currentMovie.value?.play_group_name;

    if (preferManualSource && hasStoredManualSelection() && moviePreferred) {
      const matched = availableGroups.find((group) => group.name === moviePreferred);
      if (matched) {
        return matched.name;
      }
    }

    const preferredLineName = appStore.settings.videoSource.preferredLineName;
    if (preferredLineName && preferredLineName !== 'auto') {
      const matched = availableGroups.find((group) => group.name === preferredLineName);
      if (matched) {
        return matched.name;
      }
    }

    if (moviePreferred) {
      const matched = availableGroups.find((group) => group.name === moviePreferred);
      if (matched) {
        return matched.name;
      }
    }

    return availableGroups[0]?.name ?? null;
  }

  /**
   * 解析并绑定指定剧集（限定当前线路）。成功（拿到可播放地址）返回 true。
   * 不在内部做回退，回退由 autoRecoverPlayback 统一驱动。
   */
  async function applyEpisode(
    episodeUrl: string,
    episodeName?: string,
    selectionMode: 'auto' | 'manual' = 'auto'
  ): Promise<boolean> {
    const movie = currentMovie.value;
    const detail = playerState.videoDetail;
    if (!movie || !detail) {
      return false;
    }

    const group = getCurrentGroup();
    const episode = group?.episodes.find((item) => item.url === episodeUrl)
      ?? group?.episodes[0]
      ?? null;
    if (!episode) {
      clearPlaybackSelection();
      return false;
    }

    playerState.selectedEpisodeUrl = episode.url;
    playerState.selectedEpisodeName = episodeName || episode.name;
    playerState.isResolvingStream = true;

    try {
      const resolved = await resolveVideoStream(episode.url);
      playerState.selectedStreamUrl = resolved.url;
      playerState.selectedStreamContentType = resolved.contentType;
      playerState.selectedStreamHeaders = resolved.requestHeaders ?? {};

      await hydrateEpisodeProgress(movie.id, detail.sourceKey, episode.url);

      const updatedMovie: Movie = {
        ...movie,
        play_profile_id: detail.profileId,
        play_profile_name: detail.profileName,
        play_source_key: detail.sourceKey,
        play_source_name: detail.sourceName,
        play_vod_id: detail.vodId,
        play_vod_name: detail.vodName,
        play_group_name: group?.name || '',
        play_episode_name: playerState.selectedEpisodeName,
        play_episode_url: episode.url,
        play_quality_label: detail.qualityLabel,
        play_selection_mode: selectionMode,
        play_match_score: detail.score,
        play_playback_rate: playerState.episodeProgress?.playbackRate ?? movie.play_playback_rate ?? 1,
        play_last_played_at: new Date().toISOString()
      };

      const response = await saveMovieSourcePreference(updatedMovie);
      if (response.success && response.data) {
        detailState.value.movie = response.data;
      }
      return true;
    } catch (error) {
      clearPlaybackSelection();
      return false;
    } finally {
      playerState.isResolvingStream = false;
    }
  }

  /** 切到指定线路并解析其首选剧集。成功返回 true。 */
  async function applyGroup(groupName: string, selectionMode: 'auto' | 'manual' = 'auto'): Promise<boolean> {
    playerState.selectedGroupName = groupName;
    const group = getCurrentGroup();
    if (!group?.episodes.length) {
      clearPlaybackSelection();
      return false;
    }

    const preferredEpisodeName = playerState.selectedEpisodeName || currentMovie.value?.play_episode_name;
    const preferredEpisode = group.episodes.find((item) => item.url === currentMovie.value?.play_episode_url)
      ?? group.episodes.find((item) => item.name === preferredEpisodeName)
      ?? group.episodes[0];

    return applyEpisode(preferredEpisode.url, preferredEpisode.name, selectionMode);
  }

  /** 载入候选片源详情并解析首选线路 / 剧集。成功返回 true。 */
  async function applyCandidate(
    sourceKey: string,
    vodId: string,
    selectionMode: 'auto' | 'manual' = 'auto'
  ): Promise<boolean> {
    playerState.isLoadingDetail = true;
    playerState.isSwitchingCandidate = true;
    playerState.selectedSourceKey = sourceKey;

    try {
      const detail = await loadVideoDetail(sourceKey, vodId);
      playerState.videoDetail = detail;

      const preferredGroup = resolvePreferredGroupName() ?? detail.sources[0]?.name ?? '';
      if (!preferredGroup) {
        clearPlaybackSelection();
        return false;
      }
      return await applyGroup(preferredGroup, selectionMode);
    } catch (error) {
      playerState.videoDetail = null;
      playerState.selectedGroupName = null;
      clearPlaybackSelection();
      return false;
    } finally {
      playerState.isLoadingDetail = false;
      playerState.isSwitchingCandidate = false;
    }
  }

  /**
   * 自动回退：当前线路失败 → 依次尝试同片源未试过的线路 → 其它候选片源；
   * 全部穷尽后给出终态错误，引导去设置换源，形成闭环。
   */
  async function autoRecoverPlayback(terminalMessage: string): Promise<void> {
    const summary = playerState.sourceSummary;
    if (!summary || summary.candidates.length === 0) {
      playerState.isAutoRecovering = false;
      playerState.errorMessage = terminalMessage;
      return;
    }

    playerState.isAutoRecovering = true;

    const detail = playerState.videoDetail;
    if (detail) {
      // 标记当前失败的线路；若当前片源线路已全部用尽，标记该片源已试过
      if (playerState.selectedGroupName) {
        triedGroups.add(groupKey(detail.sourceKey, detail.vodId, playerState.selectedGroupName));
      }
      const hasUntriedGroup = detail.sources.some(
        (group) => !triedGroups.has(groupKey(detail.sourceKey, detail.vodId, group.name))
      );
      if (!hasUntriedGroup) {
        triedCandidates.add(candidateKey(detail.sourceKey, detail.vodId));
      }
    }

    const plan = planPlaybackFallback({
      detail,
      candidates: summary.candidates,
      triedGroups,
      triedCandidates
    });

    if (plan.type === 'group' && detail) {
      triedGroups.add(groupKey(detail.sourceKey, detail.vodId, plan.groupName));
      playerState.errorMessage = RECOVER_LINE_HINT;
      const ok = await applyGroup(plan.groupName);
      if (ok) {
        playerState.isAutoRecovering = false;
        playerState.errorMessage = '';
        return;
      }
      return autoRecoverPlayback(terminalMessage);
    }

    if (plan.type === 'candidate') {
      triedCandidates.add(candidateKey(plan.sourceKey, plan.vodId));
      playerState.errorMessage = RECOVER_SOURCE_HINT;
      const ok = await applyCandidate(plan.sourceKey, plan.vodId);
      if (ok) {
        playerState.isAutoRecovering = false;
        playerState.errorMessage = '';
        return;
      }
      return autoRecoverPlayback(terminalMessage);
    }

    // 全部穷尽，进入终态错误，引导去设置换源
    playerState.isAutoRecovering = false;
    playerState.errorMessage = terminalMessage;
  }

  async function selectEpisode(
    episodeUrl: string,
    episodeName?: string,
    selectionMode: 'auto' | 'manual' = 'manual'
  ) {
    playerState.errorMessage = '';
    if (selectionMode === 'manual') {
      resetFallbackTracking();
      playerState.isAutoRecovering = false;
    }

    const ok = await applyEpisode(episodeUrl, episodeName, selectionMode);
    if (!ok) {
      if (selectionMode === 'auto') {
        await autoRecoverPlayback(TERMINAL_EPISODE);
      } else {
        playerState.errorMessage = TERMINAL_EPISODE;
      }
    }
  }

  async function selectGroup(groupName: string, selectionMode: 'auto' | 'manual' = 'manual') {
    playerState.errorMessage = '';
    if (selectionMode === 'manual') {
      resetFallbackTracking();
      playerState.isAutoRecovering = false;
    }

    const ok = await applyGroup(groupName, selectionMode);
    if (!ok) {
      if (selectionMode === 'auto') {
        await autoRecoverPlayback(TERMINAL_EPISODE);
      } else {
        playerState.errorMessage = '当前线路暂时无法播放，请重试，或在设置里切换线路。';
      }
    }
  }

  async function selectCandidate(
    sourceKey: string,
    vodId: string,
    selectionMode: 'auto' | 'manual' = 'manual'
  ) {
    playerState.errorMessage = '';
    if (selectionMode === 'manual') {
      resetFallbackTracking();
      playerState.isAutoRecovering = false;
    }
    triedCandidates.add(candidateKey(sourceKey, vodId));

    const ok = await applyCandidate(sourceKey, vodId, selectionMode);
    if (!ok) {
      if (selectionMode === 'auto') {
        await autoRecoverPlayback(TERMINAL_NO_SOURCE);
      } else {
        playerState.errorMessage = '当前片源暂时无法播放，请重试，或在设置里切换片源。';
      }
    }
  }

  async function selectGroupManually(groupName: string) {
    await selectGroup(groupName, 'manual');
  }

  /** 就地重试：重新拉流并强制播放器重挂；无可重试目标时回退为重新匹配。 */
  async function retryPlayback() {
    playerState.errorMessage = '';
    playerState.isAutoRecovering = false;
    resetFallbackTracking();

    if (playerState.videoDetail && playerState.selectedGroupName && playerState.selectedEpisodeUrl) {
      const retryMode = currentMovie.value?.play_selection_mode === 'manual' ? 'manual' : 'auto';
      const ok = await applyEpisode(playerState.selectedEpisodeUrl, playerState.selectedEpisodeName, retryMode);
      // 即使解析出的地址相同，也递增令牌强制播放器重挂以重新拉流
      playerState.playbackReloadToken += 1;
      if (!ok) {
        await autoRecoverPlayback(TERMINAL_EPISODE);
      }
      return;
    }

    await matchSources(true);
  }

  async function matchSources(force = false) {
    const movie = currentMovie.value;
    if (!movie?.title) {
      return;
    }

    if (playerState.sourceSummary && !force) {
      return;
    }

    resetFallbackTracking();
    playerState.isMatchingSources = true;
    playerState.isAutoRecovering = false;
    playerState.errorMessage = '';

    try {
      const response = await matchMovieSources({
        movieId: movie.id,
        tmdbId: movie.tmdb_id,
        title: movie.title,
        originalTitle: movie.original_title,
        year: movie.year,
        mediaType: movie.type
      });

      playerState.sourceSummary = response;

      if (response.candidates.length === 0) {
        playerState.errorMessage = TERMINAL_NO_SOURCE;
        return;
      }

      const preferManualSource = appStore.settings.videoSource.preferManualSource;
      const shouldReuseManualSelection = preferManualSource && hasStoredManualSelection(movie);
      const storedManualCandidate = shouldReuseManualSelection
        ? response.candidates.find((item) => item.sourceKey === movie.play_source_key && item.vodId === movie.play_vod_id)
        : null;
      const autoCandidate = response.autoSelected ?? response.candidates[0] ?? null;
      const canReuseManualCandidate = Boolean(
        storedManualCandidate
        && (
          !autoCandidate
          || storedManualCandidate.score >= autoCandidate.score - 24
        )
      );
      const preferredCandidate = (
        canReuseManualCandidate
          ? storedManualCandidate
          : null
      )
        ?? autoCandidate
        ?? null;

      if (preferredCandidate) {
        const selectionMode = canReuseManualCandidate
          && preferredCandidate.sourceKey === movie.play_source_key
          && preferredCandidate.vodId === movie.play_vod_id
          ? 'manual'
          : 'auto';
        await selectCandidate(preferredCandidate.sourceKey, preferredCandidate.vodId, selectionMode);
      }
    } catch (error) {
      playerState.errorMessage = error instanceof Error ? error.message : '片源匹配失败';
    } finally {
      playerState.isMatchingSources = false;
    }
  }

  async function saveProgress(progress: {
    positionSeconds: number;
    durationSeconds: number;
    playbackRate: number;
    completed: boolean;
  }) {
    const movie = currentMovie.value;
    const detail = playerState.videoDetail;
    if (!movie || !detail || !playerState.selectedEpisodeUrl) {
      return;
    }

    const payload: PlaybackProgressPayload = {
      movieId: movie.id,
      profileId: detail.profileId,
      sourceKey: detail.sourceKey,
      vodId: detail.vodId,
      playGroupName: playerState.selectedGroupName || '',
      episodeName: playerState.selectedEpisodeName,
      episodeUrl: playerState.selectedEpisodeUrl,
      positionSeconds: progress.positionSeconds,
      durationSeconds: progress.durationSeconds,
      playbackRate: progress.playbackRate,
      completed: progress.completed
    };

    const result = await savePlaybackProgress(payload);
    if (result.success && result.data) {
      playerState.episodeProgress = result.data;
      playerState.latestProgress = result.data;

      const updatedMovie: Movie = {
        ...movie,
        play_playback_rate: progress.playbackRate,
        play_last_played_at: result.data.lastPlayedAt
      };
      const response = await saveMovieSourcePreference(updatedMovie);
      if (response.success && response.data) {
        detailState.value.movie = response.data;
      }
    }
  }

  async function openExternalPlayer() {
    if (!playerState.selectedStreamUrl) {
      appStore.modalService.showWarning('暂无可播放地址', '请先选择剧集并等待片源解析完成后再试。');
      return;
    }

    try {
      const externalUrl = await createStreamProxyUrl(
        playerState.selectedStreamUrl,
        playerState.selectedStreamHeaders ?? {},
        playerState.selectedStreamContentType ?? ''
      );
      await openUrl(externalUrl);
    } catch (error) {
      console.error('外部打开失败:', error);
      appStore.modalService.showError(
        '外部打开失败',
        '无法在外部播放器打开当前片源，请稍后再试，或在设置里切换片源 / 线路。'
      );
    }
  }

  async function handlePlaybackFailure(message: string) {
    // 解析/切换过程中产生的中间错误忽略，避免与正在进行的回退抢占
    if (
      playerState.isLoadingDetail
      || playerState.isSwitchingCandidate
      || playerState.isResolvingStream
      || playerState.isAutoRecovering
    ) {
      return;
    }

    if (!playerState.videoDetail || !playerState.sourceSummary) {
      playerState.errorMessage = message;
      return;
    }

    await autoRecoverPlayback(message || TERMINAL_EPISODE);
  }

  watch(
    () => currentMovie.value?.id,
    async (movieId) => {
      resetFallbackTracking();
      playerState.sourceSummary = null;
      playerState.videoDetail = null;
      playerState.selectedSourceKey = null;
      playerState.selectedGroupName = null;
      playerState.selectedEpisodeUrl = null;
      playerState.selectedStreamUrl = '';
      playerState.selectedStreamContentType = '';
      playerState.selectedStreamHeaders = {};
      playerState.selectedEpisodeName = '';
      playerState.latestProgress = null;
      playerState.episodeProgress = null;
      playerState.errorMessage = '';
      playerState.isAutoRecovering = false;

      if (!movieId) {
        return;
      }

      // 最近进度（仅展示用）与片源匹配互不依赖，并行以减少详情页打开等待
      await Promise.all([
        hydrateLatestProgress(movieId),
        matchSources(true)
      ]);
    },
    { immediate: true }
  );

  watch(
    () => [
      currentMovie.value?.id,
      appStore.settings.videoSource.activeProfileId,
      appStore.settings.videoSource.qualityPriority,
      appStore.settings.videoSource.preferManualSource
    ],
    async ([movieId], previousValues) => {
      const [
        previousMovieId,
        previousProfileId,
        previousQualityPriority,
        previousPreferManualSource
      ] = previousValues ?? [];

      if (!movieId || movieId !== previousMovieId) {
        return;
      }

      if (
        appStore.settings.videoSource.activeProfileId === previousProfileId
        && appStore.settings.videoSource.qualityPriority === previousQualityPriority
        && appStore.settings.videoSource.preferManualSource === previousPreferManualSource
      ) {
        return;
      }

      resetFallbackTracking();
      playerState.sourceSummary = null;
      playerState.videoDetail = null;
      playerState.selectedSourceKey = null;
      playerState.selectedGroupName = null;
      playerState.selectedEpisodeUrl = null;
      playerState.selectedStreamUrl = '';
      playerState.selectedStreamContentType = '';
      playerState.selectedStreamHeaders = {};
      playerState.selectedEpisodeName = '';
      playerState.episodeProgress = null;
      playerState.errorMessage = '';
      playerState.isAutoRecovering = false;

      await matchSources(true);
    }
  );

  const playerActions: PlayerPanelActions = {
    reloadProfiles: () => reloadProfiles(true),
    matchSources,
    selectCandidate,
    selectGroup: selectGroupManually,
    selectEpisode,
    saveProgress,
    openExternal: openExternalPlayer,
    handlePlaybackFailure,
    retryPlayback
  };

  return {
    playerState,
    playerActions
  };
}
