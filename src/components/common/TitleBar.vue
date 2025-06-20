<template>
  <div
    class="title-bar window-drag h-12 flex items-center justify-between bg-white/90 backdrop-blur-apple border-b border-gray-200"
    @contextmenu.prevent @dblclick.prevent>
    <!-- 左侧：Logo和标题 -->
    <div class="flex items-center space-x-3 px-4">
      <div class="w-6 h-6 flex items-center justify-center window-no-drag" @dblclick="activateEasterEgg">
        <img src="/logo.png" alt="FilmTrack Logo" class="w-6 h-6 object-contain logo-spin"
          :class="{ 'active': easterEggActive }" />
      </div>
      <h1 class="text-lg font-semibold text-gray-900 gradient-text">{{ appTitle }}</h1>
    </div>

    <!-- 中间：占位 -->
    <div class="flex-1"></div>

    <!-- 右侧：窗口控制按钮 -->
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
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { useAppStore } from '../../stores/app';
import StorageService, { StorageKey } from '../../utils/storage';

const appWindow = getCurrentWindow();

// 应用标题
const appTitle = 'FilmTrack';

// 应用设置
const appSettings = ref({
  minimizeToTray: true
});

// 彩蛋动画
const easterEggActive = ref(false);

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
  window.addEventListener('settings-updated', () => {
    getAppSettings();
  });
});

// 获取应用设置
const getAppSettings = () => {
  const savedSettings = StorageService.get(StorageKey.SETTINGS);
  if (savedSettings && typeof savedSettings === 'object') {
    if ('minimizeToTray' in savedSettings) {
      appSettings.value.minimizeToTray = savedSettings.minimizeToTray;
    }
  }
  return appSettings.value;
};

// 窗口控制方法
const minimizeWindow = async () => {
  try {
    await appWindow.minimize();
  } catch (error) {
    console.error('最小化窗口失败:', error);
  }
};

const openSettings = () => {
  // 触发全局事件来打开设置
  window.dispatchEvent(new CustomEvent('open-settings'));
};

const closeWindow = async () => {
  try {
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
</style>