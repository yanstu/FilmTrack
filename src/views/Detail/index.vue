<template>
  <div class="detail-page-root h-full overflow-y-auto overflow-x-hidden">
    <!-- Hero Ambient 色彩延伸层（全宽铺底，仅在已加载且有影片时渲染） -->
    <template v-if="!detailState.isLoading && detailState.movie">
      <div
        v-if="ambientBackdropUrl"
        class="detail-ambient"
        :style="{ backgroundImage: `url(${ambientBackdropUrl})` }"
      ></div>
      <div v-else class="detail-ambient detail-ambient-fallback"></div>
    </template>

    <!-- 加载状态 -->
    <div v-if="detailState.isLoading" class="flex items-center justify-center h-full">
      <div class="text-center">
        <div class="w-12 h-12 border-4 border-gray-200 rounded-full animate-spin border-t-blue-600 mx-auto mb-4"></div>
        <p class="text-gray-600">加载中...</p>
      </div>
    </div>

    <!-- 电影不存在 -->
    <div v-else-if="!detailState.movie" class="flex items-center justify-center h-full">
      <div class="text-center">
        <svg class="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.664-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
        <h3 class="text-lg font-medium text-gray-900 mb-2">找不到这部作品</h3>
        <p class="text-gray-600 mb-4">它可能已被删除，或者链接不太对</p>
        <router-link to="/" class="btn btn-primary btn-md">返回首页</router-link>
      </div>
    </div>

    <!-- 详情内容 -->
    <div v-else class="detail-page-shell">
      <!-- 顶部横幅 -->
      <DetailHeader
        :movie="detailState.movie"
        :backdrop-images="detailState.backdropImages"
        :current-backdrop-index="detailState.currentBackdropIndex"
        :get-image-url="getImageURL"
        :get-backdrop-url="getBackdropURL"
        :is-valid-url="isValidUrl"
        @go-back="goBack"
        @show-poster-preview="showPosterPreview"
        @copy-title="copyTitle"
        @open-external-link="openExternalLink"
      />

      <!-- 详细内容区域 -->
      <div class="detail-page-body">
        <!-- 全宽在线播放区 -->
        <div class="detail-player-block">
          <DetailPlayerPanel
            :movie="detailState.movie"
            :player-state="playerState"
            :player-actions="playerActions"
          />
        </div>

        <!-- 主内容（简介 / 轨迹 / 重刷） + 信息侧栏 -->
        <div class="detail-page-grid">
          <DetailContent
            :movie="detailState.movie"
            :watch-timeline="watchTimeline"
            :format-date="formatDate"
          />

          <DetailSidebar
            :movie="detailState.movie"
            :watch-progress="watchProgress"
            :get-progress-color="getProgressColor"
            :format-date="formatDate"
            @edit-record="editRecord"
            @quick-record="openQuickRecord"
            @mark-episode-watched="markEpisodeWatched"
            @update-movie-info="updateMovieInfo"
            @delete-record="deleteRecord"
          />
        </div>
      </div>
    </div>

    <!-- 模态框 -->
    <DetailModals
      :modal-state="modalState"
      :movie="detailState.movie"
      :get-image-url="getImageURL"
      @close-edit-modal="closeEditModal"
      @close-poster-preview="closePosterPreview"
      @close-dialog="closeDialog"
      @save-record="handleSaveRecord"
    />

    <!-- 一体式快速记录弹窗：进度 + 评分 + 短评 一次提交 -->
    <QuickRecordDialog
      v-if="detailState.movie"
      :is-open="quickRecordVisible"
      :movie="detailState.movie"
      @close="quickRecordVisible = false"
      @save="handleQuickSave"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import type { Movie } from '../../types';
// 组件导入
import DetailHeader from './components/DetailHeader.vue';
import DetailPlayerPanel from './components/DetailPlayerPanel.vue';
import DetailContent from './components/DetailContent.vue';
import DetailSidebar from './components/DetailSidebar.vue';
import DetailModals from './components/DetailModals.vue';
import QuickRecordDialog from './components/QuickRecordDialog.vue';

// Composables 导入
import { useDetailData } from './composables/useDetailData';
import { useDetailActions } from './composables/useDetailActions';
import { useDetailPlayer } from './composables/useDetailPlayer';
import { useDetailUI } from './composables/useDetailUI';
import { useDetailUtils } from './composables/useDetailUtils';

// UI 状态管理
const {
  modalState,
  editRecord,
  showPosterPreview,
  showDialog,
  closeEditModal,
  closePosterPreview,
  closeDialog
} = useDetailUI();

// 数据管理
const {
  detailState,
  updateMovieInfo,
  handleSaveRecord
} = useDetailData(showDialog);

const {
  playerState,
  playerActions
} = useDetailPlayer(detailState);

// 操作逻辑
const {
  goBack,
  copyTitle,
  openExternalLink,
  markEpisodeWatched,
  deleteRecord
} = useDetailActions(detailState, showDialog);

// 工具函数
const {
  getImageURL,
  getBackdropURL,
  watchProgress,
  watchTimeline,
  getProgressColor,
  formatDate,
  isValidUrl
} = useDetailUtils(detailState);

// Hero Ambient：取 backdrop（或首张候选剧照）作为虚化色彩延伸层
const ambientBackdropUrl = computed<string>(() => {
  const movie = detailState.value.movie;
  if (movie?.backdrop_path) {
    const url = getBackdropURL(movie.backdrop_path || undefined);
    if (url) return url;
  }
  const first = detailState.value.backdropImages?.[0];
  if (first) {
    const url = getBackdropURL(first);
    return url || '';
  }
  return '';
});

// 一体式快速记录弹窗
const quickRecordVisible = ref(false);
const openQuickRecord = () => {
  quickRecordVisible.value = true;
};

const handleQuickSave = async (partial: Partial<Movie>) => {
  if (!detailState.value.movie) return;
  // 合并并复用已有的保存链路（含状态规范化）
  await handleSaveRecord({
    ...detailState.value.movie,
    ...partial,
  } as Movie);
};
</script>

<style scoped>
.animate-spin {
  animation: spin 1s linear infinite;
}

/* 详情页根容器：底色为温和的浅灰，让 ambient 自然叠在上面 */
.detail-page-root {
  position: relative;
  background: #f8fafc;
}

.detail-page-shell {
  position: relative;
  max-width: 1500px;
  margin: 0 auto;
  z-index: 1;
}

/* Hero Ambient：全宽铺到根容器，左右无空白；
   用更短高度 + 更轻饱和度，避免色彩"砸下来"喧宾夺主 */
.detail-ambient {
  position: absolute;
  inset: 0 0 auto 0; /* top right left = 0；bottom auto + 自定高度 */
  height: 640px;
  background-position: center 20%;
  background-size: cover;
  background-repeat: no-repeat;
  filter: blur(68px) saturate(1.3);
  opacity: 0.32;
  transform: scale(1.08);
  -webkit-mask-image: linear-gradient(
    to bottom,
    rgba(0, 0, 0, 0.9) 0%,
    rgba(0, 0, 0, 0.65) 38%,
    rgba(0, 0, 0, 0.3) 68%,
    rgba(0, 0, 0, 0) 100%
  );
  mask-image: linear-gradient(
    to bottom,
    rgba(0, 0, 0, 0.9) 0%,
    rgba(0, 0, 0, 0.65) 38%,
    rgba(0, 0, 0, 0.3) 68%,
    rgba(0, 0, 0, 0) 100%
  );
  pointer-events: none;
  z-index: 0;
  animation: ambient-fade-in 0.5s ease-out both;
}

/* 无 backdrop 时的优雅兜底色斑（中央椭圆光晕 + 蓝紫调） */
.detail-ambient-fallback {
  background: radial-gradient(
    ellipse 80% 60% at 50% 0%,
    rgba(59, 130, 246, 0.16) 0%,
    rgba(167, 139, 250, 0.1) 38%,
    transparent 72%
  );
  filter: none;
  transform: none;
  opacity: 1;
  height: 520px;
}

@keyframes ambient-fade-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 0.32;
  }
}

@media (prefers-reduced-motion: reduce) {
  .detail-ambient {
    animation: none;
  }
}

.detail-page-body {
  padding: 1.5rem 1.5rem 2.5rem;
  position: relative;
  z-index: 1;
}

.detail-player-block {
  margin-bottom: 1.5rem;
}

.detail-page-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.85fr) minmax(340px, 1fr);
  gap: 1.75rem;
  align-items: start;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 1180px) {
  .detail-page-grid {
    grid-template-columns: 1fr;
  }
}

/* 背景图片渐变遮罩 */
.bg-gradient-to-t {
  background: linear-gradient(to top, rgba(0, 0, 0, 0.8) 0%, rgba(0, 0, 0, 0.4) 50%, rgba(0, 0, 0, 0) 100%);
}

/* 返回按钮悬停效果 */
button:hover {
  transform: scale(1.05);
}
</style>
