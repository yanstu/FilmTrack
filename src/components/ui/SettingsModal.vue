<template>
  <Modal
    :is-open="isOpen"
    type="info"
    title="设置"
    message=""
    :show-cancel="true"
    :large="true"
    @close="$emit('close')"
    @confirm="handleSave"
    @cancel="$emit('close')"
    confirm-text="保存"
    cancel-text="关闭"
  >
    <template #content>
      <div class="space-y-6">
        <!-- 应用行为设置 -->
        <div class="setting-section">
          <h3 class="setting-section-title">应用行为</h3>
          <div class="setting-item">
            <div class="setting-item-info">
              <div class="setting-item-label">点击关闭按钮最小化到托盘</div>
              <div class="setting-item-description">启用后，点击关闭按钮会将应用最小化到系统托盘而不是退出程序</div>
            </div>
            <label class="toggle-switch">
              <input
                type="checkbox"
                v-model="settings.minimizeToTray"
                class="toggle-input"
              />
              <span class="toggle-slider"></span>
            </label>
          </div>
        </div>

        <!-- 缓存管理 -->
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
          
          <div class="setting-item">
            <div class="setting-item-info">
              <div class="setting-item-label">清空所有数据</div>
              <div class="setting-item-description text-red-600">
                <strong>危险操作：</strong>删除所有观看记录和数据库文件，此操作不可恢复
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

        <!-- 存储信息 -->
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
import { ref, onMounted, computed, watch } from 'vue';
import { invoke } from '@tauri-apps/api/core';
import Modal from './Modal.vue';
import StorageService, { StorageKey } from '../../utils/storage';

interface Props {
  isOpen: boolean;
}

interface Emits {
  (e: 'close'): void;
  (e: 'save', settings: AppSettings): void;
}

interface AppSettings {
  minimizeToTray: boolean;
}

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

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

// 响应式状态
const settings = ref<AppSettings>({
  minimizeToTray: true
});

const isClearing = ref(false);
const cacheSize = ref('计算中...');
const dbSize = ref('计算中...');

// 确认对话框
const confirmDialog = ref({
  visible: false,
  type: 'warning' as const,
  title: '',
  message: '',
  onConfirm: () => {}
});

// 方法
const handleSave = () => {
  emit('save', settings.value);
  // 触发设置更新事件
  window.dispatchEvent(new CustomEvent('settings-updated'));
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
          console.log('图片缓存已清空');
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
    message: '⚠️ 危险操作：这将删除所有观看记录、数据库文件和缓存。此操作不可恢复，确定要继续吗？',
    onConfirm: async () => {
      confirmDialog.value.visible = false;
      isClearing.value = true;
      
      try {
        const response = await invoke<ApiResponse<string>>('clear_all_data');
        if (response.success) {
          console.log('所有数据已清空');
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

const loadSettings = () => {
  const savedSettings = StorageService.get(StorageKey.SETTINGS, {
    minimizeToTray: true
  });
  if (savedSettings) {
    settings.value = { ...settings.value, ...savedSettings };
  }
};

// 生命周期
onMounted(() => {
  loadSettings();
  updateCacheInfo();
});
</script>

<style scoped>
/* 设置区域样式 */
.setting-section {
  @apply border border-gray-200 rounded-xl p-6 bg-gray-50/30;
}

.setting-section-title {
  @apply text-base font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200;
}

.setting-item {
  @apply flex items-center justify-between py-3;
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

.setting-button-danger {
  @apply bg-red-100 text-red-700 hover:bg-red-200 focus:ring-red-500;
}

.setting-button:disabled {
  @apply opacity-50 cursor-not-allowed;
}

/* 切换开关样式 */
.toggle-switch {
  @apply relative inline-block w-12 h-6 cursor-pointer;
}

.toggle-input {
  @apply opacity-0 w-0 h-0;
}

.toggle-slider {
  @apply absolute cursor-pointer top-0 left-0 right-0 bottom-0 bg-gray-300 rounded-full transition-all duration-200;
}

.toggle-slider:before {
  @apply absolute content-[''] h-5 w-5 left-0.5 bottom-0.5 bg-white rounded-full transition-all duration-200;
}

.toggle-input:checked + .toggle-slider {
  @apply bg-blue-600;
}

.toggle-input:checked + .toggle-slider:before {
  @apply transform translate-x-6;
}

.toggle-slider:hover {
  @apply shadow-md;
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
</style> 