<template>
  <div class="h-full overflow-auto bg-gradient-to-br from-blue-50/50 via-white to-purple-50/50">
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
        <h3 class="text-lg font-medium text-gray-900 mb-2">影视作品不存在</h3>
        <p class="text-gray-600 mb-4">请检查链接是否正确</p>
        <router-link to="/" class="btn btn-primary btn-md">返回首页</router-link>
      </div>
    </div>

    <!-- 详情内容 -->
    <div v-else class="max-w-6xl mx-auto">
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
      <div class="p-6">
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <!-- 主要内容 -->
          <DetailContent
            :movie="detailState.movie"
            :watch-progress="watchProgress"
            :get-progress-color="getProgressColor"
          />

          <!-- 侧边栏信息 -->
          <DetailSidebar
            :movie="detailState.movie"
            :format-date="formatDate"
            @edit-record="editRecord"
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
  </div>
</template>

<script setup lang="ts">
// 组件导入
import DetailHeader from './components/DetailHeader.vue';
import DetailContent from './components/DetailContent.vue';
import DetailSidebar from './components/DetailSidebar.vue';
import DetailModals from './components/DetailModals.vue';

// Composables 导入
import { useDetailData } from './composables/useDetailData';
import { useDetailActions } from './composables/useDetailActions';
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
  getProgressColor,
  formatDate,
  isValidUrl
} = useDetailUtils(detailState);
</script>

<style scoped>
.animate-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
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
