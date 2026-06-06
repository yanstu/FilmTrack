<template>
  <Modal
    :is-open="isOpen"
    type="info"
    title="设置"
    message=""
    :show-cancel="true"
    :large="true"
    :panel-class="'max-w-[min(92vw,880px)] h-[min(84vh,720px)]'"
    content-class="settings-modal-content"
    footer-class="settings-modal-footer"
    @close="$emit('close')"
    @confirm="handleSave"
    @cancel="$emit('close')"
    confirm-text="保存"
    cancel-text="关闭"
  >
    <template #content>
      <div class="settings-shell">
        <aside class="settings-nav">
          <button
            v-for="section in sections"
            :key="section.id"
            type="button"
            :class="['settings-nav-item', { 'settings-nav-item-active': activeSection === section.id }]"
            @click="activeSection = section.id"
          >
            <span class="settings-nav-label">{{ section.label }}</span>
            <span class="settings-nav-description">{{ section.description }}</span>
          </button>
        </aside>

        <div class="settings-panel">
          <section v-if="activeSection === 'general'" class="space-y-6">
            <div class="setting-section setting-section-compact">
              <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 class="setting-section-title setting-section-title-standalone">应用信息</h3>
                  <p class="setting-item-description">当前正在运行的桌面应用版本</p>
                </div>
                <div class="version-pill">
                  <span class="version-pill-label">版本</span>
                  <span class="version-pill-value">v{{ appVersion }}</span>
                </div>
              </div>
            </div>

            <div class="setting-section">
              <h3 class="setting-section-title">版本更新</h3>
              <div
                v-if="props.updateCheckNotice"
                :class="[
                  'settings-inline-notice',
                  props.updateCheckNotice.type === 'success'
                    ? 'settings-inline-notice-success'
                    : 'settings-inline-notice-error'
                ]"
              >
                {{ props.updateCheckNotice.message }}
              </div>
              <div class="setting-item">
                <div class="setting-item-info">
                  <div class="setting-item-label">检查更新</div>
                  <div class="setting-item-description">手动检查是否有新版本可用，并查看更新内容</div>
                </div>
                <button
                  type="button"
                  :disabled="props.isCheckingUpdate"
                  class="setting-button setting-button-primary"
                  @click="$emit('check-update')"
                >
                  {{ props.isCheckingUpdate ? '检查中...' : '检查更新' }}
                </button>
              </div>
            </div>

            <div class="setting-section">
              <h3 class="setting-section-title">应用行为</h3>
              <div class="setting-item">
                <div class="setting-item-info">
                  <div class="setting-item-label">最小化到系统托盘</div>
                  <div class="setting-item-description">关闭窗口时最小化到系统托盘而不是退出应用</div>
                </div>
                <ToggleSwitch v-model="settings.minimizeToTray" />
              </div>

              <div class="setting-item">
                <div class="setting-item-info">
                  <div class="setting-item-label">匿名使用统计</div>
                <div class="setting-item-description">
                  仅发送应用启动等匿名事件，用于判断是否有人在使用，不会上传影视库、搜索词、笔记或导入内容
                </div>
              </div>
                <ToggleSwitch v-model="settings.usageAnalyticsEnabled" />
              </div>

              <div class="setting-item">
                <div class="setting-item-info">
                  <div class="setting-item-label">允许调整窗口大小</div>
                  <div class="setting-item-description">启用后可以拖拽窗口边缘调整大小，窗口大小会自动记忆</div>
                </div>
                <ToggleSwitch v-model="settings.window.resizable" />
              </div>
            </div>
          </section>

          <section v-else-if="activeSection === 'video'" class="space-y-6">
            <div class="setting-section">
              <h3 class="setting-section-title">片单偏好</h3>
              <div class="setting-item setting-item-stack">
                <div class="setting-item-info">
                  <div class="setting-item-label">默认片单</div>
                  <div class="setting-item-description">选择平时优先用于匹配片源的片单</div>
                </div>
                <div class="w-full max-w-md">
                  <HeadlessSelect
                    :model-value="settings.videoSource.activeProfileId"
                    :options="sourceProfileOptions"
                    placeholder="选择片单"
                    @update:model-value="settings.videoSource.activeProfileId = String($event)"
                  />
                </div>
              </div>
              <p v-if="activeProfileDescription" class="setting-item-description mt-3">
                {{ activeProfileDescription }}
              </p>
              <div v-if="props.sourceProfilesLoading" class="source-profile-loading mt-3">
                正在同步片单状态...
              </div>
            </div>

            <div class="setting-section">
              <h3 class="setting-section-title">播放偏好</h3>

              <div class="setting-item">
                <div class="setting-item-info">
                  <div class="setting-item-label">优先自动选更合适的片源</div>
                  <div class="setting-item-description">匹配完成后自动优先选择更清晰、更新更完整的候选</div>
                </div>
                <ToggleSwitch v-model="settings.videoSource.autoSelectBestSource" />
              </div>

              <div class="setting-item">
                <div class="setting-item-info">
                  <div class="setting-item-label">优先沿用手动选过的片源</div>
                  <div class="setting-item-description">同一部作品再次打开时，优先回到你上次确认过的片源和剧集</div>
                </div>
                <ToggleSwitch v-model="settings.videoSource.preferManualSource" />
              </div>

              <div class="setting-item">
                <div class="setting-item-info">
                  <div class="setting-item-label">自动续播上次进度</div>
                  <div class="setting-item-description">重新打开剧集时，从你上次看到的位置继续</div>
                </div>
                <ToggleSwitch v-model="settings.videoSource.resumePlayback" />
              </div>

              <div class="setting-item setting-item-stack">
                <div class="setting-item-info">
                  <div class="setting-item-label">自动匹配策略</div>
                  <div class="setting-item-description">根据偏好更重视清晰度、更新完整度或两者平衡</div>
                </div>
                <div class="w-full max-w-md">
                  <HeadlessSelect
                    :model-value="settings.videoSource.qualityPriority"
                    :options="qualityPriorityOptions"
                    placeholder="选择匹配策略"
                    @update:model-value="settings.videoSource.qualityPriority = $event as AppSettings['videoSource']['qualityPriority']"
                  />
                </div>
              </div>

              <div class="setting-item setting-item-stack">
                <div class="setting-item-info">
                  <div class="setting-item-label">默认在线播放线路</div>
                  <div class="setting-item-description">详情页会优先尝试这条线路；没有命中时自动切到当前片源里可用的线路</div>
                </div>
                <div class="w-full max-w-md space-y-3">
                  <HeadlessSelect
                    :model-value="preferredLineOptions.some(item => item.value === settings.videoSource.preferredLineName) ? settings.videoSource.preferredLineName : 'custom'"
                    :options="[...preferredLineOptions, { value: 'custom', label: '按线路名匹配' }]"
                    placeholder="选择默认线路"
                    @update:model-value="handlePreferredLinePresetChange"
                  />
                  <TextField
                    v-if="!preferredLineOptions.some(item => item.value === settings.videoSource.preferredLineName) && settings.videoSource.preferredLineName !== 'auto'"
                    :model-value="settings.videoSource.preferredLineName"
                    placeholder="例如：量子、暴风、非凡"
                    @update:model-value="settings.videoSource.preferredLineName = String($event).trim()"
                  />
                </div>
              </div>
            </div>
          </section>

          <section v-else-if="activeSection === 'storage'" class="space-y-6">
            <div class="setting-section">
              <h3 class="setting-section-title">存储信息</h3>
              <div class="setting-info-grid">
                <div class="setting-info-item">
                  <div class="setting-info-label">缓存大小</div>
                  <div class="setting-info-value">{{ cacheSize }}</div>
                </div>
                <div class="setting-info-item">
                  <div class="setting-info-label">数据库大小</div>
                  <div class="setting-info-value">{{ dbSize }}</div>
                </div>
              </div>
            </div>

            <div class="setting-section">
              <h3 class="setting-section-title">缓存管理</h3>
              <div class="setting-item">
                <div class="setting-item-info">
                  <div class="setting-item-label">清空图片缓存</div>
                  <div class="setting-item-description">删除所有缓存的海报和背景图片，释放存储空间</div>
                </div>
                <button
                  @click="clearImageCache"
                  :disabled="isClearing"
                  class="setting-button setting-button-secondary"
                >
                  {{ isClearing ? '清理中...' : '清空缓存' }}
                </button>
              </div>
            </div>
          </section>

          <section v-else class="space-y-6">
            <div class="setting-section">
              <h3 class="setting-section-title">数据清理</h3>
              <div class="setting-item">
                <div class="setting-item-info">
                  <div class="setting-item-label">清空所有数据</div>
                  <div class="setting-item-description text-red-600">
                    <strong>注意：</strong>会删除所有记录和数据库文件，删了就找不回来了
                  </div>
                </div>
                <button
                  @click="clearAllData"
                  :disabled="isClearing"
                  class="setting-button setting-button-danger"
                >
                  {{ isClearing ? '清理中...' : '清空数据' }}
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </template>
  </Modal>

  <!-- 确认对话框 -->
  <Modal
    :is-open="confirmDialog.visible"
    :type="confirmDialog.type"
    :title="confirmDialog.title"
    :message="confirmDialog.message"
    :show-cancel="true"
    @close="confirmDialog.visible = false"
    @confirm="confirmDialog.onConfirm"
    confirm-text="确认"
    cancel-text="取消"
  />
</template>

<script setup lang="ts">
import { computed, ref, onMounted, watch } from 'vue';
import { invoke } from '@tauri-apps/api/core';
import { getVersion } from '@tauri-apps/api/app';
import Modal from './Modal.vue';
import HeadlessSelect from './HeadlessSelect.vue';
import TextField from './TextField.vue';
import ToggleSwitch from './ToggleSwitch.vue';
import StorageService, { StorageKey } from '../../utils/storage';
import { DEFAULT_APP_SETTINGS, mergeAppSettings } from '../../utils/appSettings';

import type { SettingsModalProps, SettingsModalEmits } from './types';
import type { AppSettings, ModalType } from '../../types';
import type { Option } from './types';

type Props = SettingsModalProps;
type Emits = SettingsModalEmits;

interface StorageInfo {
  cache_size: string;
  database_size: string;
  cache_size_bytes: number;
  database_size_bytes: number;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

interface BackendWindowConfig {
  width: number;
  height: number;
  x?: number | null;
  y?: number | null;
  min_width: number;
  min_height: number;
  max_width?: number | null;
  max_height?: number | null;
  resizable: boolean;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

// 响应式状态
const settings = ref<AppSettings>(mergeAppSettings());
const activeSection = ref<'general' | 'video' | 'storage' | 'danger'>('general');

const isClearing = ref(false);

const cacheSize = ref('计算中...');
const dbSize = ref('计算中...');
const appVersion = ref('读取中...');
const sections = [
  {
    id: 'general',
    label: '常规',
    description: '应用行为与基础设置'
  },
  {
    id: 'video',
    label: '播放',
    description: '片单与续播偏好'
  },
  {
    id: 'storage',
    label: '存储',
    description: '缓存与数据库空间'
  },
  {
    id: 'danger',
    label: '数据清理',
    description: '清理缓存或重置本地数据'
  }
] as const;

const sourceProfileOptions = computed(() => {
  const profiles = props.sourceProfiles || [];
  // 全部片单都列出，可用的排在前面并标注「N 条可用」，不可用的标注「当前不可用」沉底，
  // 既保留可见性、又一眼能看出哪些真正能用。
  return [...profiles]
    .sort((a, b) => Number(b.available) - Number(a.available) || b.sourceCount - a.sourceCount)
    .map((item) => ({
      value: item.id,
      label: item.available
        ? `${item.name} · ${item.sourceCount} 条可用`
        : (props.sourceProfilesLoading ? `${item.name} · 检测中…` : `${item.name} · 当前不可用`)
    }));
});

const activeProfileDescription = computed(() => {
  const activeProfile = (props.sourceProfiles || []).find((item) => item.id === settings.value.videoSource.activeProfileId);
  if (!activeProfile) {
    return '';
  }

  if (activeProfile.available) {
    return `${activeProfile.name} 当前可用，已整理出 ${activeProfile.sourceCount} 条 API 线路。`;
  }

  return `${activeProfile.name} 当前未响应，可切换到其他片单继续匹配。`;
});

const qualityPriorityOptions: Option[] = [
  { value: 'balanced', label: '画质与更新平衡' },
  { value: 'quality', label: '优先更清晰片源' },
  { value: 'update', label: '优先更新更完整' }
];

const preferredLineOptions: Option[] = [
  { value: 'auto', label: '自动选择更合适的线路' },
  { value: '暴风', label: '优先暴风线路' },
  { value: '量子', label: '优先量子线路' }
];

// 确认对话框
const confirmDialog = ref({
  visible: false,
  type: 'warning' as ModalType,
  title: '',
  message: '',
  onConfirm: () => {}
});

// 方法
const handleSave = async () => {
  try {
    settings.value.usageAnalyticsPrompted = true;

    // 保存到本地存储
    StorageService.set(StorageKey.SETTINGS, settings.value);
    
    // 应用窗口可调整大小设置
    await invoke('set_window_resizable', {
      resizable: settings.value.window.resizable
    });
    
    // 更新窗口配置到后端配置文件
    const windowConfigResponse = await invoke<ApiResponse<BackendWindowConfig>>('get_window_config');
    if (windowConfigResponse.success && windowConfigResponse.data) {
      const currentConfig = {
        ...windowConfigResponse.data,
        resizable: settings.value.window.resizable
      };
      
      await invoke<ApiResponse<string>>('update_window_config', {
        windowConfig: currentConfig
      });
    }
    
    // 发送保存事件
    emit('save', settings.value);
    
    // 触发设置更新事件
    window.dispatchEvent(new CustomEvent('settings-updated'));
    
    console.log('设置已保存');
  } catch (error) {
    console.error('保存设置失败:', error);
  }
  
  emit('close');
};

const clearImageCache = () => {
  confirmDialog.value = {
    visible: true,
    type: 'warning',
    title: '清空图片缓存',
    message: '确定要清空所有缓存的图片吗？这将删除所有海报和背景图片的本地缓存。',
    onConfirm: async () => {
      confirmDialog.value.visible = false;
      isClearing.value = true;
      
      try {
        const response = await invoke<ApiResponse<string>>('clear_image_cache');
        if (response.success) {
          await updateCacheInfo();
        } else {
          throw new Error(response.error || '清空失败');
        }
      } catch (error) {
        console.error('清空缓存失败:', error);
      } finally {
        isClearing.value = false;
      }
    }
  };
};

const clearAllData = () => {
  confirmDialog.value = {
    visible: true,
    type: 'warning',
    title: '清空所有数据',
    message: '会删掉所有记录、数据库和缓存，删了就找不回来了，确定继续吗？',
    onConfirm: async () => {
      confirmDialog.value.visible = false;
      isClearing.value = true;
      
      try {
        const response = await invoke<ApiResponse<string>>('clear_all_data');
        if (response.success) {
          await updateCacheInfo();
          // 可能需要重新加载页面或重置应用状态
          window.location.reload();
        } else {
          throw new Error(response.error || '清空失败');
        }
      } catch (error) {
        console.error('清空数据失败:', error);
      } finally {
        isClearing.value = false;
      }
    }
  };
};

const updateCacheInfo = async () => {
  try {
    const response = await invoke<ApiResponse<StorageInfo>>('get_storage_info');
    if (response.success && response.data) {
      cacheSize.value = response.data.cache_size;
      dbSize.value = response.data.database_size;
    } else {
      throw new Error(response.error || '获取失败');
    }
  } catch (error) {
    console.error('获取存储信息失败:', error);
    cacheSize.value = '获取失败';
    dbSize.value = '获取失败';
  }
};



const loadSettings = async () => {
  try {
    // 从本地存储加载基本设置
    const savedSettings = StorageService.get<Partial<AppSettings>>(StorageKey.SETTINGS, DEFAULT_APP_SETTINGS);
    settings.value = mergeAppSettings(savedSettings);
  } catch (error) {
    console.error('加载设置失败:', error);
    settings.value = mergeAppSettings();
  }
};

const handlePreferredLinePresetChange = (value: string | number) => {
  const nextValue = String(value);
  if (nextValue === 'custom') {
    if (preferredLineOptions.some(item => item.value === settings.value.videoSource.preferredLineName)) {
      settings.value.videoSource.preferredLineName = '';
    }
    return;
  }

  settings.value.videoSource.preferredLineName = nextValue;
};

const loadAppVersion = async () => {
  try {
    appVersion.value = await getVersion();
  } catch (error) {
    console.error('读取应用版本失败:', error);
    appVersion.value = '未知版本';
  }
};

// 生命周期
onMounted(async () => {
  await loadSettings();
  await Promise.all([
    loadAppVersion(),
    updateCacheInfo(),
  ]);
});

watch(
  () => props.isOpen,
  (isOpen) => {
    if (isOpen) {
      activeSection.value = props.initialSection ?? 'general';
    }
  }
);
</script>

<style scoped>
.settings-modal-content {
  @apply flex-1 overflow-hidden bg-gray-50/70 px-0 py-0;
}

.settings-modal-footer {
  @apply sticky bottom-0;
}

.settings-shell {
  @apply flex h-full min-h-0 flex-col gap-4 p-4 sm:p-6 lg:grid lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-6;
}

.settings-nav {
  @apply flex shrink-0 gap-2 overflow-x-auto rounded-2xl border border-gray-200 bg-white p-2 shadow-sm lg:h-full lg:min-h-0 lg:shrink lg:flex-col lg:overflow-x-visible lg:overflow-y-auto lg:p-3;
}

.settings-nav-item {
  @apply shrink-0 whitespace-nowrap rounded-xl border border-transparent px-4 py-2 text-left transition-all duration-200 hover:border-blue-100 hover:bg-blue-50/70 lg:shrink lg:whitespace-normal lg:py-3;
}

.settings-nav-item-active {
  @apply border-blue-200 bg-blue-50 text-blue-900 shadow-sm;
}

.settings-nav-label {
  @apply block text-sm font-semibold;
}

.settings-nav-description {
  @apply mt-1 hidden text-xs text-gray-500 lg:block;
}

.settings-panel {
  @apply min-w-0 min-h-0 flex-1 overflow-y-auto rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6;
}

.settings-panel > section {
  @apply space-y-6;
}

/* 设置区域：扁平分组（无嵌套卡片框），用标题分隔线 + 间距区分，减少「圈框」与多余留白 */
.setting-section {
  @apply pb-1;
}

.setting-section-compact {
  @apply pb-0;
}

.setting-section-title {
  @apply text-sm font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-100;
}

.setting-section-title-standalone {
  @apply mb-1 border-b-0 pb-0;
}

.setting-item {
  @apply flex items-center justify-between py-3;
}

.setting-item-stack {
  @apply flex-col items-start gap-4;
}

.setting-item:not(:last-child) {
  @apply border-b border-gray-100;
}

.setting-item-info {
  @apply flex-1 mr-4;
}

.setting-item-label {
  @apply font-medium text-gray-900 mb-1 text-sm;
}

.setting-item-description {
  @apply text-xs text-gray-600 leading-relaxed;
}

/* 按钮样式 */
.setting-button {
  @apply px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2;
}

.setting-button-secondary {
  @apply bg-gray-100 text-gray-700 hover:bg-gray-200 focus:ring-gray-500;
}

.setting-button-primary {
  @apply bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500;
}

.setting-button-danger {
  @apply bg-red-100 text-red-700 hover:bg-red-200 focus:ring-red-500;
}

.setting-button:disabled {
  @apply opacity-50 cursor-not-allowed;
}

/* 信息网格样式 */
.setting-info-grid {
  @apply grid grid-cols-1 md:grid-cols-2 gap-4;
}

.setting-info-item {
  @apply bg-white rounded-lg p-4 border border-gray-200;
}

.setting-info-label {
  @apply text-xs font-medium text-gray-600 mb-1;
}

.setting-info-value {
  @apply text-sm text-gray-900 font-mono break-all;
}

.version-pill {
  @apply inline-flex items-center gap-3 rounded-full border border-blue-100 bg-blue-50 px-4 py-2 text-sm text-blue-900;
}

.version-pill-label {
  @apply text-xs font-medium uppercase tracking-[0.18em] text-blue-500;
}

.version-pill-value {
  @apply font-semibold;
}

.settings-inline-notice {
  @apply mb-4 rounded-xl border px-4 py-3 text-sm;
}

.settings-inline-notice-success {
  @apply border-emerald-200 bg-emerald-50 text-emerald-700;
}

.settings-inline-notice-error {
  @apply border-red-200 bg-red-50 text-red-700;
}

.source-profile-grid {
  @apply mt-5 grid gap-3 md:grid-cols-2;
}

.source-profile-loading {
  @apply rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm text-slate-500 md:col-span-2;
}

.setting-inline-caption {
  @apply mb-5 text-sm font-medium text-slate-700;
}

.source-profile-card {
  @apply rounded-2xl border border-slate-200 bg-white p-4 shadow-sm;
}

.source-profile-title-row {
  @apply flex items-center justify-between gap-3;
}

.source-profile-title {
  @apply text-sm font-semibold text-slate-900;
}

.source-profile-badge {
  @apply inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold;
}

.source-profile-badge-ok {
  @apply bg-emerald-50 text-emerald-700;
}

.source-profile-badge-off {
  @apply bg-slate-100 text-slate-500;
}

.source-profile-description {
  @apply mt-2 text-xs leading-relaxed text-slate-600;
}

</style>
