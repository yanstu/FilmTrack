<template>
  <div class="detail-content">
    <!-- 剧情简介 / 我的记录 -->
    <div
      v-if="movie.overview || movie.notes"
      class="card detail-card animate-fade-in-up"
      style="animation-delay: 0.06s;"
    >
      <div class="detail-section-head">
        <h2 class="detail-section-title">{{ summaryTitle }}</h2>
        <span v-if="movie.year" class="detail-section-meta">{{ movie.year }}</span>
      </div>

      <p v-if="movie.overview" class="detail-paragraph">
        {{ movie.overview }}
      </p>
      <p v-else-if="movie.notes" class="detail-paragraph">
        {{ movie.notes }}
      </p>

      <div v-if="movie.notes && movie.overview" class="detail-note-block">
        <div class="detail-note-title">我的记录</div>
        <p class="detail-paragraph">{{ movie.notes }}</p>
      </div>
    </div>

    <!-- 预告片 -->
    <DetailTrailer
      v-if="movie.tmdb_id"
      :tmdb-id="movie.tmdb_id"
      :media-type="movieMediaType"
      style="animation-delay: 0.08s;"
    />

    <!-- 剧照画廊 -->
    <DetailStillsGallery
      v-if="movie.tmdb_id"
      :tmdb-id="movie.tmdb_id"
      :media-type="movieMediaType"
      style="animation-delay: 0.09s;"
    />

    <!-- 观看轨迹 -->
    <div class="card detail-card animate-fade-in-up" style="animation-delay: 0.1s;">
      <div class="detail-section-head">
        <h2 class="detail-section-title">观看轨迹</h2>
        <span class="detail-section-meta">最近 {{ watchTimeline.length }} 条</span>
      </div>

      <div v-if="watchTimeline.length === 0" class="detail-empty-state">
        还没有留下观看轨迹。
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
    <div class="animate-fade-in-up" style="animation-delay: 0.14s;">
      <ReplayRecordSection :movie="movie" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import ReplayRecordSection from './ReplayRecordSection.vue';
import DetailTrailer from './DetailTrailer.vue';
import DetailStillsGallery from './DetailStillsGallery.vue';
import type { DetailContentProps } from '../types';

type Props = DetailContentProps;

const props = defineProps<Props>();

const summaryTitle = computed(() => {
  if (props.movie.overview) {
    return '剧情简介';
  }
  return '我的记录';
});

const movieMediaType = computed<'movie' | 'tv'>(() =>
  props.movie.type === 'tv' ? 'tv' : 'movie'
);
</script>

<style scoped>
.detail-content {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  min-width: 0;
}

.detail-card {
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

.detail-paragraph {
  color: #475569;
  line-height: 1.85;
  font-size: 0.94rem;
}

.detail-empty-state {
  border-radius: 18px;
  border: 1px dashed rgba(203, 213, 225, 0.95);
  background: rgba(248, 250, 252, 0.9);
  padding: 1rem;
  font-size: 0.86rem;
  color: #64748b;
}

.detail-note-block {
  margin-top: 1.2rem;
  padding-top: 1.1rem;
  border-top: 1px solid rgba(226, 232, 240, 0.88);
}

.detail-note-title {
  margin-bottom: 0.65rem;
  font-size: 0.82rem;
  font-weight: 700;
  color: #475569;
}

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
  border-radius: 999px;
  flex-shrink: 0;
}

.timeline-dot-sky {
  background: #38bdf8;
}

.timeline-dot-emerald {
  background: #10b981;
}

.timeline-dot-amber {
  background: #f59e0b;
}

.timeline-body {
  min-width: 0;
}

.timeline-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.8rem;
}

.timeline-label {
  font-size: 0.9rem;
  font-weight: 700;
  color: #0f172a;
}

.timeline-date {
  font-size: 0.78rem;
  color: #94a3b8;
}

.timeline-description {
  margin-top: 0.35rem;
  font-size: 0.88rem;
  line-height: 1.7;
  color: #475569;
}
</style>
