<template>
  <img
    :src="displaySrc"
    :alt="alt"
    :class="[className, 'cached-image', { 'is-loaded': loaded, 'is-fallback': showingFallback }]"
    @error="handleError"
    @load="handleLoad"
  />
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { getCachedImageUrl } from '../../utils/imageCache';

import type { CachedImageProps } from './types';

type Props = CachedImageProps;

const props = withDefaults(defineProps<Props>(), {
  alt: '',
  className: '',
  fallback: '/placeholder-poster.svg'
});

const displaySrc = ref(props.fallback);
const loaded = ref(false);
const isLoading = ref(true);
const hasError = ref(false);

const showingFallback = computed(() => displaySrc.value === props.fallback);

const loadCachedImage = async () => {
  if (!props.src || hasError.value) {
    displaySrc.value = props.fallback;
    isLoading.value = false;
    return;
  }

  try {
    const cachedUrl = await getCachedImageUrl(props.src);

    if (!hasError.value) {
      displaySrc.value = cachedUrl;
    }
  } catch (error) {
    console.warn('加载缓存图片失败:', error);
    if (!hasError.value) {
      displaySrc.value = props.src;
    }
  } finally {
    isLoading.value = false;
  }
};

const handleError = () => {
  hasError.value = true;
  if (displaySrc.value !== props.fallback) {
    displaySrc.value = props.fallback;
  }
  loaded.value = true;
};

const handleLoad = () => {
  isLoading.value = false;
  hasError.value = false;
  loaded.value = true;
};

watch(() => props.src, () => {
  isLoading.value = true;
  hasError.value = false;
  loaded.value = false;
  loadCachedImage();
}, { immediate: true });

onMounted(() => {
  loadCachedImage();
});
</script>

<style scoped>
/* 加载完成才显现，避免「破图突现」/「灰色场闪一下」的网页感 */
.cached-image {
  opacity: 0;
  transition: opacity 220ms ease-out;
  will-change: opacity;
}

.cached-image.is-loaded {
  opacity: 1;
}

/* 兜底图保持 60% 不透明度作为占位（非空白），有内容感但不抢真实图 */
.cached-image.is-fallback.is-loaded {
  opacity: 0.6;
}

@media (prefers-reduced-motion: reduce) {
  .cached-image {
    transition: none;
    opacity: 1;
  }
}
</style>
