<template>
  <div
    data-tauri-drag-region
    class="title-bar window-drag h-12 flex items-center justify-between bg-white/90 backdrop-blur-apple border-b border-gray-200"
    @contextmenu.prevent>
    <!-- 左侧：Logo和标题（macOS 在最左侧显示原生风格红绿灯控件） -->
    <div data-tauri-drag-region class="flex items-center space-x-3 px-4">
      <div v-if="isMac" class="traffic-lights flex items-center space-x-2 window-no-drag">
        <button type="button" class="traffic-light traffic-close" :title="getCloseButtonTitle()" @click="closeWindow">
          <span class="traffic-glyph">✕</span>
        </button>
        <button type="button" class="traffic-light traffic-min" title="最小化" @click="minimizeWindow">
          <span class="traffic-glyph">‒</span>
        </button>
        <button type="button" class="traffic-light traffic-zoom" title="缩放" @click="toggleMaximize">
          <span class="traffic-glyph">+</span>
        </button>
      </div>
      <div class="w-6 h-6 flex items-center justify-center window-no-drag" @dblclick="activateEasterEgg">
        <img src="/logo.png" alt="FilmTrackPro Logo" class="w-6 h-6 object-contain logo-spin"
          :class="{ 'active': easterEggActive }" />
      </div>
      <h1 data-tauri-drag-region class="text-lg font-semibold text-gray-900 gradient-text">{{ appTitle }}</h1>
    </div>

    <!-- 中间：Spotlight 风格的搜索/命令面板入口（让 ⌘K 被看见） -->
    <div data-tauri-drag-region class="flex-1 flex justify-center px-4">
      <button
        type="button"
        class="cmdk-trigger window-no-drag"
        :title="`搜索作品 / 页面 / 动作（${modKeyLabel}K）`"
        @click="openCommandPalette"
      >
        <SearchIcon class="cmdk-trigger-ico" />
        <span class="cmdk-trigger-text">
          <span class="cmdk-trigger-text-full">搜索作品 / 页面 / 动作…</span>
          <span class="cmdk-trigger-text-short">搜索…</span>
        </span>
        <span class="cmdk-trigger-kbd">
          <kbd>{{ modKeyLabel }}</kbd><kbd>K</kbd>
        </span>
      </button>
    </div>

    <!-- 右侧：设置按钮（两平台都显示）；最小化/关闭按钮仅在非 macOS 显示 -->
    <div class="flex items-center space-x-1 px-4 window-no-drag">
      <button @click="openSettings"
        class="w-8 h-8 flex items-center justify-center rounded-md hover:bg-gray-200/60 transition-colors duration-200"
        title="设置">
        <svg class="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </button>

      <template v-if="!isMac">
        <button @click="minimizeWindow"
          class="w-8 h-8 flex items-center justify-center rounded-md hover:bg-gray-200/60 transition-colors duration-200"
          title="最小化">
          <svg class="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4" />
          </svg>
        </button>

        <button @click="closeWindow"
          class="w-8 h-8 flex items-center justify-center rounded-md hover:bg-red-500/10 hover:text-red-600 transition-colors duration-200"
          :title="getCloseButtonTitle()">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onBeforeUnmount } from 'vue';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { invoke } from '@tauri-apps/api/core';
import { Search as SearchIcon } from 'lucide-vue-next';
import StorageService, { StorageKey } from '../../utils/storage';
import type { AppSettings } from '../../types';
import { mergeAppSettings } from '../../utils/appSettings';
import { isMacOS } from '../../utils/platform';

const appWindow = getCurrentWindow();

// 是否为 macOS（用于切换原生风格红绿灯控件布局）
const isMac = isMacOS();

// 应用标题
const appTitle = '影迹 Pro';

// 命令面板入口
const modKeyLabel = computed(() => (isMac ? '⌘' : 'Ctrl'));
const openCommandPalette = () => {
  window.dispatchEvent(new CustomEvent('open-command-palette'));
};

// 应用设置
const appSettings = ref<Pick<AppSettings, 'minimizeToTray'>>(mergeAppSettings());

// 彩蛋动画
const easterEggActive = ref(false);
const handleSettingsUpdated = () => {
  getAppSettings();
};

// 彩蛋激活函数
const activateEasterEgg = () => {
  easterEggActive.value = true;
  setTimeout(() => {
    easterEggActive.value = false;
  }, 1000);
};

// 加载设置
onMounted(() => {
  getAppSettings();

  // 监听设置变化
  window.addEventListener('settings-updated', handleSettingsUpdated);
});

onBeforeUnmount(() => {
  window.removeEventListener('settings-updated', handleSettingsUpdated);
});

// 获取应用设置
const getAppSettings = () => {
  const savedSettings = StorageService.get<Partial<AppSettings>>(StorageKey.SETTINGS);
  const mergedSettings = mergeAppSettings(savedSettings);
  appSettings.value.minimizeToTray = mergedSettings.minimizeToTray;
  return appSettings.value;
};

// 窗口控制方法
const minimizeWindow = async () => {
  try {
    // 保存窗口状态
    await invoke('save_window_state');
    await appWindow.minimize();
  } catch (error) {
    console.error('最小化窗口失败:', error);
  }
};

const toggleMaximize = async () => {
  try {
    await appWindow.toggleMaximize();
  } catch (error) {
    console.error('切换窗口缩放失败:', error);
  }
};

const openSettings = () => {
  // 触发全局事件来打开设置
  window.dispatchEvent(new CustomEvent('open-settings'));
};

const closeWindow = async () => {
  try {
    // 保存窗口状态
    await invoke('save_window_state');
    // 根据设置决定是隐藏到托盘还是直接退出
    if (appSettings.value.minimizeToTray) {
      await appWindow.hide();
    } else {
      await appWindow.close();
    }
  } catch (error) {
    console.error('关闭窗口失败:', error);
  }
};

const getCloseButtonTitle = () => {
  return appSettings.value.minimizeToTray ? '最小化到托盘' : '退出程序';
};
</script>

<style scoped>
.title-bar {
  -webkit-user-select: none;
  user-select: none;
  z-index: 1;
  background: white;
}

/* 搜索框聚焦动画 */
.search-input:focus {
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

/* 窗口控制按钮动画 */
button {
  transition: all 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}

button:active {
  transform: scale(0.95);
}

/* macOS 原生风格红绿灯窗口控件 */
.traffic-lights {
  margin-right: 4px;
}

.traffic-light {
  width: 13px;
  height: 13px;
  border-radius: 9999px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 0.5px solid rgba(0, 0, 0, 0.12);
  padding: 0;
  line-height: 1;
}

.traffic-light:active {
  transform: scale(0.92);
}

.traffic-close {
  background: #ff5f57;
}

.traffic-min {
  background: #febc2e;
}

.traffic-zoom {
  background: #28c840;
}

.traffic-glyph {
  font-size: 9px;
  font-weight: 700;
  color: rgba(0, 0, 0, 0.55);
  opacity: 0;
  transition: opacity 0.15s ease;
  pointer-events: none;
}

.traffic-lights:hover .traffic-glyph {
  opacity: 1;
}

/* 渐变文字效果 */
.gradient-text {
  background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

/* Logo彩蛋动画 */
.logo-spin {
  transition: transform 0.5s ease;
}

.logo-spin.active {
  animation: spin-bounce 1.5s ease-in-out;
}

@keyframes spin-bounce {
  0% {
    transform: rotate(0deg) scale(1);
  }

  20% {
    transform: rotate(180deg) scale(1.5);
  }

  40% {
    transform: rotate(360deg) scale(1);
  }

  60% {
    transform: rotate(540deg) scale(1.5);
  }

  80% {
    transform: rotate(720deg) scale(1);
  }

  100% {
    transform: rotate(720deg) scale(1);
  }
}

/* —— Spotlight 风格的命令面板入口（让 ⌘K 被看见） —— */
.cmdk-trigger {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  max-width: 380px;
  height: 28px;
  padding: 0 8px 0 10px;
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.04);
  border: 1px solid rgba(0, 0, 0, 0.05);
  color: #6b7280;
  cursor: pointer;
  transition: background 150ms ease, border-color 150ms ease, color 150ms ease;
}

.cmdk-trigger:hover {
  background: rgba(0, 0, 0, 0.06);
  border-color: rgba(0, 0, 0, 0.08);
  color: #374151;
}

.cmdk-trigger:active {
  transform: scale(0.98);
}

.cmdk-trigger-ico {
  width: 13px;
  height: 13px;
  flex-shrink: 0;
}

.cmdk-trigger-text {
  flex: 1;
  text-align: left;
  font-size: 12px;
  line-height: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cmdk-trigger-text-short {
  display: none;
}

/* 窗口较窄时只显示短文案 */
@media (max-width: 900px) {
  .cmdk-trigger-text-full {
    display: none;
  }
  .cmdk-trigger-text-short {
    display: inline;
  }
}

.cmdk-trigger-kbd {
  display: inline-flex;
  gap: 2px;
  flex-shrink: 0;
}

.cmdk-trigger-kbd kbd {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 4px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.85);
  border: 1px solid rgba(0, 0, 0, 0.08);
  font-family: ui-sans-serif, system-ui, -apple-system, sans-serif;
  font-size: 10px;
  font-weight: 600;
  color: #6b7280;
  line-height: 1;
}

/* 极窄窗口（< 640px）下，连搜索按钮的文字也藏起来，只露图标与 kbd，避免挤掉关闭按钮 */
@media (max-width: 640px) {
  .cmdk-trigger {
    width: auto;
    padding: 0 8px;
  }
  .cmdk-trigger-text {
    display: none;
  }
}
</style>
