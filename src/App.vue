<template>
  <n-config-provider :theme-overrides="themeOverrides">
    <div id="app" class="h-screen flex flex-col bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <!-- 自定义标题栏 -->
      <TitleBar />

      <!-- 主要内容区域 -->
      <div class="flex-1 flex overflow-hidden">
        <!-- 侧边导航 -->
        <Navigation />

        <!-- 页面内容 -->
        <main class="flex-1 overflow-auto">
          <router-view v-slot="{ Component }">
            <transition name="page" mode="out-in">
              <component :is="Component" />
            </transition>
          </router-view>
        </main>
      </div>

      <!-- 全局加载遮罩 -->
      <LoadingOverlay v-if="isGlobalLoading" />

      <!-- 全局错误提示 -->
      <ErrorToast v-if="globalError" :message="globalError" @close="clearGlobalError" />

      <!-- 全局模态框 -->
      <Modal
        :is-open="modalState.isOpen"
        :type="modalState.type"
        :title="modalState.title"
        :message="modalState.message"
        :confirm-text="modalState.confirmText"
        :cancel-text="modalState.cancelText"
        :show-cancel="modalState.showCancel"
        @close="modalService.close"
        @confirm="modalService.confirm"
        @cancel="modalService.cancel"
      />

      <!-- 设置模态框 -->
      <SettingsModal
        :is-open="settingsVisible"
        @close="settingsVisible = false"
        @save="handleSettingsSave"
      />

      <!-- 更新模态框 -->
      <UpdateModal
        v-if="updateInfo"
        v-model:visible="updateModalVisible"
        :update-info="updateInfo"
        @update="handleUpdate"
        @remind-later="updateModalVisible = false"
      />

    </div>
  </n-config-provider>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAppStore } from './stores/app';
import { NConfigProvider } from 'naive-ui';
import type { GlobalThemeOverrides } from 'naive-ui';
import TitleBar from './components/common/TitleBar.vue';
import Navigation from './components/common/Navigation.vue';
import LoadingOverlay from './components/common/LoadingOverlay.vue';
import ErrorToast from './components/common/ErrorToast.vue';
import Modal from './components/ui/Modal.vue';
import SettingsModal from './components/ui/SettingsModal.vue';
import UpdateModal from './components/ui/UpdateModal.vue';
import { listen } from '@tauri-apps/api/event';
import UpdateService from './services/update';
import type { UpdateCheckResult } from './types';
import { open } from '@tauri-apps/plugin-shell';

const router = useRouter();
const appStore = useAppStore();

// NaiveUI 主题配置
const themeOverrides: GlobalThemeOverrides = {
  common: {
    primaryColor: '#3B82F6', // 蓝色主色调
    primaryColorHover: '#2563EB',
    primaryColorPressed: '#1D4ED8',
    primaryColorSuppl: '#60A5FA',
    successColor: '#10B981', // 绿色
    successColorHover: '#059669',
    successColorPressed: '#047857',
    warningColor: '#F59E0B', // 橙色
    warningColorHover: '#D97706',
    warningColorPressed: '#B45309',
    errorColor: '#EF4444', // 红色
    errorColorHover: '#DC2626',
    errorColorPressed: '#B91C1C',
    borderRadius: '8px', // 统一圆角
    borderRadiusSmall: '8px',
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  },
  Button: {
    borderRadiusTiny: '6px',
    borderRadiusSmall: '7px',
    borderRadiusMedium: '8px',
    borderRadiusLarge: '14px',
    // 移除默认边框
    border: 'none',
    borderHover: 'none',
    borderPressed: 'none',
    borderFocus: 'none',
    borderDisabled: 'none',
    // 主要按钮样式
    colorPrimary: '#3B82F6',
    colorHoverPrimary: '#2563EB',
    colorPressedPrimary: '#1D4ED8',
    colorFocusPrimary: '#3B82F6',
    // 主要按钮文字颜色
    textColorPrimary: '#FFFFFF',
    textColorHoverPrimary: '#FFFFFF',
    textColorPressedPrimary: '#FFFFFF',
    textColorFocusPrimary: '#FFFFFF',
    // 成功按钮样式
    colorSuccess: '#10B981',
    colorHoverSuccess: '#059669',
    colorPressedSuccess: '#047857',
    colorFocusSuccess: '#10B981',
    // 错误按钮样式
    colorError: '#EF4444',
    colorHoverError: '#DC2626',
    colorPressedError: '#B91C1C',
    colorFocusError: '#EF4444',
    // 默认按钮样式
    color: '#F3F4F6',
    colorHover: '#E5E7EB',
    colorPressed: '#D1D5DB',
    colorFocus: '#F3F4F6',
    textColor: '#374151',
    textColorHover: '#111827',
    textColorPressed: '#111827',
    textColorFocus: '#374151'
  }
};

// 全局加载状态
const isGlobalLoading = computed(() => appStore.isLoading);

// 全局错误状态
const globalError = computed(() => appStore.error);
const clearGlobalError = () => appStore.clearError();

// 模态框状态
const modalState = computed(() => appStore.modalState);
const modalService = appStore.modalService;

// 设置模态框
const settingsVisible = ref(false);

// 更新相关
const updateModalVisible = ref(false);
const updateInfo = ref<UpdateCheckResult | null>(null);

// 处理设置保存
const handleSettingsSave = (settings: any) => {
  appStore.updateSettings(settings);
  settingsVisible.value = false;
};

// 处理更新
const handleUpdate = async () => {
  try {
    updateModalVisible.value = false;
    if (updateInfo.value?.download_url) {
      // 使用Tauri的shell.open打开下载链接
      await open(updateInfo.value.download_url);
    }
  } catch (error) {
    console.error('处理更新失败:', error);
    appStore.modalService.showError('更新失败', `处理更新失败: ${error}`);
  }
};



// 监听键盘快捷键
const handleKeyDown = (e: KeyboardEvent) => {
  // Ctrl+, 打开设置
  if (e.ctrlKey && e.key === ',') {
    e.preventDefault();
    settingsVisible.value = true;
  }
};

// 挂载和卸载事件监听器
onMounted(async () => {
  window.addEventListener('keydown', handleKeyDown);

  // 监听打开设置事件
  window.addEventListener('open-settings', () => {
    settingsVisible.value = true;
  });

  // 监听导航到添加记录页面事件
  listen('navigate-to-record', () => {
    router.push('/record');
  });

  // 设置更新回调
  UpdateService.setUpdateCallback((result: UpdateCheckResult) => {
    updateInfo.value = result;
    updateModalVisible.value = true;
  });

  // 初始化更新监听器
  try {
    await UpdateService.initUpdateListener();
  } catch (error) {
    console.error('初始化更新监听器失败:', error);
  }
});

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeyDown);
  window.removeEventListener('open-settings', () => {
    settingsVisible.value = true;
  });
  // 注意：Tauri的事件监听器会在应用关闭时自动清理
});
</script>

<style>
/* 全局样式 */
@import './styles/main.css';

/* 页面过渡动画 */
.page-enter-active,
.page-leave-active {
  transition: opacity 0.15s ease;
}

.page-enter-from,
.page-leave-to {
  opacity: 0;
}
</style>