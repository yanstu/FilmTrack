<template>
  <section v-if="visible" class="stills-card card detail-card animate-fade-in-up">
    <div class="detail-section-head">
      <div class="head-left">
        <h2 class="detail-section-title">剧照</h2>
        <span class="detail-section-meta">{{ subtitle }}</span>
      </div>
      <div v-if="!loading && shown.length > 1" class="head-hint">
        <span class="hint-key">←</span>
        <span class="hint-key">→</span>
        <span>切换</span>
        <span class="hint-divider"></span>
        <span class="hint-key">Enter</span>
        <span>大图</span>
      </div>
    </div>

    <!-- 加载态：Hero + 缩略条骨架 -->
    <template v-if="loading">
      <Skeleton variant="block" class="hero-skel" width="100%" height="320px" />
      <div class="thumb-strip-skeleton">
        <Skeleton v-for="i in 6" :key="`tsk-${i}`" variant="block" class="thumb-skel" width="120px" height="72px" />
      </div>
    </template>

    <template v-else-if="shown.length > 0">
      <!-- Hero 番形：左右渐隐 + 角标 + 查看大图按钮 -->
      <div
        class="hero-stage"
        @mouseenter="hovering = true"
        @mouseleave="hovering = false"
        @click="prefersLightboxOnHero && openLightbox(active)"
      >
        <Transition name="hero-cross" mode="out-in">
          <img
            :key="shown[active]?.file_path"
            :src="heroUrl(shown[active]?.file_path || '')"
            :alt="`剧照 ${active + 1}`"
            class="hero-img"
            draggable="false"
          />
        </Transition>

        <!-- 上下渐隐遮罩 -->
        <div class="hero-shade hero-shade-top"></div>
        <div class="hero-shade hero-shade-bottom"></div>

        <!-- 左右切换悬浮按钮（仅 hover 时显示） -->
        <button
          v-if="shown.length > 1"
          type="button"
          class="hero-arrow hero-arrow-left"
          :class="{ visible: hovering }"
          aria-label="上一张剧照"
          @click.stop="prev"
        >
          <ChevronLeftIcon class="w-4 h-4" />
        </button>
        <button
          v-if="shown.length > 1"
          type="button"
          class="hero-arrow hero-arrow-right"
          :class="{ visible: hovering }"
          aria-label="下一张剧照"
          @click.stop="next"
        >
          <ChevronRightIcon class="w-4 h-4" />
        </button>

        <!-- 右下角：序号 + 查看大图 -->
        <div class="hero-badges">
          <span class="hero-index">{{ active + 1 }} / {{ shown.length }}</span>
          <button
            type="button"
            class="hero-zoom"
            aria-label="查看大图"
            @click.stop="openLightbox(active)"
          >
            <MaximizeIcon class="w-3.5 h-3.5" />
            <span>大图</span>
          </button>
        </div>
      </div>

      <!-- 缩略条：左右渐隐 + 当前活跃高亮 -->
      <div class="thumb-strip-wrap">
        <div class="thumb-strip scrollbar-apple" ref="stripRef">
          <button
            v-for="(img, idx) in shown"
            :key="img.file_path"
            type="button"
            class="thumb-cell"
            :class="{ 'is-active': idx === active }"
            :aria-current="idx === active ? 'true' : undefined"
            :aria-label="`第 ${idx + 1} 张剧照`"
            :ref="(el) => setThumbRef(el, idx)"
            @click="setActive(idx)"
            @dblclick="openLightbox(idx)"
          >
            <img :src="thumbUrl(img.file_path)" :alt="`剧照 ${idx + 1}`" loading="lazy" draggable="false" />
            <span class="thumb-bar" aria-hidden="true"></span>
          </button>
        </div>
        <div class="strip-fade strip-fade-left"></div>
        <div class="strip-fade strip-fade-right"></div>
      </div>
    </template>

    <!-- 灯箱 -->
    <Teleport v-if="lightboxOpen" to="body">
      <div class="lightbox-overlay" @click.self="closeLightbox" @contextmenu.prevent>
        <button type="button" class="lightbox-close" aria-label="关闭" @click="closeLightbox">
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
            :src="originalUrl(shown[active]?.file_path || '')"
            :alt="`剧照 ${active + 1}`"
            class="lightbox-img"
          />
          <div class="lightbox-meta">
            {{ active + 1 }} / {{ shown.length }}
          </div>
        </div>
      </div>
    </Teleport>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';
import {
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  Maximize2 as MaximizeIcon,
  X as XIcon,
} from 'lucide-vue-next';
import { tmdbAPI } from '../../../utils/api';
import { APP_CONFIG } from '../../../../config/app.config';
import type { TMDbImage, TMDbImagesResponse } from '../../../types';
import Skeleton from '../../../components/common/Skeleton.vue';

interface Props {
  tmdbId?: number | null;
  mediaType: 'movie' | 'tv';
  /** 最多展示的剧照数量 */
  max?: number;
  /** 点击 Hero 番形时是否直接打开灯箱（默认 false：点 Hero 不开灯箱，只能通过角标按钮 / 双击缩略图 / Enter 键） */
  prefersLightboxOnHero?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  max: 12,
  prefersLightboxOnHero: false,
});

const loading = ref(false);
const stills = ref<TMDbImage[]>([]);
const lightboxOpen = ref(false);
const active = ref(0);
const hovering = ref(false);
const stripRef = ref<HTMLElement | null>(null);
const thumbEls = ref<Map<number, HTMLElement>>(new Map());

const setThumbRef = (el: unknown, idx: number) => {
  if (el instanceof HTMLElement) {
    thumbEls.value.set(idx, el);
  } else {
    thumbEls.value.delete(idx);
  }
};

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

const heroUrl = (path: string) => (path ? `${APP_CONFIG.tmdb.imageBaseUrl}/w1280${path}` : '');
const thumbUrl = (path: string) => `${APP_CONFIG.tmdb.imageBaseUrl}/w300${path}`;
const originalUrl = (path: string) => (path ? `${APP_CONFIG.tmdb.imageBaseUrl}/original${path}` : '');

const load = async () => {
  if (!props.tmdbId) return;
  loading.value = true;
  stills.value = [];
  active.value = 0;
  try {
    const response = await tmdbAPI.getImages(props.tmdbId, props.mediaType);
    if (response.success && response.data) {
      const data = response.data as TMDbImagesResponse;
      // backdrops 是最适合做剧照的（高质量横向素材）
      stills.value = data.backdrops || [];
      // 预加载 Hero 与下一张，减少切换闪烁
      preloadAround(0);
    }
  } catch (e) {
    console.warn('加载剧照失败:', e);
  } finally {
    loading.value = false;
  }
};

const preloadAround = (idx: number) => {
  const total = shown.value.length;
  if (total === 0) return;
  const targets = [idx, (idx + 1) % total];
  for (const i of targets) {
    const path = shown.value[i]?.file_path;
    if (path) {
      const img = new Image();
      img.src = heroUrl(path);
    }
  }
};

const setActive = (idx: number) => {
  if (idx === active.value) return;
  active.value = idx;
  preloadAround(idx);
  scrollThumbIntoView(idx);
};

const next = () => {
  if (shown.value.length === 0) return;
  setActive((active.value + 1) % shown.value.length);
};

const prev = () => {
  if (shown.value.length === 0) return;
  setActive((active.value - 1 + shown.value.length) % shown.value.length);
};

const openLightbox = (idx: number) => {
  active.value = idx;
  lightboxOpen.value = true;
};

const closeLightbox = () => {
  lightboxOpen.value = false;
};

const scrollThumbIntoView = (idx: number) => {
  nextTick(() => {
    const el = thumbEls.value.get(idx);
    if (el && typeof el.scrollIntoView === 'function') {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  });
};

const onKey = (event: KeyboardEvent) => {
  // 灯箱内：Esc / ← / → 全部由灯箱响应
  if (lightboxOpen.value) {
    if (event.key === 'Escape') {
      event.preventDefault();
      closeLightbox();
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
    return;
  }

  // 非灯箱：只在 Hero 区域被悬停时响应方向键 / Enter，避免抢全局快捷键
  if (!hovering.value) return;
  if (event.key === 'ArrowRight') {
    event.preventDefault();
    next();
  } else if (event.key === 'ArrowLeft') {
    event.preventDefault();
    prev();
  } else if (event.key === 'Enter') {
    event.preventDefault();
    openLightbox(active.value);
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

.head-left {
  display: flex;
  align-items: baseline;
  gap: 10px;
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

/* 键盘提示（仅多于 1 张时显示） */
.head-hint {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: #94a3b8;
}

.hint-key {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 22px;
  height: 20px;
  padding: 0 5px;
  border-radius: 5px;
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  color: #475569;
  font-size: 11px;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}

.hint-divider {
  width: 1px;
  height: 12px;
  background: #e2e8f0;
  margin: 0 4px;
}

/* —— Hero 番形 —— */
.hero-stage {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 9;
  max-height: 360px;
  border-radius: 14px;
  overflow: hidden;
  background: #0b1220;
  cursor: zoom-in;
  box-shadow: 0 14px 40px rgba(15, 23, 42, 0.18);
}

.hero-img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 460ms cubic-bezier(0.22, 1, 0.36, 1);
  will-change: transform;
}

.hero-stage:hover .hero-img {
  transform: scale(1.03);
}

/* Hero 切换：交叉淡入 */
.hero-cross-enter-active,
.hero-cross-leave-active {
  transition: opacity 220ms ease;
}
.hero-cross-enter-from {
  opacity: 0;
}
.hero-cross-leave-to {
  opacity: 0;
}

/* 上下渐隐遮罩，让角标更可读 */
.hero-shade {
  position: absolute;
  left: 0;
  right: 0;
  pointer-events: none;
}
.hero-shade-top {
  top: 0;
  height: 36%;
  background: linear-gradient(to bottom, rgba(0, 0, 0, 0.28), rgba(0, 0, 0, 0));
}
.hero-shade-bottom {
  bottom: 0;
  height: 45%;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.48), rgba(0, 0, 0, 0));
}

/* Hero 上的左右切换按钮：默认隐藏，悬停淡入 */
.hero-arrow {
  position: absolute;
  top: 50%;
  width: 38px;
  height: 38px;
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 50%;
  background: rgba(15, 23, 42, 0.45);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  backdrop-filter: blur(8px);
  opacity: 0;
  transform: translateY(-50%) scale(0.94);
  transition: opacity 180ms ease, transform 220ms ease, background 180ms ease;
}
.hero-arrow.visible {
  opacity: 1;
  transform: translateY(-50%) scale(1);
}
.hero-arrow:hover {
  background: rgba(15, 23, 42, 0.7);
}
.hero-arrow-left {
  left: 14px;
}
.hero-arrow-right {
  right: 14px;
}

/* Hero 右下角：序号 + 大图按钮 */
.hero-badges {
  position: absolute;
  right: 14px;
  bottom: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
  pointer-events: none;
}
.hero-index,
.hero-zoom {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 26px;
  padding: 0 10px;
  border-radius: 999px;
  font-size: 12px;
  line-height: 1;
  font-variant-numeric: tabular-nums;
  color: rgba(255, 255, 255, 0.96);
  background: rgba(15, 23, 42, 0.55);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.14);
}
.hero-zoom {
  pointer-events: auto;
  cursor: pointer;
  transition: background 160ms ease, transform 160ms ease;
}
.hero-zoom:hover {
  background: rgba(37, 99, 235, 0.85);
  transform: translateY(-1px);
}

/* —— 缩略条 —— */
.thumb-strip-wrap {
  position: relative;
  margin-top: 14px;
}

.thumb-strip {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding: 4px 2px 6px;
  scroll-snap-type: x proximity;
}

.thumb-cell {
  position: relative;
  flex-shrink: 0;
  width: 120px;
  height: 72px;
  border: 0;
  padding: 0;
  border-radius: 8px;
  overflow: hidden;
  background: #f3f4f6;
  cursor: pointer;
  scroll-snap-align: center;
  transition: transform 220ms ease, box-shadow 220ms ease, filter 220ms ease;
  filter: brightness(0.72) saturate(0.9);
}

.thumb-cell img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  pointer-events: none;
}

.thumb-cell:hover {
  filter: brightness(0.96) saturate(1);
  transform: translateY(-2px);
}

/* 当前活跃的：亮 + 蓝色底条，比悬停更强 */
.thumb-cell.is-active {
  filter: none;
  box-shadow:
    0 0 0 2px #2563eb,
    0 8px 18px rgba(37, 99, 235, 0.28);
  transform: translateY(-1px);
}

.thumb-bar {
  position: absolute;
  left: 8px;
  right: 8px;
  bottom: 6px;
  height: 2px;
  border-radius: 2px;
  background: linear-gradient(90deg, #60a5fa, #2563eb);
  opacity: 0;
  transform: scaleX(0);
  transform-origin: left center;
  transition: opacity 220ms ease, transform 240ms ease;
}
.thumb-cell.is-active .thumb-bar {
  opacity: 1;
  transform: scaleX(1);
}

/* 缩略条两侧渐隐 */
.strip-fade {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 36px;
  pointer-events: none;
}
.strip-fade-left {
  left: 0;
  background: linear-gradient(to right, rgba(255, 255, 255, 0.96), rgba(255, 255, 255, 0));
}
.strip-fade-right {
  right: 0;
  background: linear-gradient(to left, rgba(255, 255, 255, 0.96), rgba(255, 255, 255, 0));
}

/* 加载态：Hero 与缩略骨架的圆角对齐 Hero / 缩略图本体 */
:deep(.hero-skel) {
  border-radius: 14px !important;
}
:deep(.thumb-skel) {
  border-radius: 8px !important;
}

.thumb-strip-skeleton {
  display: flex;
  gap: 8px;
  margin-top: 14px;
  overflow: hidden;
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
  animation: lightbox-fade 180ms ease-out;
}

@keyframes lightbox-fade {
  from { opacity: 0; }
  to { opacity: 1; }
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
  transform: scale(1.05);
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
.lightbox-prev:hover {
  transform: translateY(-50%) scale(1.05);
}

.lightbox-next {
  right: 18px;
  top: 50%;
  transform: translateY(-50%);
}
.lightbox-next:hover {
  transform: translateY(-50%) scale(1.05);
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
