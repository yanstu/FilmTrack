<template>
  <img 
    :src="displaySrc" 
    :alt="alt"
    :class="className"
    @error="handleError"
    @load="handleLoad"
  />
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { getCachedImageUrl } from '../../utils/imageCache';

import type { CachedImageProps } from './types';

type Props = CachedImageProps;

const props = withDefaults(defineProps<Props>(), {
  alt: '',
  className: '',
  fallback: '/placeholder-poster.svg'
});

const displaySrc = ref(props.fallback);
const isLoading = ref(true);
const hasError = ref(false);

// 加载缓存图片
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
    // 如果缓存失败，直接使用原始URL
    if (!hasError.value) {
      displaySrc.value = props.src;
    }
  } finally {
    isLoading.value = false;
  }
};

// 错误处理
const handleError = () => {
  hasError.value = true;
  
  if (displaySrc.value !== props.fallback) {
    displaySrc.value = props.fallback;
  }
};

// 加载完成
const handleLoad = () => {
  isLoading.value = false;
  hasError.value = false;
};

// 监听src变化
watch(() => props.src, () => {
  isLoading.value = true;
  hasError.value = false;
  loadCachedImage();
}, { immediate: true });

onMounted(() => {
  loadCachedImage();
});
</script>