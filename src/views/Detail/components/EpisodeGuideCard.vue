<template>
  <div v-if="movie.type === 'tv'" class="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
    <div class="mb-4">
      <h3 class="text-base font-semibold text-gray-900">季集指引</h3>
      <p class="mt-1 text-xs leading-5 text-gray-500">只留当前位置和下一步。</p>
    </div>

    <div class="space-y-4">
      <div class="guide-row">
        <span class="guide-label">看到</span>
        <span class="guide-value">{{ currentLabel }}</span>
      </div>

      <div class="guide-row">
        <span class="guide-label">下一步</span>
        <span class="guide-value">
          {{ nextStepLabel }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { Movie } from '../../../types';
import {
  getNextWatchProgress,
  getNormalizedProgress,
} from '../../../utils/seasonProgress';

const props = defineProps<{
  movie: Movie;
}>();

const current = computed(() => getNormalizedProgress(props.movie));
const nextStep = computed(() => getNextWatchProgress(props.movie));
const currentLabel = computed(() => `第${current.value.season}季第${current.value.episode}集`);
const nextStepLabel = computed(() => (
  nextStep.value
    ? `第${nextStep.value.season}季第${nextStep.value.episode}集`
    : '已经追到最新'
));
</script>

<style scoped>
.guide-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  border-bottom: 1px solid rgba(226, 232, 240, 0.7);
  padding-bottom: 0.8rem;
}

.guide-row:last-child {
  border-bottom: 0;
  padding-bottom: 0;
}

.guide-label {
  font-size: 0.82rem;
  color: #64748b;
}

.guide-value {
  text-align: right;
  font-size: 0.88rem;
  font-weight: 600;
  color: #0f172a;
}
</style>
