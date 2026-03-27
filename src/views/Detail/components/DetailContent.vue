<template>
  <div class="lg:col-span-2 space-y-8">
    <!-- 简介 -->
    <div v-if="movie.overview" class="card p-6 animate-fade-in-up" style="animation-delay: 0.1s;">
      <h2 class="text-xl font-semibold text-gray-900 mb-4">剧情简介</h2>
      <p class="text-gray-700 leading-relaxed">{{ movie.overview }}</p>
    </div>

    <!-- 个人笔记 -->
    <div v-if="movie.notes" class="card p-6 animate-fade-in-up" style="animation-delay: 0.15s;">
      <h2 class="text-xl font-semibold text-gray-900 mb-4">个人笔记</h2>
      <div class="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-r-lg">
        <p class="text-gray-700">{{ movie.notes }}</p>
      </div>
    </div>

    <!-- 观看进度 (电视剧) -->
    <div v-if="movie.type === 'tv'" class="animate-fade-in-up" style="animation-delay: 0.175s;">
      <WatchProgress
        :movie="movie"
        :watch-progress="watchProgress"
        :get-progress-color="getProgressColor"
      />
    </div>

    <div class="card p-6 animate-fade-in-up" style="animation-delay: 0.19s;">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-xl font-semibold text-gray-900">观看轨迹</h2>
        <span class="text-xs text-gray-400">最近 {{ watchTimeline.length }} 条</span>
      </div>

      <div v-if="watchTimeline.length === 0" class="rounded-xl border border-dashed border-gray-200 bg-gray-50/80 px-5 py-6 text-sm text-gray-500">
        还没有轨迹记录。
      </div>

      <div v-else class="space-y-4">
        <div
          v-for="item in watchTimeline"
          :key="item.id"
          class="timeline-row"
        >
          <div class="timeline-dot" :class="`timeline-dot-${item.tone}`"></div>
          <div class="timeline-body">
            <div class="timeline-meta">
              <span class="timeline-label">{{ item.label }}</span>
              <span class="timeline-date">{{ formatDate(item.date) }}</span>
            </div>
            <p class="timeline-description">{{ item.description }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- 重刷记录 -->
    <div class="animate-fade-in-up" style="animation-delay: 0.2s;">
      <ReplayRecordSection
        :movie="movie"
        :format-date="formatDate"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import WatchProgress from './WatchProgress.vue';
import ReplayRecordSection from './ReplayRecordSection.vue';
import type { Movie } from '../../../types';
import type { DetailContentProps } from '../types';

type Props = DetailContentProps;

defineProps<Props>();
</script>

<style scoped>
/* 上滑淡入动画 */
@keyframes fade-in-up {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-fade-in-up {
  animation: fade-in-up 0.4s ease-out forwards;
  opacity: 0;
}

.timeline-row {
  display: flex;
  gap: 0.9rem;
  align-items: flex-start;
}

.timeline-dot {
  width: 0.75rem;
  height: 0.75rem;
  margin-top: 0.35rem;
  border-radius: 9999px;
  flex-shrink: 0;
  box-shadow: 0 0 0 4px rgba(239, 246, 255, 1);
}

.timeline-dot-default {
  background: #94a3b8;
}

.timeline-dot-accent {
  background: #3b82f6;
}

.timeline-dot-success {
  background: #16a34a;
}

.timeline-body {
  min-width: 0;
  flex: 1;
  border-bottom: 1px solid rgba(226, 232, 240, 0.8);
  padding-bottom: 0.95rem;
}

.timeline-row:last-child .timeline-body {
  border-bottom: 0;
  padding-bottom: 0;
}

.timeline-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.timeline-label {
  font-size: 0.92rem;
  font-weight: 600;
  color: #0f172a;
}

.timeline-date {
  font-size: 0.75rem;
  color: #94a3b8;
}

.timeline-description {
  margin-top: 0.4rem;
  font-size: 0.88rem;
  line-height: 1.5;
  color: #475569;
}
</style>
