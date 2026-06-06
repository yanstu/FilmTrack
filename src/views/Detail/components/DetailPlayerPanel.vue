<template>
  <section class="player-panel card animate-fade-in-up" style="animation-delay: 0.08s;">
    <div class="player-panel-head">
      <div class="player-panel-copy">
        <h2 class="player-panel-title">在线播放</h2>
        <p class="player-panel-subtitle">{{ subtitleText }}</p>
      </div>
    </div>

    <div class="player-stage-card">
      <PlyrPlayer
        :key="playerInstanceKey"
        :source-url="playerState.selectedStreamUrl"
        :title="playerTitle"
        :resume-seconds="resumeSeconds"
        :content-type="playerState.selectedStreamContentType"
        :request-headers="playerState.selectedStreamHeaders"
        @progress="playerActions.saveProgress"
        @open-external="playerActions.openExternal"
        @playback-failed="playerActions.handlePlaybackFailure"
      />

      <!-- 自动回退过渡态：仅提示，不打扰 -->
      <div v-if="playerState.isAutoRecovering" class="player-recovering">
        <span class="player-inline-spinner"></span>
        <span>{{ playerState.errorMessage || '正在自动切换可用线路 / 片源…' }}</span>
      </div>

      <!-- 终态错误：就地重试 + 去设置换源，形成闭环 -->
      <div v-else-if="playerState.errorMessage" class="player-error">
        <span class="player-error-text">{{ playerState.errorMessage }}</span>
        <div class="player-error-actions">
          <button
            type="button"
            class="player-error-btn player-error-btn-retry"
            :disabled="isSwitchingBusy || playerState.isResolvingStream"
            @click="playerActions.retryPlayback"
          >
            重试
          </button>
          <button type="button" class="player-error-btn" @click="openPlaybackSettings">
            去设置换源
          </button>
        </div>
      </div>
    </div>

    <div class="player-controls-stack">
      <div v-if="sourceOptions.length || lineOptions.length" class="player-source-grid">
        <div class="player-source-field">
          <span class="player-source-label">片源</span>
          <HeadlessSelect
            :model-value="selectedSourceValue"
            :options="sourceOptions"
            :disabled="sourceSelectDisabled"
            placeholder="选择片源"
            @update:model-value="handleSelectSource"
          />
        </div>
        <div class="player-source-field">
          <span class="player-source-label">线路</span>
          <HeadlessSelect
            :model-value="selectedLineValue"
            :options="lineOptions"
            :disabled="lineSelectDisabled"
            placeholder="选择线路"
            @update:model-value="handleSelectLine"
          />
        </div>
      </div>

      <div class="player-control-card player-episodes-card">
        <div class="player-control-head">
          <div class="player-control-label">
            剧集
            <span v-if="episodeOptions.length" class="player-control-count">{{ episodeOptions.length }} 集</span>
          </div>
          <span class="player-control-hint">{{ episodeHint }}</span>
        </div>

        <div v-if="showEpisodeLoading" class="player-inline-loading">
          <span class="player-inline-spinner"></span>
          <span>{{ episodeLoadingText }}</span>
        </div>

        <div v-else-if="!episodeOptions.length" class="player-empty-state">
          {{ episodeEmptyText }}
        </div>

        <div v-else class="episode-grid">
          <button
            v-for="item in episodeOptions"
            :key="item.value"
            :ref="item.value === playerState.selectedEpisodeUrl ? setActiveEpisodeRef : undefined"
            type="button"
            :class="[
              'episode-chip',
              {
                'episode-chip-active': item.value === playerState.selectedEpisodeUrl,
                'episode-chip-pending': item.value === playerState.selectedEpisodeUrl && playerState.isResolvingStream
              }
            ]"
            :disabled="isSwitchingBusy"
            @click="playerActions.selectEpisode(item.value, item.label, 'manual')"
          >
            <span>{{ item.label }}</span>
            <span
              v-if="item.value === playerState.selectedEpisodeUrl && playerState.isResolvingStream"
              class="chip-spinner"
            ></span>
          </button>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import type { DetailPlayerPanelProps } from '../types';
import PlyrPlayer from './PlyrPlayer.vue';
import HeadlessSelect from '../../../components/ui/HeadlessSelect.vue';
import { decodePlaybackCandidateValue, encodePlaybackCandidateValue } from '../playbackCandidate';

type Props = DetailPlayerPanelProps;

const props = defineProps<Props>();
const activeEpisodeRef = ref<HTMLElement | null>(null);

// 片源（候选片单匹配结果）选择 —— 按影片切换片源属于详情页职责
const sourceOptions = computed(() =>
  (props.playerState.sourceSummary?.candidates ?? []).map((item) => ({
    value: encodePlaybackCandidateValue(item.sourceKey, item.vodId),
    label: `${item.sourceName} · ${item.qualityLabel}`
  }))
);

const selectedSourceValue = computed(() => {
  const detail = props.playerState.videoDetail;
  const key = props.playerState.selectedSourceKey;
  return key && detail?.vodId ? encodePlaybackCandidateValue(key, detail.vodId) : '';
});

// 线路（当前片源下的播放分组）选择
const lineOptions = computed(() =>
  (props.playerState.videoDetail?.sources ?? []).map((item) => ({
    value: item.name,
    label: item.name
  }))
);

const selectedLineValue = computed(() => props.playerState.selectedGroupName ?? '');

const sourceSelectDisabled = computed(
  () => isSwitchingBusy.value || props.playerState.isResolvingStream || sourceOptions.value.length === 0
);

const lineSelectDisabled = computed(
  () => isSwitchingBusy.value || props.playerState.isResolvingStream || lineOptions.value.length <= 1
);

function handleSelectSource(value: string | number) {
  const { sourceKey, vodId } = decodePlaybackCandidateValue(String(value));
  if (sourceKey && vodId) {
    void props.playerActions.selectCandidate(sourceKey, vodId, 'manual');
  }
}

function handleSelectLine(value: string | number) {
  const name = String(value);
  if (name) {
    void props.playerActions.selectGroup(name);
  }
}

const currentGroup = computed(() => {
  return props.playerState.videoDetail?.sources.find((item) => item.name === props.playerState.selectedGroupName)
    ?? props.playerState.videoDetail?.sources[0]
    ?? null;
});

const episodeOptions = computed(() => {
  return currentGroup.value?.episodes.map((item) => ({
    value: item.url,
    label: item.name
  })) ?? [];
});

const isSwitchingBusy = computed(() => {
  return props.playerState.isMatchingSources
    || props.playerState.isLoadingDetail
    || props.playerState.isSwitchingCandidate;
});

const showEpisodeLoading = computed(() => {
  return (
    props.playerState.isMatchingSources
    || props.playerState.isLoadingDetail
    || props.playerState.isSwitchingCandidate
  ) && episodeOptions.value.length === 0;
});

const episodeLoadingText = computed(() => {
  if (props.playerState.isMatchingSources) {
    return '正在为这部作品准备可播放资源...';
  }
  return '正在整理可播放剧集...';
});

const episodeEmptyText = computed(() => {
  if (props.playerState.errorMessage) {
    return '当前没有可播放剧集，可到设置里切换片源或线路。';
  }
  return '资源准备好后会在这里显示可播放剧集。';
});

const subtitleText = computed(() => {
  if (props.playerState.isMatchingSources) {
    return '正在为这部作品准备可播放资源';
  }
  if (props.playerState.isLoadingDetail || props.playerState.isSwitchingCandidate) {
    return '正在整理可播放剧集';
  }
  if (props.playerState.isResolvingStream) {
    return '正在准备当前剧集的画面';
  }
  if (props.playerState.videoDetail) {
    return props.playerState.selectedEpisodeName
      ? `正在播放 ${props.playerState.selectedEpisodeName}`
      : '资源已就绪，选择剧集即可观看';
  }
  return '资源准备好后，选择剧集即可直接观看。';
});

const playerTitle = computed(() => {
  if (!props.playerState.videoDetail) {
    return props.movie.title;
  }
  const episode = props.playerState.selectedEpisodeName ? ` · ${props.playerState.selectedEpisodeName}` : '';
  return `${props.playerState.videoDetail.vodName}${episode}`;
});

const resumeSeconds = computed(() => props.playerState.episodeProgress?.positionSeconds ?? 0);

const playerInstanceKey = computed(() => {
  return [
    props.playerState.selectedEpisodeUrl || 'episode',
    props.playerState.selectedStreamUrl || 'stream',
    props.playerState.selectedStreamContentType || 'content-type',
    // 重试令牌：即使地址相同也强制重挂播放器以重新拉流
    props.playerState.playbackReloadToken
  ].join('::');
});

const episodeHint = computed(() => {
  if (props.playerState.selectedEpisodeName) {
    return `正在看 ${props.playerState.selectedEpisodeName}`;
  }
  return '点选剧集即可开始播放';
});

function setActiveEpisodeRef(element: Element | null) {
  activeEpisodeRef.value = element as HTMLElement | null;
}

function openPlaybackSettings() {
  window.dispatchEvent(new CustomEvent('open-settings', { detail: { section: 'video' } }));
}

watch(
  () => [props.playerState.selectedEpisodeUrl, showEpisodeLoading.value, episodeOptions.value.length],
  async ([selectedEpisodeUrl, loading]) => {
    if (!selectedEpisodeUrl || loading) {
      return;
    }

    await nextTick();
    activeEpisodeRef.value?.scrollIntoView({
      block: 'nearest',
      inline: 'nearest',
      behavior: 'smooth'
    });
  },
  { immediate: true }
);
</script>

<style scoped>
.player-panel {
  padding: 1.5rem;
}

.player-panel-head {
  display: flex;
  align-items: flex-start;
  justify-content: flex-start;
  gap: 1rem;
  margin-bottom: 1rem;
}

.player-panel-copy {
  min-width: 0;
}

.player-panel-title {
  font-size: 1.18rem;
  font-weight: 700;
  color: #0f172a;
}

.player-panel-subtitle {
  margin-top: 0.42rem;
  font-size: 0.92rem;
  color: #64748b;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.player-stage-card {
  border-radius: 28px;
  background: linear-gradient(180deg, rgba(248, 250, 252, 0.98), rgba(255, 255, 255, 0.98));
  border: 1px solid rgba(226, 232, 240, 0.9);
  padding: 1rem;
}

.player-error {
  margin-top: 0.85rem;
  border-radius: 16px;
  border: 1px solid rgba(254, 205, 211, 0.9);
  background: rgba(255, 241, 242, 0.92);
  color: #be123c;
  font-size: 0.84rem;
  padding: 0.85rem 0.95rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.85rem;
  flex-wrap: wrap;
}

.player-error-text {
  min-width: 0;
  flex: 1 1 auto;
}

.player-error-btn {
  flex-shrink: 0;
  border: 0;
  border-radius: 999px;
  background: #be123c;
  color: #fff;
  font-size: 0.78rem;
  font-weight: 600;
  padding: 0.45rem 0.85rem;
  transition: background-color 180ms ease;
}

.player-error-btn:hover {
  background: #9f1239;
}

.player-error-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.player-error-actions {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
}

.player-error-btn-retry {
  background: #0f766e;
}

.player-error-btn-retry:hover {
  background: #115e59;
}

.player-recovering {
  margin-top: 0.85rem;
  border-radius: 16px;
  border: 1px solid rgba(191, 219, 254, 0.9);
  background: rgba(239, 246, 255, 0.92);
  color: #1d4ed8;
  font-size: 0.84rem;
  padding: 0.85rem 0.95rem;
  display: flex;
  align-items: center;
  gap: 0.7rem;
}

.player-controls-stack {
  margin-top: 1rem;
}

.player-source-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 0.85rem;
  margin-bottom: 1rem;
}

.player-source-field {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  min-width: 0;
}

.player-source-label {
  font-size: 0.82rem;
  font-weight: 700;
  color: #334155;
  padding-left: 0.15rem;
}

.player-control-card {
  border-radius: 24px;
  border: 1px solid rgba(226, 232, 240, 0.95);
  background: linear-gradient(180deg, rgba(248, 250, 252, 0.98), rgba(255, 255, 255, 0.98));
  padding: 1rem;
  min-width: 0;
}

.player-control-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.8rem;
  margin-bottom: 0.85rem;
}

.player-control-label {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.86rem;
  font-weight: 700;
  color: #334155;
}

.player-control-count {
  font-size: 0.72rem;
  font-weight: 600;
  color: #2563eb;
  background: rgba(219, 234, 254, 0.7);
  border-radius: 999px;
  padding: 0.1rem 0.5rem;
}

.player-control-hint {
  font-size: 0.76rem;
  line-height: 1.45;
  color: #64748b;
  text-align: right;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 55%;
}

.player-empty-state,
.player-inline-loading {
  border-radius: 18px;
  border: 1px dashed rgba(203, 213, 225, 0.95);
  background: rgba(248, 250, 252, 0.9);
  padding: 0.9rem 1rem;
  font-size: 0.84rem;
  color: #64748b;
}

.player-inline-loading {
  display: flex;
  align-items: center;
  gap: 0.7rem;
}

.player-inline-spinner {
  width: 1rem;
  height: 1rem;
  border-radius: 999px;
  border: 2px solid rgba(148, 163, 184, 0.24);
  border-top-color: #2563eb;
  animation: player-spin 0.8s linear infinite;
}

.episode-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(88px, 1fr));
  gap: 0.7rem;
  max-height: 21rem;
  overflow-y: auto;
  padding-right: 0.2rem;
  scroll-behavior: smooth;
}

.episode-chip {
  border: 1px solid rgba(203, 213, 225, 0.95);
  background: #fff;
  border-radius: 16px;
  padding: 0.78rem 0.75rem;
  font-size: 0.84rem;
  font-weight: 600;
  color: #0f172a;
  transition: border-color 180ms ease, background-color 180ms ease, box-shadow 180ms ease, opacity 180ms ease;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
}

.episode-chip:hover:not(:disabled) {
  border-color: rgba(96, 165, 250, 0.85);
  box-shadow: 0 12px 26px -24px rgba(37, 99, 235, 0.9);
}

.episode-chip:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.episode-chip-active {
  border-color: rgba(37, 99, 235, 0.85);
  background: linear-gradient(180deg, rgba(239, 246, 255, 0.96), rgba(219, 234, 254, 0.88));
}

.episode-chip-pending {
  opacity: 0.84;
}

.chip-spinner {
  width: 0.8rem;
  height: 0.8rem;
  border-radius: 999px;
  border: 2px solid rgba(37, 99, 235, 0.16);
  border-top-color: #2563eb;
  animation: player-spin 0.8s linear infinite;
  flex-shrink: 0;
}

@keyframes player-spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 640px) {
  .player-panel-head,
  .player-control-head {
    flex-direction: column;
    align-items: stretch;
  }

  .player-control-hint {
    text-align: left;
    max-width: 100%;
  }

  .episode-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
</style>
