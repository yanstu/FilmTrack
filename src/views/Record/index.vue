<template>
  <div class="h-full overflow-auto bg-gradient-to-br from-blue-50/30 via-white to-purple-50/30">
    <div class="max-w-4xl mx-auto p-6">
      <!-- 页面标题 -->
      <div class="mb-8 animate-fade-in-up" style="animation-delay: 0ms;">
        <h1 class="text-3xl font-bold text-gray-900 mb-2">添加影视记录</h1>
        <p class="text-gray-600">记录你的观影体验，构建个人影视库</p>
      </div>

      <!-- 搜索影视作品区域 -->
      <SearchSection
        :search-query="searchState.query"
        :results="searchState.results"
        :loading="searchState.loading"
        :show-search-tips="searchState.showTips"
        :get-image-url="getImageURL"
        :is-already-added="isAlreadyAdded"
        @update:search-query="searchState.query = $event; handleTMDbSearch()"
        @select-first="selectFirstResult"
        @result-click="handleTMDbResultClick"
      />

      <!-- 影视信息和用户记录 -->
      <MovieInfoSection
        :form="form"
        :get-image-url="getImageURL"
        @show-image-preview="() => showImagePreview(form)"
      />

      <!-- 用户记录区域 -->
      <UserRecordForm
        :form="form"
        :status-options="statusOptions"
        @update:status="form.status = $event"
        @update:personal-rating="form.personal_rating = $event"
        @update:current-season="form.current_season = $event"
        @update:current-episode="form.current_episode = $event"
        @update:watch-source="form.watch_source = $event"
        @update:notes="form.notes = $event"
        @set-to-last-episode="setToLastEpisode"
      />

      <!-- 底部按钮区域 -->
      <ActionButtons
        :show-buttons="!!form.tmdb_id"
        :can-submit="canSubmit"
        :is-submitting="isSubmitting"
        @reset="handleReset"
        @submit="handleSubmit"
      />
    </div>

    <!-- 模态框 -->
    <RecordModals
      :image-preview-visible="imagePreviewVisible"
      :dialog="dialog"
      :form="form"
      :get-image-url="getImageURL"
      @close-image-preview="closeImagePreview"
      @close-dialog="closeDialog"
    />
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useMovieStore } from '../../stores/movie';

// 组件导入
import SearchSection from './components/SearchSection.vue';
import MovieInfoSection from './components/MovieInfoSection.vue';
import UserRecordForm from './components/UserRecordForm.vue';
import ActionButtons from './components/ActionButtons.vue';
import RecordModals from './components/RecordModals.vue';

// Composables 导入
import { useFormLogic } from './composables/useFormLogic';
import { useSearchLogic } from './composables/useSearchLogic';
import { useUIState } from './composables/useUIState';

// UI 状态管理
const {
  imagePreviewVisible,
  dialog,
  showImagePreview,
  showDialog,
  closeDialog,
  closeImagePreview
} = useUIState();

// 表单逻辑
const {
  form,
  isSubmitting,
  canSubmit,
  statusOptions,
  setToLastEpisode,
  handleSubmit,
  handleReset
} = useFormLogic(showDialog);

// 搜索逻辑
const {
  searchState,
  handleTMDbSearch,
  selectFirstResult,
  selectTMDbResult,
  handleTMDbResultClick,
  isAlreadyAdded,
  getImageURL
} = useSearchLogic(form, showDialog);

// 监听搜索查询变化
const movieStore = useMovieStore();

// 初始化
onMounted(async () => {
  // 确保加载影视作品数据用于重复检测
  if (!movieStore.hasMovies) {
    await movieStore.fetchMovies();
  }
});

// 监听搜索输入
const handleSearchInput = () => {
  handleTMDbSearch();
};

// 暴露搜索输入处理函数给模板
defineExpose({
  handleSearchInput
});
</script>

<style scoped>
.line-clamp-4 {
  display: -webkit-box;
  -webkit-line-clamp: 4;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* 页面进入动画 */
.animate-fade-in-up {
  animation: fadeInUp 0.4s ease-out both;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
