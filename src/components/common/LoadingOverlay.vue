<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
    <div class="bg-white rounded-2xl p-8 shadow-apple-xl max-w-sm w-full mx-4">
      <div class="flex flex-col items-center space-y-4">
        <!-- 加载动画 -->
        <div class="relative">
          <div class="w-12 h-12 border-4 border-gray-200 rounded-full animate-spin border-t-blue-600"></div>
          <div class="absolute inset-0 w-12 h-12 border-4 border-transparent rounded-full animate-ping border-t-blue-300"></div>
        </div>
        
        <!-- 加载文字 -->
        <div class="text-center">
          <h3 class="text-lg font-semibold text-gray-900 mb-1">{{ title }}</h3>
          <p class="text-sm text-gray-600">{{ message }}</p>
        </div>
        
        <!-- 进度条 (可选) -->
        <div v-if="showProgress" class="w-full">
          <div class="w-full bg-gray-200 rounded-full h-2">
            <div 
              class="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
              :style="{ width: `${progress}%` }"
            ></div>
          </div>
          <p class="text-xs text-gray-500 mt-2 text-center">{{ progress }}%</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  title?: string;
  message?: string;
  showProgress?: boolean;
  progress?: number;
}

withDefaults(defineProps<Props>(), {
  title: '加载中',
  message: '请稍候...',
  showProgress: false,
  progress: 0
});
</script>

<style scoped>
/* 入场动画 */
.fixed {
  animation: fadeIn 0.3s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    backdrop-filter: blur(0px);
  }
  to {
    opacity: 1;
    backdrop-filter: blur(4px);
  }
}

/* 加载动画优化 */
.animate-spin {
  animation: spin 1s linear infinite;
}

.animate-ping {
  animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes ping {
  75%, 100% {
    transform: scale(1.1);
    opacity: 0;
  }
}
</style> 