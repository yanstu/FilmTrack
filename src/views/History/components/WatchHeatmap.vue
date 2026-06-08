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
            @mouseenter="cell && showTip(cell, $event)"
            @mousemove="cell && moveTip($event)"
            @mouseleave="hideTip"
          ></div>
        </div>
      </div>
    </div>

    <!-- 悬浮提示：日期 + 周几 + 当天看了几部 + 作品名 -->
    <Teleport to="body">
      <Transition name="tip-fade">
        <div v-if="tip.visible" class="heatmap-tip" :style="tipStyle" role="tooltip">
          <div class="tip-date">{{ tip.dateLabel }}</div>
          <template v-if="tip.count > 0">
            <div class="tip-count">看了 {{ tip.count }} 部</div>
            <ul class="tip-list">
              <li v-for="(name, i) in tip.titles" :key="i" class="tip-item">{{ name }}</li>
            </ul>
            <div v-if="tip.more > 0" class="tip-more">等共 {{ tip.count }} 部</div>
          </template>
          <div v-else class="tip-empty">这天没有观看记录</div>
          <span class="tip-arrow"></span>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive } from 'vue';
import type { Movie } from '../../../types';

const props = defineProps<{ movies: Movie[] }>();

const DAY_MS = 86_400_000;
const TOTAL_WEEKS = 53;
const MAX_TIP_TITLES = 3;
const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

const pad = (value: number) => String(value).padStart(2, '0');
const toKey = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

interface DayStat {
  count: number;
  titles: string[];
}

// 各日期的观看统计（以观看日期为准，缺失时回退到添加日期），同时收集作品名用于悬浮提示
const stats = computed(() => {
  const map = new Map<string, DayStat>();
  for (const movie of props.movies) {
    const raw = movie.watched_date || movie.date_added;
    if (!raw || typeof raw !== 'string') {
      continue;
    }
    const key = raw.slice(0, 10);
    if (key.length !== 10) {
      continue;
    }
    const entry = map.get(key) ?? { count: 0, titles: [] };
    entry.count += 1;
    const title = (movie.title || '').trim();
    if (title) {
      entry.titles.push(title);
    }
    map.set(key, entry);
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
  weekday: number;
  titles: string[];
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
      const stat = stats.value.get(key);
      const count = stat?.count ?? 0;
      column.push({
        key,
        count,
        level: toLevel(count),
        weekday: current.getDay(),
        titles: stat?.titles ?? [],
      });
    }
    columns.push(column);
  }
  return columns;
});

const totalCount = computed(() => {
  let total = 0;
  for (const value of stats.value.values()) {
    total += value.count;
  }
  return total;
});

// —— 悬浮提示状态 ——
const tip = reactive({
  visible: false,
  x: 0,
  y: 0,
  dateLabel: '',
  count: 0,
  titles: [] as string[],
  more: 0,
});

const tipStyle = computed(() => ({
  left: `${tip.x}px`,
  top: `${tip.y}px`,
}));

const formatDateLabel = (key: string, weekday: number) => {
  const [y, m, d] = key.split('-');
  return `${y}年${Number(m)}月${Number(d)}日 · ${WEEKDAYS[weekday] ?? ''}`;
};

const updatePosition = (event: MouseEvent) => {
  const target = event.currentTarget as HTMLElement | null;
  if (!target) return;
  const rect = target.getBoundingClientRect();
  tip.x = rect.left + rect.width / 2;
  tip.y = rect.top;
};

const showTip = (cell: Cell, event: MouseEvent) => {
  tip.dateLabel = formatDateLabel(cell.key, cell.weekday);
  tip.count = cell.count;
  tip.titles = cell.titles.slice(0, MAX_TIP_TITLES);
  tip.more = Math.max(0, cell.count - tip.titles.length);
  updatePosition(event);
  tip.visible = true;
};

const moveTip = (event: MouseEvent) => {
  if (tip.visible) {
    updatePosition(event);
  }
};

const hideTip = () => {
  tip.visible = false;
};
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

.heatmap-cell:not(.cell-blank):hover {
  transform: scale(1.35);
  cursor: pointer;
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

/* —— 悬浮提示浮层 —— */
.heatmap-tip {
  position: fixed;
  z-index: 60;
  transform: translate(-50%, calc(-100% - 10px));
  min-width: 132px;
  max-width: 240px;
  padding: 8px 10px;
  border-radius: 10px;
  background: rgba(17, 24, 39, 0.94);
  color: #fff;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.22);
  backdrop-filter: blur(6px);
  pointer-events: none;
}

.tip-date {
  font-size: 12px;
  font-weight: 600;
  line-height: 1.3;
}

.tip-count {
  margin-top: 3px;
  font-size: 11px;
  color: #93c5fd;
}

.tip-list {
  margin: 5px 0 0;
  padding: 0;
  list-style: none;
}

.tip-item {
  font-size: 12px;
  line-height: 1.5;
  color: #e5e7eb;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tip-more {
  margin-top: 3px;
  font-size: 11px;
  color: #9ca3af;
}

.tip-empty {
  margin-top: 3px;
  font-size: 12px;
  color: #9ca3af;
}

.tip-arrow {
  position: absolute;
  left: 50%;
  bottom: -5px;
  width: 10px;
  height: 10px;
  transform: translateX(-50%) rotate(45deg);
  background: rgba(17, 24, 39, 0.94);
  border-radius: 2px;
}

.tip-fade-enter-active,
.tip-fade-leave-active {
  transition: opacity 120ms ease, transform 120ms ease;
}

.tip-fade-enter-from,
.tip-fade-leave-to {
  opacity: 0;
  transform: translate(-50%, calc(-100% - 4px));
}
</style>
