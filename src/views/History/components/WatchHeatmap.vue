<template>
  <div class="heatmap-card">
    <div class="heatmap-head">
      <div class="min-w-0">
        <h3 class="heatmap-title">观看活跃度</h3>
        <p class="heatmap-sub">近一年里你一共看了 {{ totalCount }} 部</p>
      </div>
      <div class="heatmap-legend">
        <span>少</span>
        <i class="legend-cell lvl-0"></i>
        <i class="legend-cell lvl-1"></i>
        <i class="legend-cell lvl-2"></i>
        <i class="legend-cell lvl-3"></i>
        <i class="legend-cell lvl-4"></i>
        <span>多</span>
      </div>
    </div>

    <div class="heatmap-scroll scrollbar-apple">
      <div class="heatmap-grid">
        <div v-for="(col, ci) in weeks" :key="ci" class="heatmap-col">
          <div
            v-for="(cell, ri) in col"
            :key="ri"
            class="heatmap-cell"
            :class="cell ? `lvl-${cell.level}` : 'cell-blank'"
            :title="cell ? `${cell.key}：看了 ${cell.count} 部` : ''"
          ></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { Movie } from '../../../types';

const props = defineProps<{ movies: Movie[] }>();

const DAY_MS = 86_400_000;
const TOTAL_WEEKS = 53;

const pad = (value: number) => String(value).padStart(2, '0');
const toKey = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

// 各日期的观看计数（以观看日期为准，缺失时回退到添加日期）
const counts = computed(() => {
  const map = new Map<string, number>();
  for (const movie of props.movies) {
    const raw = movie.watched_date || movie.date_added;
    if (!raw || typeof raw !== 'string') {
      continue;
    }
    const key = raw.slice(0, 10);
    if (key.length === 10) {
      map.set(key, (map.get(key) ?? 0) + 1);
    }
  }
  return map;
});

const toLevel = (count: number) => {
  if (count <= 0) return 0;
  if (count === 1) return 1;
  if (count <= 2) return 2;
  if (count <= 4) return 3;
  return 4;
};

interface Cell {
  key: string;
  count: number;
  level: number;
}

// 按周分列（每列周一→周日），共约一年；未来的格子留空
const weeks = computed<(Cell | null)[][]>(() => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const mondayOffset = (today.getDay() + 6) % 7; // 0 = 周一
  const lastMonday = new Date(today.getTime() - mondayOffset * DAY_MS);
  const start = new Date(lastMonday.getTime() - (TOTAL_WEEKS - 1) * 7 * DAY_MS);

  const columns: (Cell | null)[][] = [];
  for (let week = 0; week < TOTAL_WEEKS; week++) {
    const column: (Cell | null)[] = [];
    for (let day = 0; day < 7; day++) {
      const current = new Date(start.getTime() + (week * 7 + day) * DAY_MS);
      if (current.getTime() > today.getTime()) {
        column.push(null);
        continue;
      }
      const key = toKey(current);
      const count = counts.value.get(key) ?? 0;
      column.push({ key, count, level: toLevel(count) });
    }
    columns.push(column);
  }
  return columns;
});

const totalCount = computed(() => {
  let total = 0;
  for (const value of counts.value.values()) {
    total += value;
  }
  return total;
});
</script>

<style scoped>
.heatmap-card {
  @apply rounded-2xl border border-gray-200/60 bg-white/80 backdrop-blur-sm p-4 sm:p-5;
}

.heatmap-head {
  @apply mb-3 flex items-center justify-between gap-3;
}

.heatmap-title {
  @apply text-base font-semibold text-gray-900;
}

.heatmap-sub {
  @apply mt-0.5 text-xs text-gray-500;
}

.heatmap-legend {
  @apply flex flex-shrink-0 items-center gap-1 text-[11px] text-gray-400;
}

.legend-cell {
  @apply h-2.5 w-2.5 rounded-[3px];
}

.heatmap-scroll {
  @apply overflow-x-auto pb-1;
}

.heatmap-grid {
  display: flex;
  gap: 3px;
  min-width: max-content;
}

.heatmap-col {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.heatmap-cell {
  width: 11px;
  height: 11px;
  border-radius: 3px;
  transition: transform 120ms ease;
}

.heatmap-cell:hover {
  transform: scale(1.25);
}

.cell-blank {
  background: transparent;
}

.lvl-0 {
  background: #eef2f7;
}

.lvl-1 {
  background: #bfdbfe;
}

.lvl-2 {
  background: #60a5fa;
}

.lvl-3 {
  background: #2563eb;
}

.lvl-4 {
  background: #1e3a8a;
}
</style>
