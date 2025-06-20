<template>
  <div class="h-full overflow-auto bg-gradient-to-br from-blue-50/50 via-white to-purple-50/50">
    <div class="max-w-4xl mx-auto p-6">
      <!-- 页面标题 -->
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-gray-900 mb-2">数据导入导出</h1>
        <p class="text-gray-600">从豆瓣导入影视记录，或备份/恢复您的数据</p>
      </div>
      
      <!-- 豆瓣导入面板 -->
      <DoubanImportPanel />
      
      <!-- 备份和恢复面板 -->
      <FileOperationsPanel />
      
      <!-- 提示信息 -->
      <ImportNotice />
    </div>
  </div>
</template>

<script setup lang="ts">
import DoubanImportPanel from './components/DoubanImportPanel.vue';
import FileOperationsPanel from './components/FileOperationsPanel.vue';
import ImportNotice from './components/ImportNotice.vue';
</script> 