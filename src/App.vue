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
        <main class="flex-1 overflow-hidden">
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
      <ErrorToast
        v-if="globalError"
        :message="globalError"
        :tone="globalErrorTone"
        :on-retry="globalErrorRetry"
        @close="clearGlobalError"
      />

      <!-- 全局命令面板（⌘/Ctrl+K） -->
      <CommandPalette />

      <!-- 全局键盘快捷键帮助（⌘/Ctrl+/） -->
      <ShortcutsHelp :visible="shortcutsHelpVisible" @close="shortcutsHelpVisible = false" />

      <!-- 全局右键菜单容器 -->
      <ContextMenu />

      <!-- 全局模态框 -->
      <Modal
        :is-open="modalState.isOpen"
        :type="modalState.type"
        :title="modalState.title"
        :message="modalState.message"
        :confirm-text="modalState.confirmText"
        :cancel-text="modalState.cancelText"
        :show-cancel="modalState.showCancel"
        @close="handleModalClose"
        @confirm="modalService.confirm"
        @cancel="modalService.cancel"
      />

      <!-- 设置模态框 -->
      <SettingsModal
        v-if="settingsVisible"
        :is-open="settingsVisible"
        :is-checking-update="isCheckingUpdate"
        :update-check-notice="updateCheckNotice"
        :source-profiles="sourceProfiles"
        :source-profiles-loading="sourceProfilesLoading"
        :initial-section="initialSettingsSection"
        @close="settingsVisible = false"
        @save="handleSettingsSave"
        @check-update="handleCheckForUpdate"
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
import { ref, onMounted, onBeforeUnmount, computed, defineAsyncComponent, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useAppStore } from './stores/app';
import { NConfigProvider } from 'naive-ui';
import type { GlobalThemeOverrides } from 'naive-ui';
import TitleBar from './components/common/TitleBar.vue';
import Navigation from './components/common/Navigation.vue';
import LoadingOverlay from './components/common/LoadingOverlay.vue';
import ErrorToast from './components/common/ErrorToast.vue';
import CommandPalette from './components/common/CommandPalette.vue';
import ContextMenu from './components/common/ContextMenu.vue';
import ShortcutsHelp from './components/common/ShortcutsHelp.vue';
import Modal from './components/ui/Modal.vue';
import { useShortcuts } from './composables/useShortcuts';
import type { UpdateCheckResult, AppSettings, UpdateCheckNotice, SourceProfileSummary } from './types';
import type { SettingsSectionId } from './components/ui/types';
import { getSourceProfiles, whenSourceProfilesRefreshed } from './services/video-source';

const SettingsModal = defineAsyncComponent({
  loader: () => import('./components/ui/SettingsModal.vue'),
  suspensible: false
});

const UpdateModal = defineAsyncComponent({
  loader: () => import('./components/ui/UpdateModal.vue'),
  suspensible: false
});

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
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, "PingFang SC", "Microsoft YaHei", Inter, Roboto, sans-serif'
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
const globalErrorTone = computed<'error' | 'warning' | 'info'>(() => {
  if (appStore.errorTone) return appStore.errorTone;
  const msg = appStore.error || '';
  if (/网络|超时|TLS|handshake|未连接|connect|offline|断开/i.test(msg)) {
    return 'warning';
  }
  return 'error';
});
const globalErrorRetry = computed<(() => void) | undefined>(() =>
  typeof appStore.errorRetry === 'function' ? appStore.errorRetry : undefined
);
const clearGlobalError = () => appStore.clearError();

// 快捷键帮助弹窗
const shortcutsHelpVisible = ref(false);

// 模态框状态
const modalState = computed(() => appStore.modalState);
const modalService = appStore.modalService;

// 设置模态框
const settingsVisible = ref(false);
const initialSettingsSection = ref<SettingsSectionId>('general');

// 更新相关
const updateModalVisible = ref(false);
const updateInfo = ref<UpdateCheckResult | null>(null);
const isCheckingUpdate = ref(false);
const updateCheckNotice = ref<UpdateCheckNotice | null>(null);
const sourceProfiles = ref<SourceProfileSummary[]>([]);
const sourceProfilesLoading = ref(false);
let unlistenNavigateToRecord: (() => void) | null = null;
let unlistenTriggerCheckUpdate: (() => void) | null = null;
let updateService: null | {
  setUpdateCallback: (callback: (result: UpdateCheckResult) => void) => void;
  initUpdateListener: () => Promise<void>;
  checkForUpdate: () => Promise<UpdateCheckResult>;
} = null;
let analyticsPromptHandled = false;
const UMAMI_SCRIPT_ID = 'filmtrackpro-umami-script';
const UMAMI_SCRIPT_SRC = 'https://umami.yanstu.cn/script.js';
const UMAMI_WEBSITE_ID = '80984069-0b6a-4cdc-b927-1911d5bff312';

const handleOpenSettings = (event?: Event) => {
  updateCheckNotice.value = null;
  const section = (event as CustomEvent<{ section?: SettingsSectionId }> | undefined)?.detail?.section;
  initialSettingsSection.value = section ?? 'general';
  settingsVisible.value = true;
  void loadSourceProfiles();
};

const handleModalClose = () => {
  if (modalState.value.type === 'confirm' && modalState.value.showCancel) {
    modalService.cancel();
    return;
  }

  modalService.close();
};

const ensureAnalyticsConsent = () => {
  if (analyticsPromptHandled || appStore.settings.usageAnalyticsPrompted) {
    return;
  }

  analyticsPromptHandled = true;
  appStore.modalService.showConfirm(
    '匿名使用统计',
    '是否允许发送匿名使用统计？仅会记录应用启动等基础事件，用来判断是否有人在使用，不会上传影视库、搜索词、笔记或导入内容。',
    () => {
      appStore.updateSettings({
        usageAnalyticsEnabled: true,
        usageAnalyticsPrompted: true
      });
    },
    () => {
      appStore.updateSettings({
        usageAnalyticsEnabled: false,
        usageAnalyticsPrompted: true
      });
    }
  );
};

const syncAnalyticsScript = (enabled: boolean) => {
  const existing = document.getElementById(UMAMI_SCRIPT_ID);

  if (!enabled) {
    existing?.remove();
    return;
  }

  if (existing) {
    return;
  }

  const script = document.createElement('script');
  script.id = UMAMI_SCRIPT_ID;
  script.defer = true;
  script.src = UMAMI_SCRIPT_SRC;
  script.setAttribute('data-website-id', UMAMI_WEBSITE_ID);
  document.head.appendChild(script);
};

// 处理设置保存
const handleSettingsSave = (settings: AppSettings) => {
  appStore.updateSettings(settings);
  settingsVisible.value = false;
  updateCheckNotice.value = null;
};

// 处理更新
const handleUpdate = async () => {
  try {
    updateModalVisible.value = false;
    if (updateInfo.value?.download_url) {
      const { open } = await import('@tauri-apps/plugin-shell');
      await open(updateInfo.value.download_url);
    }
  } catch (error) {
    console.error('处理更新失败:', error);
    appStore.modalService.showError('更新失败', `处理更新失败: ${error}`);
  }
};

const handleCheckForUpdate = async () => {
  if (!updateService || isCheckingUpdate.value) {
    return;
  }

  try {
    isCheckingUpdate.value = true;
    const result = await updateService.checkForUpdate();

    if (result.has_update) {
      updateCheckNotice.value = null;
      updateInfo.value = result;
      updateModalVisible.value = true;
      return;
    }

    updateCheckNotice.value = {
      type: 'success',
      message: '当前已经是最新版本。'
    };
  } catch (error) {
    console.error('手动检查更新失败:', error);
    const rawMessage = error instanceof Error ? error.message : String(error);
    const isNetworkError = /unexpected EOF during handshake|sending request|TLS|certificate|connect/i.test(rawMessage);
    updateCheckNotice.value = {
      type: 'error',
      message: isNetworkError ? '更新服务暂时不可用，请稍后再试。' : `无法完成更新检查：${rawMessage}`
    };
  } finally {
    isCheckingUpdate.value = false;
  }
};

const loadSourceProfiles = async () => {
  sourceProfilesLoading.value = true;
  try {
    const response = await getSourceProfiles();
    sourceProfiles.value = response.items;
  } catch (error) {
    console.error('加载片单摘要失败:', error);
  } finally {
    sourceProfilesLoading.value = false;
  }

  // SWR：若上面拿到的是过期 / 骨架数据且后台正在静默刷新，刷新完成后回填，列表原地更新
  const pendingRefresh = whenSourceProfilesRefreshed();
  if (pendingRefresh) {
    sourceProfilesLoading.value = true;
    try {
      await pendingRefresh;
      const refreshed = await getSourceProfiles();
      sourceProfiles.value = refreshed.items;
    } catch (error) {
      console.error('刷新片单摘要失败:', error);
    } finally {
      sourceProfilesLoading.value = false;
    }
  }
};



const openCommandPalette = () => {
  window.dispatchEvent(new CustomEvent('open-command-palette'));
};

const navigateTo = (name: string) => {
  if (router.currentRoute.value.name !== name) {
    void router.push({ name });
  }
};

// 全局快捷键
useShortcuts([
  { key: 'k', mod: true, handler: openCommandPalette, label: '命令面板' },
  { key: ',', mod: true, handler: () => handleOpenSettings(), label: '打开设置' },
  { key: '/', mod: true, handler: () => (shortcutsHelpVisible.value = true), label: '快捷键帮助' },
  { key: '1', mod: true, handler: () => navigateTo('Home'), label: '跳首页' },
  { key: '2', mod: true, handler: () => navigateTo('Library'), label: '跳影视库' },
  { key: '3', mod: true, handler: () => navigateTo('Record'), label: '跳添加记录' },
  { key: '4', mod: true, handler: () => navigateTo('History'), label: '跳历史' },
  { key: '5', mod: true, handler: () => navigateTo('Import'), label: '跳导入' },
]);

const handleTriggerCheckUpdate = () => {
  void handleCheckForUpdate();
};

// 挂载和卸载事件监听器
onMounted(async () => {
  // 监听打开设置事件
  window.addEventListener('open-settings', handleOpenSettings);

  // 命令面板的"检查更新"动作
  window.addEventListener('trigger-check-update', handleTriggerCheckUpdate);

  ensureAnalyticsConsent();
  syncAnalyticsScript(appStore.settings.usageAnalyticsEnabled);

  const [{ listen }, updateModule] = await Promise.all([
    import('@tauri-apps/api/event'),
    import('./services/update')
  ]);

  updateService = updateModule.default;

  // 监听导航到添加记录页面事件
  unlistenNavigateToRecord = await listen('navigate-to-record', () => {
    router.push('/record');
  });

  // 监听托盘菜单的"检查更新"事件
  unlistenTriggerCheckUpdate = await listen('trigger-check-update', () => {
    handleTriggerCheckUpdate();
  });

  // 设置更新回调
  updateService.setUpdateCallback((result: UpdateCheckResult) => {
    updateInfo.value = result;
    updateModalVisible.value = true;
  });

  // 初始化更新监听器
  try {
    await updateService.initUpdateListener();
  } catch (error) {
    console.error('初始化更新监听器失败:', error);
  }
});

watch(
  () => appStore.settings.usageAnalyticsEnabled,
  (enabled) => {
    syncAnalyticsScript(enabled);
  }
);

onBeforeUnmount(() => {
  window.removeEventListener('open-settings', handleOpenSettings);
  window.removeEventListener('trigger-check-update', handleTriggerCheckUpdate);
  if (unlistenNavigateToRecord) {
    unlistenNavigateToRecord();
    unlistenNavigateToRecord = null;
  }
  if (unlistenTriggerCheckUpdate) {
    unlistenTriggerCheckUpdate();
    unlistenTriggerCheckUpdate = null;
  }
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
