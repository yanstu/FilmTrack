<template>
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
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { listen, UnlistenFn } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { useRouter } from 'vue-router';
import TitleBar from './components/common/TitleBar.vue';
import Navigation from './components/common/Navigation.vue';
import LoadingOverlay from './components/common/LoadingOverlay.vue';
import ErrorToast from './components/common/ErrorToast.vue';
import Modal from './components/ui/Modal.vue';
import { modalState, modalService } from './utils/modal';
import SettingsModal from './components/ui/SettingsModal.vue';
import { useMovieStore } from './stores/movie';

const router = useRouter();
let unlistenNavigate: UnlistenFn | null = null;

// 全局状态
const isGlobalLoading = ref(false);
const globalError = ref<string>('');

// 响应式状态
const isMinimized = ref(false);
const isMaximized = ref(false);

// 设置模态框
const settingsVisible = ref(false);

// 应用设置
const appSettings = ref({
  minimizeToTray: true
});

// 加载设置
const loadSettings = () => {
  const savedSettings = localStorage.getItem('filmtrack-settings');
  if (savedSettings) {
    try {
      appSettings.value = { ...appSettings.value, ...JSON.parse(savedSettings) };
    } catch (error) {
      console.error('加载设置失败:', error);
    }
  }
};

// 清除全局错误
const clearGlobalError = () => {
  globalError.value = '';
};

// 处理窗口事件
const handleWindowEvent = async () => {
  const appWindow = getCurrentWindow();
  
  // 监听窗口关闭事件
  await listen('tauri://close-requested', () => {
    // 根据设置决定是隐藏到托盘还是直接退出
    if (appSettings.value.minimizeToTray) {
    appWindow.hide();
    } else {
      appWindow.close();
    }
  });
  
  // 监听其他窗口事件
  await listen('tauri://window-created', () => {
    console.log('Window created');
  });
};

// 初始化应用
onMounted(async () => {
  try {
    // 加载设置
    loadSettings();
    
    // 初始化数据库连接
    await handleWindowEvent();
    console.log('FilmTrack 应用已启动');

    // 获取当前窗口实例
    const appWindow = getCurrentWindow();

    // 监听托盘导航事件
    unlistenNavigate = await listen('navigate-to-record', () => {
      router.push({ name: 'Record' });
    });

    // 禁用右键菜单
    document.addEventListener('contextmenu', (e) => {
      e.preventDefault();
    });

    // 禁用开发者工具和刷新快捷键（生产环境）
    document.addEventListener('keydown', (e) => {
      if (!import.meta.env.DEV) {
        // 禁用F12开发者工具
        if (e.key === 'F12') {
          e.preventDefault();
          return false;
        }
        
        // 禁用Ctrl+Shift+I (开发者工具)
        if (e.ctrlKey && e.shiftKey && e.key === 'I') {
          e.preventDefault();
          return false;
        }
        
        // 禁用Ctrl+Shift+J (控制台)
        if (e.ctrlKey && e.shiftKey && e.key === 'J') {
          e.preventDefault();
          return false;
        }
        
        // 禁用Ctrl+U (查看源代码)
        if (e.ctrlKey && e.key === 'u') {
          e.preventDefault();
          return false;
        }
        
        // 禁用F5和Ctrl+R (刷新)
        if (e.key === 'F5' || (e.ctrlKey && e.key === 'r')) {
          e.preventDefault();
          return false;
        }
        
        // 禁用Ctrl+Shift+C (元素选择器)
        if (e.ctrlKey && e.shiftKey && e.key === 'C') {
          e.preventDefault();
          return false;
        }
      }
    });
    
    // 监听窗口状态变化
    await listen('tauri://resize', async () => {
      isMaximized.value = await appWindow.isMaximized();
    });

    await listen('tauri://focus', () => {
      isMinimized.value = false;
    });

    await listen('tauri://blur', () => {
      // 窗口失去焦点时的处理
    });

    const movieStore = useMovieStore();
    await movieStore.fetchMovies();

    // 监听设置打开事件
    window.addEventListener('open-settings', () => {
      settingsVisible.value = true;
    });
  } catch (error) {
    console.error('应用初始化错误:', error);
    globalError.value = '应用初始化失败，请重启应用';
  }
});

// 清理
onUnmounted(() => {
  if (unlistenNavigate) {
    unlistenNavigate();
  }
});

// 处理设置保存
const handleSettingsSave = (settings: any) => {
  // 更新内存中的设置
  appSettings.value = { ...appSettings.value, ...settings };
  // 保存设置到本地存储
  localStorage.setItem('filmtrack-settings', JSON.stringify(settings));
  console.log('设置已保存:', settings);
};
</script>

<style scoped>
/* 页面切换动画 */
.page-enter-active,
.page-leave-active {
  transition: all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}

.page-enter-from {
  opacity: 0;
  transform: translateX(20px);
}

.page-leave-to {
  opacity: 0;
  transform: translateX(-20px);
}

/* 自定义滚动条 */
:deep(.scrollbar-apple) {
  scrollbar-width: thin;
  scrollbar-color: rgba(156, 163, 175, 0.5) transparent;
}

:deep(.scrollbar-apple::-webkit-scrollbar) {
  width: 6px;
}

:deep(.scrollbar-apple::-webkit-scrollbar-track) {
  background: transparent;
}

:deep(.scrollbar-apple::-webkit-scrollbar-thumb) {
  background: rgba(156, 163, 175, 0.5);
  border-radius: 3px;
}

:deep(.scrollbar-apple::-webkit-scrollbar-thumb:hover) {
  background: rgba(156, 163, 175, 0.7);
}
</style>