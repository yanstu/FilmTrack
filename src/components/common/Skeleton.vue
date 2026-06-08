<template>
  <div :class="['skel', variantClass, props.class]" :style="dimStyle" aria-hidden="true"></div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  /** 形态：line(默认文本行) / block(色块) / circle(圆形) / poster(2:3 海报) / card(卡片) */
  variant?: 'line' | 'block' | 'circle' | 'poster' | 'card';
  /** 宽度（CSS 任意单位，默认 100%） */
  width?: string;
  /** 高度（CSS 任意单位，默认按 variant 给一个合理值） */
  height?: string;
  /** 自定义类名 */
  class?: string;
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'line',
  width: undefined,
  height: undefined,
});

const variantClass = computed(() => `skel-${props.variant}`);

const dimStyle = computed(() => ({
  width: props.width,
  height: props.height,
}));
</script>

<style scoped>
.skel {
  background: linear-gradient(
    90deg,
    rgba(0, 0, 0, 0.06) 0%,
    rgba(0, 0, 0, 0.12) 50%,
    rgba(0, 0, 0, 0.06) 100%
  );
  background-size: 200% 100%;
  animation: shimmer 1.4s ease-in-out infinite;
  border-radius: 6px;
}

.skel-line {
  height: 12px;
  border-radius: 6px;
}

.skel-block {
  height: 80px;
  border-radius: 10px;
}

.skel-circle {
  border-radius: 9999px;
  width: 36px;
  height: 36px;
}

.skel-poster {
  aspect-ratio: 2 / 3;
  width: 100%;
  border-radius: 10px;
}

.skel-card {
  border-radius: 14px;
  height: 120px;
}

@keyframes shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .skel {
    animation: none;
    background: rgba(0, 0, 0, 0.08);
  }
}
</style>
