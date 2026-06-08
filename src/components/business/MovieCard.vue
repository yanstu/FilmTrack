<template>
  <div
    class="movie-card bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-all duration-300 group cursor-pointer"
    data-context-menu
    @contextmenu.prevent="handleContextMenu"
  >
    <!-- 海报区域 -->
    <div class="relative aspect-[2/3] overflow-hidden poster-wrap">
      <CachedImage
        :src="getImageURL(movie.poster_path || '')"
        :alt="movie.title"
        class-name="w-full h-full object-cover poster-img"
      />

      <!-- 状态徽章 -->
      <div class="absolute top-2 left-2 z-10">
        <span :class="[
          'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium backdrop-blur-sm shadow-sm',
          getStatusBadgeClass(movie.status)
        ]">
          {{ getStatusLabel(movie.status) }}
        </span>
      </div>

      <!-- 评分徽章 -->
      <div v-if="movie.personal_rating" class="absolute top-2 right-2 z-10">
        <div class="flex items-center bg-black/70 backdrop-blur-sm text-white px-2 py-1 rounded-full text-xs">
          <StarIcon class="w-3 h-3 text-yellow-400 mr-1 fill-current" />
          {{ movie.personal_rating }}
        </div>
      </div>

      <!-- 悬停渐变浮层（覆盖海报底部，hover 时渐显） -->
      <div class="poster-hover-veil"></div>

      <!-- 悬停时的次级操作（右上方，小巧、不抢主体） -->
      <div class="poster-quick-actions">
        <button
          @click.stop="$emit('edit', movie)"
          class="poster-quick-btn"
          title="编辑"
          aria-label="编辑"
        >
          <EditIcon class="w-3.5 h-3.5" />
        </button>
        <button
          @click.stop="$emit('delete', movie.id)"
          class="poster-quick-btn poster-quick-btn-danger"
          title="删除"
          aria-label="删除"
        >
          <TrashIcon class="w-3.5 h-3.5" />
        </button>
      </div>

      <!-- 底部「查看详情」CTA：hover 渐显上滑 -->
      <div class="poster-cta">
        <button type="button" class="poster-cta-btn" @click.stop="goToDetail" aria-label="查看详情">
          <EyeIcon class="w-3.5 h-3.5" />
          <span>查看详情</span>
        </button>
      </div>
    </div>

    <!-- 信息区域 -->
    <div class="p-4">
      <div class="mb-2">
        <h3 class="font-semibold text-gray-900 truncate text-lg leading-tight">
          {{ movie.title }}
        </h3>
        <p v-if="movie.original_title && movie.original_title !== movie.title" 
           class="text-sm text-gray-500 truncate mt-1">
          {{ movie.original_title }}
        </p>
      </div>

      <div class="flex items-center justify-between text-sm text-gray-600 mb-3">
        <span>{{ movie.year || 'N/A' }}</span>
        <span class="px-2 py-1 bg-gray-100 rounded-full text-xs">
          {{ getTypeLabel(movie.type) }}
        </span>
      </div>

      <!-- TMDb 评分 -->
      <div v-if="movie.tmdb_rating" class="flex items-center justify-between mb-2">
        <span class="text-sm text-gray-600">TMDb</span>
        <div class="flex items-center">
          <div class="flex text-yellow-400 mr-1">
            <svg v-for="i in 5" :key="i" :class="[
              'w-3 h-3',
              movie.tmdb_rating >= i * 2 ? 'fill-current' : 'text-gray-300'
            ]" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
            </svg>
          </div>
          <span class="text-sm font-medium text-gray-700">{{ movie.tmdb_rating.toFixed(1) }}</span>
        </div>
      </div>

      <!-- 观看进度 (仅电视剧) -->
      <div v-if="movie.type === 'tv' && (movie.current_episode || movie.total_episodes)" class="mb-2">
        <div class="flex items-center justify-between text-xs text-gray-600 mb-1">
          <span>观看进度</span>
          <span>{{ progressSummary.current }}/{{ movie.total_episodes || '?' }}</span>
        </div>
        <div class="w-full bg-gray-200 rounded-full h-1.5">
          <div
            class="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
            :style="{ width: `${progressSummary.percentage}%` }"
          ></div>
        </div>
      </div>

      <!-- 最后更新时间 -->
      <div class="text-xs text-gray-400 mt-2">
        {{ formatDate(movie.date_updated) }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { tmdbAPI } from '../../utils/api';
import { APP_CONFIG } from '../../../config/app.config';
import type { ParsedMovie } from '../../types';
import { getStatusLabel, formatRating, getTypeLabel, getStatusBadgeClass } from '../../utils/constants';
import {
  Copy as CopyIcon,
  Edit3 as EditIcon,
  ExternalLink as ExternalLinkIcon,
  Eye as EyeIcon,
  Star as StarIcon,
  Trash2 as TrashIcon,
} from 'lucide-vue-next';
import CachedImage from '../ui/CachedImage.vue';
import { getWatchProgressSummary } from '../../utils/seasonProgress';
import { useContextMenu, type ContextMenuEntry } from '../../composables/useContextMenu';

interface Props {
  movie: ParsedMovie;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  edit: [movie: ParsedMovie];
  delete: [id: string];
  click: [movie: ParsedMovie];
}>();

const progressSummary = computed(() => getWatchProgressSummary(props.movie));

// 方法
const getImageURL = (path: string | undefined) => {
  return tmdbAPI.getImageURL(path);
};

const formatDate = (dateString: string) => {
  const now = new Date();
  const date = new Date(dateString);
  const diffTime = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return '今天';
  if (diffDays === 1) return '昨天';
  if (diffDays < 7) return `${diffDays}天前`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}周前`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}个月前`;
  return `${Math.floor(diffDays / 365)}年前`;
};

const handleImageError = () => {
  // 处理图片加载错误
};

const router = useRouter();
const { openMenu } = useContextMenu();

const goToDetail = () => {
  router.push({ name: 'Detail', params: { id: props.movie.id } });
};

const openInTmdb = async () => {
  const id = props.movie.tmdb_id;
  if (!id) return;
  const url = props.movie.type === 'tv'
    ? `https://www.themoviedb.org/tv/${id}`
    : `https://www.themoviedb.org/movie/${id}`;
  try {
    const { open } = await import('@tauri-apps/plugin-shell');
    await open(url);
  } catch {
    window.open(url, '_blank');
  }
};

const copyTitle = async () => {
  const text = props.movie.title;
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
    }
  } catch {
    // 静默失败，浏览器若拒绝则跳过
  }
};

const handleContextMenu = (event: MouseEvent) => {
  const entries: ContextMenuEntry[] = [
    {
      id: 'open',
      label: '打开详情',
      icon: EyeIcon,
      onSelect: () => router.push({ name: 'Detail', params: { id: props.movie.id } }),
    },
    {
      id: 'edit',
      label: '编辑记录',
      icon: EditIcon,
      onSelect: () => emit('edit', props.movie),
    },
    { id: 'd1', divider: true },
    {
      id: 'copy',
      label: '复制标题',
      icon: CopyIcon,
      onSelect: () => { void copyTitle(); },
    },
    {
      id: 'tmdb',
      label: '在 TMDb 中打开',
      icon: ExternalLinkIcon,
      disabled: !props.movie.tmdb_id,
      onSelect: () => { void openInTmdb(); },
    },
    { id: 'd2', divider: true },
    {
      id: 'delete',
      label: '删除记录',
      icon: TrashIcon,
      danger: true,
      onSelect: () => emit('delete', props.movie.id),
    },
  ];
  openMenu(event, entries);
};
</script>

<style scoped>
.movie-card {
  transform: translateY(0);
  transition:
    transform 320ms cubic-bezier(0.22, 1, 0.36, 1),
    box-shadow 320ms ease;
}

.movie-card:hover {
  transform: translateY(-6px);
  box-shadow:
    0 22px 44px -24px rgba(15, 23, 42, 0.4),
    0 8px 18px -10px rgba(15, 23, 42, 0.18);
}

.poster-wrap {
  background: #0f172a;
}

/* 海报本体：默认显示，hover 时轻微缩放，给浮层让出"运动方向" */
.poster-img {
  transition: transform 520ms cubic-bezier(0.22, 1, 0.36, 1);
  will-change: transform;
}

.movie-card:hover .poster-img {
  transform: scale(1.06);
}

/* 底部渐变蒙版（hover 渐显，承托 CTA 与浮层可读性） */
.poster-hover-veil {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    to top,
    rgba(0, 0, 0, 0.55) 0%,
    rgba(0, 0, 0, 0.25) 30%,
    rgba(0, 0, 0, 0) 55%
  );
  opacity: 0;
  transition: opacity 260ms ease-out;
  pointer-events: none;
}

.movie-card:hover .poster-hover-veil {
  opacity: 1;
}

/* 顶部右侧次级操作（编辑 / 删除）：默认隐藏，hover 渐入 */
.poster-quick-actions {
  position: absolute;
  top: 8px;
  right: 8px;
  display: flex;
  gap: 6px;
  opacity: 0;
  transform: translateY(-4px);
  transition:
    opacity 220ms ease-out,
    transform 220ms cubic-bezier(0.22, 1, 0.36, 1);
  z-index: 12;
}

/* 顶部已经放了「评分徽章」时，把次级操作往下挤一档以避免重叠 */
.movie-card:has(.absolute.top-2.right-2) .poster-quick-actions {
  top: 36px;
}

.movie-card:hover .poster-quick-actions {
  opacity: 1;
  transform: translateY(0);
}

.poster-quick-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: rgba(17, 24, 39, 0.6);
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.14);
  backdrop-filter: blur(8px);
  cursor: pointer;
  transition:
    background-color 160ms ease,
    transform 160ms ease;
}

.poster-quick-btn:hover {
  background: rgba(17, 24, 39, 0.86);
}

.poster-quick-btn-danger:hover {
  background: rgba(239, 68, 68, 0.85);
}

.poster-quick-btn:active {
  transform: scale(0.92);
}

/* 底部 CTA：「查看详情」，hover 时上滑 + 渐显 */
.poster-cta {
  position: absolute;
  left: 8px;
  right: 8px;
  bottom: 8px;
  display: flex;
  justify-content: flex-end;
  opacity: 0;
  transform: translateY(8px);
  transition:
    opacity 220ms ease-out,
    transform 240ms cubic-bezier(0.22, 1, 0.36, 1);
  z-index: 11;
}

.movie-card:hover .poster-cta {
  opacity: 1;
  transform: translateY(0);
}

.poster-cta-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 28px;
  padding: 0 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.92);
  color: #0f172a;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.01em;
  border: none;
  cursor: pointer;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.18);
  transition:
    background-color 160ms ease,
    transform 160ms ease;
}

.poster-cta-btn:hover {
  background: #2563eb;
  color: #fff;
}

.poster-cta-btn:active {
  transform: scale(0.95);
}

/* 减动画用户：去掉所有 hover 位移与缩放，只保留淡入 */
@media (prefers-reduced-motion: reduce) {
  .movie-card,
  .poster-img,
  .poster-quick-actions,
  .poster-cta {
    transition: opacity 160ms ease !important;
    transform: none !important;
  }
  .movie-card:hover {
    transform: none;
  }
  .movie-card:hover .poster-img {
    transform: none;
  }
}
</style>

