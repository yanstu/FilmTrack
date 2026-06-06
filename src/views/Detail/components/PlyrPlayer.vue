<template>
  <div class="player-shell">
    <div class="player-topline">
      <div class="player-copy">
        <strong class="player-title">{{ title || '准备播放' }}</strong>
      </div>
      <div class="player-actions">
        <button type="button" class="player-external" @click="$emit('openExternal')">
          外部打开
        </button>
      </div>
    </div>

    <div class="player-stage">
      <div v-if="!sourceUrl" class="player-state player-empty">
        <span>选好片源后即可开始播放</span>
      </div>

      <template v-else>
        <video
          ref="videoElement"
          playsinline
          webkit-playsinline="true"
          crossorigin="anonymous"
          preload="metadata"
        ></video>

        <div v-if="isBindingSource" class="player-state player-loading">
          <span class="player-spinner"></span>
          <span>正在准备画面...</span>
        </div>

        <div v-else-if="playbackError" class="player-state player-error-state">
          <strong>当前画面未能加载</strong>
          <p>{{ playbackError }}</p>
          <div class="player-error-actions">
            <button type="button" class="player-external" @click="$emit('openExternal')">外部打开</button>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import Hls, { type ErrorData, type HlsConfig } from 'hls.js';
import Plyr from 'plyr';
import 'plyr/dist/plyr.css';
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { createStreamProxyUrl } from '../../../services/video-source';

const props = defineProps<{
  sourceUrl: string;
  title: string;
  resumeSeconds: number;
  contentType?: string;
  requestHeaders?: Record<string, string>;
}>();

const emit = defineEmits<{
  (e: 'progress', payload: { positionSeconds: number; durationSeconds: number; playbackRate: number; completed: boolean }): void;
  (e: 'openExternal'): void;
  (e: 'playbackFailed', message: string): void;
}>();

const videoElement = ref<HTMLVideoElement | null>(null);
const playbackError = ref('');
const isBindingSource = ref(false);

let player: Plyr | null = null;
let hls: Hls | null = null;
let progressTimer: number | null = null;
let lastBoundSignature = '';
let lastFailureMessage = '';
let bindRequestToken = 0;
let networkRecoveryAttempts = 0;
let mediaRecoveryAttempts = 0;

function getSourceSignature() {
  return `${props.sourceUrl}::${props.contentType ?? ''}::${JSON.stringify(props.requestHeaders ?? {})}`;
}

function resetRecoveryAttempts() {
  networkRecoveryAttempts = 0;
  mediaRecoveryAttempts = 0;
}

async function resolveProxySourceUrl(sourceUrl: string) {
  return createStreamProxyUrl(
    sourceUrl,
    props.requestHeaders ?? {},
    props.contentType ?? '',
    `${sourceUrl}:${JSON.stringify(props.requestHeaders ?? {})}:${props.contentType ?? ''}`
  );
}

function attachNativeSource(video: HTMLVideoElement, sourceUrl: string) {
  video.src = sourceUrl;
  video.addEventListener('loadedmetadata', () => {
    clearPlaybackError();
    applyResumeTime(video);
    isBindingSource.value = false;
    void video.play().catch(() => {
      // 浏览器自动播放策略可能拦截，保留用户手动点击播放的可能
    });
  }, { once: true });
}

function teardownHls() {
  if (hls) {
    hls.destroy();
    hls = null;
  }
}

function revokeObjectUrl() {
  // 兼容旧逻辑，当前不再创建 object URL
}

function resetVideoElement() {
  const video = videoElement.value;
  if (!video) {
    return;
  }
  revokeObjectUrl();
  video.pause();
  video.removeAttribute('src');
  video.load();
}

function setPlaybackError(message: string, shouldNotify = true) {
  playbackError.value = message;
  isBindingSource.value = false;
  if (shouldNotify && lastFailureMessage !== message) {
    lastFailureMessage = message;
    emit('playbackFailed', message);
  }
}

function clearPlaybackError() {
  playbackError.value = '';
  lastFailureMessage = '';
}

function emitProgress(completed = false) {
  const video = videoElement.value;
  if (!video) return;

  emit('progress', {
    positionSeconds: Number(video.currentTime || 0),
    durationSeconds: Number(video.duration || 0),
    playbackRate: Number(video.playbackRate || 1),
    completed
  });
}

function applyResumeTime(video: HTMLVideoElement) {
  if (props.resumeSeconds > 3 && Number.isFinite(props.resumeSeconds)) {
    video.currentTime = props.resumeSeconds;
  }
}

function handleVideoError() {
  const mediaError = videoElement.value?.error;
  if (!mediaError) {
    setPlaybackError('播放链路已中断，请重试或切换外部播放。');
    return;
  }

  const codeMap: Record<number, string> = {
    1: '播放已被中断。',
    2: '网络连接中断，暂时无法加载当前画面。',
    3: '视频数据解析失败。',
    4: '当前线路暂不支持内嵌播放。'
  };
  setPlaybackError(codeMap[mediaError.code] || '当前线路暂时无法播放。');
}

function bindHlsSource(video: HTMLVideoElement, sourceUrl: string) {
  const hlsConfig: Partial<HlsConfig> = {
    enableWorker: false,
    lowLatencyMode: false,
    backBufferLength: 90
  };

  resetRecoveryAttempts();
  hls = new Hls(hlsConfig);
  hls.attachMedia(video);
  hls.on(Hls.Events.MEDIA_ATTACHED, () => {
    hls?.loadSource(sourceUrl);
  });
  hls.on(Hls.Events.MANIFEST_PARSED, () => {
    clearPlaybackError();
    applyResumeTime(video);
    isBindingSource.value = false;
    void video.play().catch(() => {
      // 用户手动点击播放时继续沿用现有进度
    });
  });
  hls.on(Hls.Events.ERROR, (_event, data: ErrorData) => {
    console.error('HLS 播放错误:', data);

    if (!data.fatal) {
      return;
    }

    if (data.type === Hls.ErrorTypes.NETWORK_ERROR && hls && networkRecoveryAttempts < 2) {
      networkRecoveryAttempts += 1;
      hls.startLoad();
      return;
    }

    if (data.type === Hls.ErrorTypes.MEDIA_ERROR && hls && mediaRecoveryAttempts < 1) {
      mediaRecoveryAttempts += 1;
      hls.recoverMediaError();
      return;
    }

    if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
      setPlaybackError('片源连接中断，请稍后重试。');
    } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
      setPlaybackError('当前画面暂时无法解码，正在尝试其他片源。');
    } else {
      setPlaybackError('当前线路暂时无法内嵌播放。');
    }
    teardownHls();
  });
}

function canUseNativeHls(video: HTMLVideoElement, sourceUrl: string) {
  return /\.m3u8($|\?)/i.test(sourceUrl) && video.canPlayType('application/vnd.apple.mpegurl') !== '';
}

function isHlsLikeSource(sourceUrl: string, contentType?: string) {
  return /\.m3u8($|\?)/i.test(sourceUrl) || (contentType ?? '').includes('application/vnd.apple.mpegurl');
}

async function bindSource(force = false) {
  const video = videoElement.value;
  if (!video) return;

  const nextSignature = getSourceSignature();
  if (!props.sourceUrl) {
    clearPlaybackError();
    isBindingSource.value = false;
    lastBoundSignature = '';
    teardownHls();
    resetVideoElement();
    return;
  }

  if (!force && lastBoundSignature === nextSignature) {
    return;
  }

  lastBoundSignature = nextSignature;
  const currentToken = ++bindRequestToken;
  clearPlaybackError();
  isBindingSource.value = true;
  teardownHls();
  resetVideoElement();

  try {
    const proxyUrl = await resolveProxySourceUrl(props.sourceUrl);
    if (currentToken !== bindRequestToken) {
      return;
    }

    if (isHlsLikeSource(props.sourceUrl, props.contentType)) {
      if (Hls.isSupported()) {
        bindHlsSource(video, proxyUrl);
        return;
      }

      if (canUseNativeHls(video, proxyUrl)) {
        attachNativeSource(video, proxyUrl);
        return;
      }

      setPlaybackError('当前设备暂不支持该线路的内嵌播放。');
      return;
    }

    attachNativeSource(video, proxyUrl);
  } catch (error) {
    if (currentToken !== bindRequestToken) {
      return;
    }
    setPlaybackError(error instanceof Error ? error.message : '当前线路暂时无法加载。');
  }
}

onMounted(() => {
  const video = videoElement.value;
  if (!video) return;

  player = new Plyr(video, {
    controls: [
      'play-large',
      'rewind',
      'play',
      'fast-forward',
      'progress',
      'current-time',
      'duration',
      'mute',
      'volume',
      'settings',
      'pip',
      'airplay',
      'fullscreen'
    ],
    settings: ['speed'],
    speed: {
      selected: 1,
      options: [0.75, 1, 1.25, 1.5, 2]
    }
  });

  video.addEventListener('loadeddata', () => {
    clearPlaybackError();
    isBindingSource.value = false;
  });
  video.addEventListener('canplay', () => {
    clearPlaybackError();
    isBindingSource.value = false;
  });
  video.addEventListener('error', handleVideoError);

  void bindSource(true);

  progressTimer = window.setInterval(() => emitProgress(false), 8000);
  video.addEventListener('pause', () => emitProgress(false));
  video.addEventListener('ended', () => emitProgress(true));
  video.addEventListener('ratechange', () => emitProgress(false));
});

watch(
  () => [props.sourceUrl, props.contentType, JSON.stringify(props.requestHeaders ?? {})],
  () => {
    if (props.sourceUrl) {
      void bindSource(true);
    }
  }
);

watch(
  () => props.resumeSeconds,
  (value) => {
    const video = videoElement.value;
    if (!video || value <= 0) {
      return;
    }
    if (Math.abs(video.currentTime - value) > 3) {
      video.currentTime = value;
    }
  }
);

onBeforeUnmount(() => {
  bindRequestToken += 1;
  if (progressTimer !== null) {
    window.clearInterval(progressTimer);
  }
  teardownHls();
  revokeObjectUrl();
  player?.destroy();
});
</script>

<style scoped>
.player-shell {
  border-radius: 28px;
  overflow: hidden;
  background:
    radial-gradient(circle at top left, rgba(56, 189, 248, 0.16), transparent 42%),
    linear-gradient(180deg, rgba(2, 6, 23, 0.97), rgba(3, 7, 18, 0.995));
  border: 1px solid rgba(148, 163, 184, 0.18);
}

.player-topline {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 18px 20px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.14);
}

.player-copy {
  min-width: 0;
}

.player-title {
  display: block;
  font-size: 1rem;
  font-weight: 600;
  color: #f8fafc;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.player-actions {
  display: inline-flex;
  align-items: center;
  gap: 0.65rem;
}

.player-external {
  border: 0;
  border-radius: 999px;
  padding: 0.58rem 0.92rem;
  font-size: 0.84rem;
  font-weight: 600;
  transition: background-color 180ms ease, color 180ms ease;
}

.player-external {
  background: rgba(14, 165, 233, 0.16);
  color: #7dd3fc;
}

.player-external:hover {
  background: rgba(14, 165, 233, 0.24);
  color: #e0f2fe;
}

.player-stage {
  position: relative;
  min-height: 320px;
  background: #000;
}

.player-state {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 0.8rem;
  padding: 1.2rem;
  text-align: center;
}

.player-empty {
  color: rgba(226, 232, 240, 0.78);
  font-size: 0.95rem;
}

.player-loading {
  color: rgba(226, 232, 240, 0.92);
  background: linear-gradient(180deg, rgba(2, 6, 23, 0.32), rgba(2, 6, 23, 0.68));
  font-size: 0.94rem;
}

.player-spinner {
  width: 2rem;
  height: 2rem;
  border-radius: 999px;
  border: 2px solid rgba(148, 163, 184, 0.24);
  border-top-color: #38bdf8;
  animation: spin 0.9s linear infinite;
}

.player-error-state {
  background: linear-gradient(180deg, rgba(15, 23, 42, 0.45), rgba(15, 23, 42, 0.9));
  color: #f8fafc;
}

.player-error-state strong {
  font-size: 1.05rem;
}

.player-error-state p {
  max-width: 30rem;
  margin: 0;
  font-size: 0.9rem;
  line-height: 1.6;
  color: rgba(226, 232, 240, 0.78);
}

.player-error-actions {
  display: inline-flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.7rem;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

:deep(video) {
  width: 100%;
  aspect-ratio: 16 / 9;
  background: #000;
}

:deep(.plyr) {
  --plyr-color-main: #38bdf8;
  --plyr-video-control-background-hover: rgba(56, 189, 248, 0.18);
  --plyr-range-fill-background: linear-gradient(135deg, #38bdf8, #22c55e);
  --plyr-font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  border-radius: 0;
  width: 100%;
}
</style>
