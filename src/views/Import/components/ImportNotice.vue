<template>
  <div class="bg-yellow-50/80 backdrop-blur-sm rounded-xl p-4 border border-yellow-200/50 animate-card-appear-delayed">
    <div class="flex">
      <div class="flex-shrink-0">
        <svg class="h-5 w-5 text-yellow-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
        </svg>
      </div>
      <div class="ml-3">
        <p class="text-sm text-yellow-800">
          导入前请注意：豆瓣导入的数据将根据标记日期设置创建和更新时间。导入可能需要一些时间，请保持应用处于运行状态。
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.animate-card-appear-delayed {
  animation: card-appear 0.3s ease-out 0.2s both;
}

@keyframes card-appear {
  0% {
    opacity: 0;
    transform: translateY(20px) scale(0.98);
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
</style>