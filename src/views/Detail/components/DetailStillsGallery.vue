<template>
  <section v-if="visible" class="stills-card card detail-card animate-fade-in-up">
    <div class="detail-section-head">
      <h2 class="detail-section-title">剧照</h2>
      <span class="detail-section-meta">{{ subtitle }}</span>
    </div>

    <div v-if="loading" class="stills-row">
      <Skeleton v-for="i in 6" :key="`sk-${i}`" variant="block" width="200px" height="112px" />
    </div>

    <div v-else-if="shown.length > 0" class="stills-row scrollbar-apple">
      <button
        v-for="(img, idx) in shown"
        :key="img.file_path"
        type="button"
        class="still-thumb"
        :title="`查看大图 (${idx + 1}/${shown.length})`"
        @click="openAt(idx)"
      >
        <img :src="thumbUrl(img.file_path)" :alt="`剧照 ${idx + 1}`" loading="lazy" />
      </button>
    </div>

    <!-- 灯箱 -->
    <Teleport v-if="lightboxOpen" to="body">
      <div class="lightbox-overlay" @click.self="close" @contextmenu.prevent>
        <button type="button" class="lightbox-close" aria-label="关闭" @click="close">
          <XIcon class="w-4 h-4" />
        </button>
        <button
          v-if="shown.length > 1"
          type="button"
          class="lightbox-nav lightbox-prev"
          aria-label="上一张"
          @click="prev"
        >
          <ChevronLeftIcon class="w-5 h-5" />
        </button>
        <button
          v-if="shown.length > 1"
          type="button"
          class="lightbox-nav lightbox-next"
          aria-label="下一张"
          @click="next"
        >
          <ChevronRightIcon class="w-5 h-5" />
        </button>

        <div class="lightbox-stage">
          <img
            :src="originalUrl(shown[index]?.file_path || '')"
            :alt="`剧照 ${index + 1}`"
            class="lightbox-img"
          />
          <div class="lightbox-meta">
            {{ index + 1 }} / {{ shown.length }}
          </div>
        </div>
      </div>
    </Teleport>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { ChevronLeft as ChevronLeftIcon, ChevronRight as ChevronRightIcon, X as XIcon } from 'lucide-vue-next';
import { tmdbAPI } from '../../../utils/api';
import { APP_CONFIG } from '../../../../config/app.config';
import type { TMDbImage, TMDbImagesResponse } from '../../../types';
import Skeleton from '../../../components/common/Skeleton.vue';

interface Props {
  tmdbId?: number | null;
  mediaType: 'movie' | 'tv';
  /** 最多展示的剧照数量，默认 12 */
  max?: number;
}

const props = withDefaults(defineProps<Props>(), {
  max: 12,
});

const loading = ref(false);
const stills = ref<TMDbImage[]>([]);
const lightboxOpen = ref(false);
const index = ref(0);

const sortByQuality = (list: TMDbImage[]) =>
  [...list].sort((a, b) => {
    if (b.vote_average !== a.vote_average) return b.vote_average - a.vote_average;
    return b.vote_count - a.vote_count;
  });

const shown = computed<TMDbImage[]>(() => sortByQuality(stills.value).slice(0, props.max));

const visible = computed(
  () => !!props.tmdbId && (loading.value || shown.value.length > 0)
);

const subtitle = computed(() => {
  if (loading.value) return '加载中…';
  const total = shown.value.length;
  if (total === 0) return '';
  if (total === 1) return '1 张';
  return `共 ${total} 张`;
});

const thumbUrl = (path: string) => `${APP_CONFIG.tmdb.imageBaseUrl}/w500${path}`;
const originalUrl = (path: string) => (path ? `${APP_CONFIG.tmdb.imageBaseUrl}/original${path}` : '');

const load = async () => {
  if (!props.tmdbId) return;
  loading.value = true;
  stills.value = [];
  try {
    const response = await tmdbAPI.getImages(props.tmdbId, props.mediaType);
    if (response.success && response.data) {
      const data = response.data as TMDbImagesResponse;
      // backdrops 是最适合做剧照的（高质量横向素材）
      stills.value = data.backdrops || [];
    }
  } catch (e) {
    console.warn('加载剧照失败:', e);
  } finally {
    loading.value = false;
  }
};

const openAt = (i: number) => {
  index.value = i;
  lightboxOpen.value = true;
};

const close = () => {
  lightboxOpen.value = false;
};

const next = () => {
  if (shown.value.length === 0) return;
  index.value = (index.value + 1) % shown.value.length;
};

const prev = () => {
  if (shown.value.length === 0) return;
  index.value = (index.value - 1 + shown.value.length) % shown.value.length;
};

const onKey = (event: KeyboardEvent) => {
  if (!lightboxOpen.value) return;
  if (event.key === 'Escape') {
    event.preventDefault();
    close();
    return;
  }
  if (event.key === 'ArrowRight') {
    event.preventDefault();
    next();
    return;
  }
  if (event.key === 'ArrowLeft') {
    event.preventDefault();
    prev();
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
  window.addEventListener('keydown', onKey);
}

onBeforeUnmount(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('keydown', onKey);
  }
});
</script>

<style scoped>
.stills-card {
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

.stills-row {
  display: flex;
  gap: 10px;
  overflow-x: auto;
  padding-bottom: 6px;
  scroll-snap-type: x proximity;
}

.still-thumb {
  flex-shrink: 0;
  border: 0;
  padding: 0;
  border-radius: 10px;
  overflow: hidden;
  background: #f3f4f6;
  cursor: pointer;
  scroll-snap-align: start;
  transition: transform 200ms ease, box-shadow 200ms ease;
}

.still-thumb img {
  display: block;
  width: 200px;
  height: 112px;
  object-fit: cover;
  transition: transform 280ms ease;
}

.still-thumb:hover {
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.2);
  transform: translateY(-2px);
}

.still-thumb:hover img {
  transform: scale(1.04);
}

/* —— 灯箱 —— */
.lightbox-overlay {
  position: fixed;
  inset: 0;
  z-index: 90;
  background: rgba(0, 0, 0, 0.92);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px;
}

.lightbox-stage {
  position: relative;
  max-width: 100%;
  max-height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.lightbox-img {
  max-width: min(96vw, 1500px);
  max-height: calc(100vh - 80px);
  object-fit: contain;
  border-radius: 8px;
  box-shadow: 0 30px 80px rgba(0, 0, 0, 0.5);
}

.lightbox-meta {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
  font-variant-numeric: tabular-nums;
}

.lightbox-close,
.lightbox-nav {
  position: fixed;
  z-index: 91;
  width: 40px;
  height: 40px;
  border: none;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.14);
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(6px);
  transition: background 150ms ease, transform 150ms ease;
}

.lightbox-close:hover,
.lightbox-nav:hover {
  background: rgba(255, 255, 255, 0.26);
}

.lightbox-close {
  top: 18px;
  right: 18px;
}

.lightbox-prev {
  left: 18px;
  top: 50%;
  transform: translateY(-50%);
}

.lightbox-next {
  right: 18px;
  top: 50%;
  transform: translateY(-50%);
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
