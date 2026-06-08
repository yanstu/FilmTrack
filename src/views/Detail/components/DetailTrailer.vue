<template>
  <section v-if="visible" class="trailer-card card detail-card animate-fade-in-up">
    <div class="detail-section-head">
      <h2 class="detail-section-title">{{ sectionTitle }}</h2>
      <span class="detail-section-meta">{{ availableCountLabel }}</span>
    </div>

    <div v-if="loading" class="trailer-skeleton">
      <Skeleton variant="block" height="180px" />
    </div>

    <div v-else-if="error" class="trailer-error">
      <PlayCircleIcon class="trailer-error-ico" />
      <p>{{ error }}</p>
      <button class="trailer-retry" type="button" @click="load">重试</button>
    </div>

    <div v-else-if="selected" class="trailer-stage">
      <button
        type="button"
        class="trailer-thumb"
        :title="`播放：${selected.name}`"
        @click="openPlayer"
      >
        <img :src="thumbUrl(selected.key)" :alt="selected.name" loading="lazy" />
        <span class="trailer-overlay">
          <span class="trailer-play">
            <PlayIcon class="w-6 h-6" />
          </span>
          <span class="trailer-meta">
            <span class="trailer-type">{{ typeLabel(selected.type) }}</span>
            <span class="trailer-name">{{ selected.name }}</span>
          </span>
        </span>
      </button>

      <div v-if="alternates.length > 0" class="trailer-alts">
        <button
          v-for="video in alternates"
          :key="video.id"
          type="button"
          class="trailer-alt"
          :class="{ 'trailer-alt-active': selected && video.id === selected.id }"
          :title="video.name"
          @click="selectedId = video.id"
        >
          <img :src="thumbUrl(video.key, 'mq')" :alt="video.name" loading="lazy" />
          <span class="trailer-alt-label">{{ typeLabel(video.type) }}</span>
        </button>
      </div>
    </div>

    <!-- 播放弹窗：YouTube nocookie 嵌入 -->
    <Teleport v-if="playerOpen" to="body">
      <div class="trailer-player-overlay" @click.self="closePlayer" @contextmenu.prevent>
        <div class="trailer-player-box" role="dialog" aria-modal="true" :aria-label="selected?.name">
          <button type="button" class="trailer-player-close" aria-label="关闭" @click="closePlayer">
            <XIcon class="w-4 h-4" />
          </button>
          <div class="trailer-player-frame">
            <iframe
              v-if="selected"
              :src="`https://www.youtube-nocookie.com/embed/${selected.key}?autoplay=1&rel=0&modestbranding=1`"
              title="trailer"
              frameborder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowfullscreen
            ></iframe>
          </div>
          <div class="trailer-player-caption">
            {{ selected?.name }} · {{ typeLabel(selected?.type) }}
          </div>
        </div>
      </div>
    </Teleport>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { PlayCircle as PlayCircleIcon, Play as PlayIcon, X as XIcon } from 'lucide-vue-next';
import { tmdbAPI } from '../../../utils/api';
import type { TMDbVideo } from '../../../types';
import Skeleton from '../../../components/common/Skeleton.vue';

interface Props {
  tmdbId?: number | null;
  mediaType: 'movie' | 'tv';
}

const props = defineProps<Props>();

const loading = ref(false);
const error = ref('');
const videos = ref<TMDbVideo[]>([]);
const selectedId = ref<string | null>(null);
const playerOpen = ref(false);

const PRIORITY: Record<string, number> = {
  Trailer: 0,
  Teaser: 1,
  Featurette: 2,
  Clip: 3,
  'Behind the Scenes': 4,
  Bloopers: 5,
};

const sortVideos = (list: TMDbVideo[]) => {
  return [...list]
    .filter((v) => v.site === 'YouTube' && !!v.key)
    .sort((a, b) => {
      const pa = PRIORITY[a.type] ?? 99;
      const pb = PRIORITY[b.type] ?? 99;
      if (pa !== pb) return pa - pb;
      if ((b.official ?? false) !== (a.official ?? false)) {
        return (b.official ? 1 : 0) - (a.official ? 1 : 0);
      }
      // 同优先级里按 published_at 倒序（新更优）
      const ta = a.published_at ? new Date(a.published_at).getTime() : 0;
      const tb = b.published_at ? new Date(b.published_at).getTime() : 0;
      return tb - ta;
    });
};

const sortedVideos = computed(() => sortVideos(videos.value));
const visible = computed(
  () => !!props.tmdbId && (loading.value || sortedVideos.value.length > 0 || !!error.value)
);

const selected = computed<TMDbVideo | null>(() => {
  const list = sortedVideos.value;
  if (list.length === 0) return null;
  const found = list.find((v) => v.id === selectedId.value);
  return found ?? list[0];
});

const alternates = computed<TMDbVideo[]>(() =>
  sortedVideos.value.slice(0, 6).filter((v) => v.id !== selected.value?.id)
);

const sectionTitle = computed(() => {
  if (loading.value) return '预告片';
  if (error.value) return '预告片';
  const type = selected.value?.type;
  if (!type) return '预告片';
  if (type === 'Trailer') return '官方预告片';
  if (type === 'Teaser') return '预告片速览';
  return '相关视频';
});

const availableCountLabel = computed(() => {
  if (loading.value) return '加载中…';
  if (error.value) return '';
  const total = sortedVideos.value.length;
  if (total === 0) return '';
  if (total === 1) return '1 条';
  return `共 ${total} 条`;
});

const thumbUrl = (key: string, quality: 'hq' | 'mq' = 'hq') => {
  const path = quality === 'hq' ? 'hqdefault' : 'mqdefault';
  return `https://i.ytimg.com/vi/${key}/${path}.jpg`;
};

const typeLabel = (type?: string) => {
  if (!type) return '';
  const map: Record<string, string> = {
    Trailer: '正式预告',
    Teaser: '先导预告',
    Clip: '正片片段',
    Featurette: '特辑',
    'Behind the Scenes': '幕后花絮',
    Bloopers: 'NG 集锦',
  };
  return map[type] || type;
};

const load = async () => {
  if (!props.tmdbId) return;
  loading.value = true;
  error.value = '';
  videos.value = [];
  selectedId.value = null;
  try {
    const response = await tmdbAPI.getVideos(props.tmdbId, props.mediaType);
    if (response.success && response.data) {
      videos.value = response.data.results || [];
      const sorted = sortVideos(videos.value);
      selectedId.value = sorted[0]?.id ?? null;
    } else {
      // 没拿到不算错，安静隐藏即可
      videos.value = [];
    }
  } catch (e) {
    error.value = '预告片暂时拿不到';
    console.warn('加载预告片失败:', e);
  } finally {
    loading.value = false;
  }
};

const openPlayer = () => {
  if (!selected.value) return;
  playerOpen.value = true;
};

const closePlayer = () => {
  playerOpen.value = false;
};

const onEsc = (event: KeyboardEvent) => {
  if (playerOpen.value && event.key === 'Escape') {
    event.preventDefault();
    closePlayer();
  }
};

watch(
  () => props.tmdbId,
  (id) => {
    if (id) load();
  },
  { immediate: true }
);

if (typeof window !== 'undefined') {
  window.addEventListener('keydown', onEsc);
}

onBeforeUnmount(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('keydown', onEsc);
  }
});
</script>

<style scoped>
.trailer-card {
  padding: 1.5rem;
}

.detail-section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.8rem;
  margin-bottom: 1rem;
}

.detail-section-title {
  font-size: 1.05rem;
  font-weight: 700;
  color: #0f172a;
}

.detail-section-meta {
  font-size: 0.78rem;
  color: #94a3b8;
}

.trailer-stage {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.trailer-thumb {
  position: relative;
  display: block;
  width: 100%;
  border: 0;
  border-radius: 14px;
  overflow: hidden;
  cursor: pointer;
  background: #000;
  aspect-ratio: 16 / 9;
}

.trailer-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  transition: transform 280ms ease;
}

.trailer-thumb:hover img {
  transform: scale(1.025);
}

.trailer-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: flex-end;
  padding: 14px;
  background: linear-gradient(180deg, rgba(0, 0, 0, 0) 50%, rgba(0, 0, 0, 0.75) 100%);
  color: #fff;
  pointer-events: none;
  gap: 12px;
}

.trailer-play {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 56px;
  height: 56px;
  border-radius: 9999px;
  background: rgba(0, 0, 0, 0.55);
  border: 1px solid rgba(255, 255, 255, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 200ms ease, background 200ms ease;
}

.trailer-thumb:hover .trailer-play {
  transform: translate(-50%, -50%) scale(1.05);
  background: rgba(0, 0, 0, 0.7);
}

.trailer-meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  font-size: 12px;
}

.trailer-type {
  font-weight: 600;
  color: #fef9c3;
}

.trailer-name {
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.trailer-alts {
  display: grid;
  gap: 8px;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
}

.trailer-alt {
  position: relative;
  border: 1px solid transparent;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  padding: 0;
  background: #f3f4f6;
}

.trailer-alt img {
  display: block;
  width: 100%;
  aspect-ratio: 16 / 9;
  object-fit: cover;
  transition: transform 220ms ease;
}

.trailer-alt:hover img {
  transform: scale(1.03);
}

.trailer-alt-active {
  border-color: #2563eb;
  box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.16);
}

.trailer-alt-label {
  position: absolute;
  left: 6px;
  bottom: 6px;
  padding: 2px 6px;
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
  font-size: 10px;
  font-weight: 600;
  pointer-events: none;
}

.trailer-skeleton {
  border-radius: 14px;
  overflow: hidden;
}

.trailer-error {
  border-radius: 14px;
  background: rgba(248, 250, 252, 0.9);
  border: 1px dashed rgba(203, 213, 225, 0.95);
  padding: 18px;
  text-align: center;
  color: #64748b;
}

.trailer-error-ico {
  width: 28px;
  height: 28px;
  color: #cbd5e1;
  margin: 0 auto 6px;
}

.trailer-retry {
  margin-top: 10px;
  padding: 4px 12px;
  border: none;
  border-radius: 6px;
  background: #2563eb;
  color: #fff;
  font-size: 12px;
  cursor: pointer;
}

/* —— 播放弹窗 —— */
.trailer-player-overlay {
  position: fixed;
  inset: 0;
  z-index: 90;
  background: rgba(0, 0, 0, 0.78);
  backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.trailer-player-box {
  position: relative;
  width: min(96vw, 1100px);
  max-height: calc(100vh - 48px);
  background: #000;
  border-radius: 14px;
  overflow: hidden;
  box-shadow: 0 30px 80px rgba(0, 0, 0, 0.5);
}

.trailer-player-close {
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 2;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: none;
  background: rgba(255, 255, 255, 0.16);
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(4px);
}

.trailer-player-close:hover {
  background: rgba(255, 255, 255, 0.28);
}

.trailer-player-frame {
  aspect-ratio: 16 / 9;
}

.trailer-player-frame iframe {
  width: 100%;
  height: 100%;
  display: block;
  border: 0;
}

.trailer-player-caption {
  padding: 10px 14px;
  font-size: 12.5px;
  color: rgba(255, 255, 255, 0.85);
  background: #0f172a;
}

@keyframes fade-in-up {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

.animate-fade-in-up {
  animation: fade-in-up 0.4s ease-out forwards;
  opacity: 0;
}
</style>
