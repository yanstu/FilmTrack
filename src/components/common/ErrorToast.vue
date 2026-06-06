<template>
  <div class="fixed top-4 right-4 z-50 max-w-md">
    <div 
      class="bg-red-50 border border-red-200 rounded-lg p-4 shadow-apple-lg animate-slide-down"
      role="alert"
    >
      <div class="flex items-start">
        <!-- 错误图标 -->
        <div class="flex-shrink-0">
          <svg class="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/>
          </svg>
        </div>
        
        <!-- 错误内容 -->
        <div class="ml-3 flex-1">
          <h3 class="text-sm font-medium text-red-800">{{ title }}</h3>
          <div class="mt-1 text-sm text-red-700">{{ message }}</div>
        </div>
        
        <!-- 关闭按钮 -->
        <div class="ml-4 flex-shrink-0">
          <button
            type="button"
            @click="$emit('close')"
            class="inline-flex rounded-md bg-red-50 p-1.5 text-red-500 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-2 focus:ring-offset-red-50 transition-colors duration-200"
          >
            <span class="sr-only">关闭</span>
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  title?: string;
  message: string;
  autoClose?: boolean;
  duration?: number;
}

const props = withDefaults(defineProps<Props>(), {
  title: '错误',
  autoClose: true,
  duration: 5000
});

const emit = defineEmits<{
  close: []
}>();

// 自动关闭
if (props.autoClose) {
  setTimeout(() => {
    emit('close');
  }, props.duration);
}
</script>

<style scoped>
/* 滑入动画 */
.animate-slide-down {
  animation: slideDown 0.3s ease-out;
}

@keyframes slideDown {
  from {
    transform: translateY(-100%);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

/* 悬停效果 */
.bg-red-50:hover {
  background-color: rgba(254, 242, 242, 0.8);
}
</style> 