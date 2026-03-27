<template>
  <div class="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-200/50 mb-8 transform transition-all duration-300 hover:shadow-md animate-card-appear">
    <!-- 导入表单 -->
    <div v-if="!hasImportSession">
      <h2 class="text-lg font-semibold text-gray-900 mb-4 flex items-center">
        <ImportIcon class="mr-2 w-5 h-5 text-blue-600 animate-bounce-subtle" />
        从豆瓣导入
      </h2>
      
        <div class="mb-6">
          <label for="douban-id" class="block text-sm font-medium text-gray-700 mb-1">豆瓣用户ID</label>
          <div class="flex">
            <div class="flex-1">
            <TextField
              v-model="doubanUserId"
              placeholder="203503302"
              :leading-icon="UserIcon"
              class="douban-user-field"
            />
            </div>
          <button
            @click="handleStartImport"
            class="inline-flex items-center justify-center rounded-r-xl border border-transparent bg-blue-600 py-3 px-5 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 hover:scale-105 hover:shadow-lg"
          >
            <PlayIcon class="w-4 h-4 mr-1" />
            开始导入
          </button>
        </div>
        <p class="mt-2 text-sm text-gray-500 flex items-center">
          <InfoIcon class="w-4 h-4 mr-1 text-gray-400" />
          个人主页链接里就能看到，例如：https://www.douban.com/people/<strong>203503302</strong>/
        </p>
      </div>
      
      <div class="bg-blue-50/60 p-4 rounded-xl border border-blue-100/50 hover:bg-blue-50/80 transition-colors duration-300">
        <h3 class="text-sm font-medium text-blue-800 mb-3 flex items-center">
          <AlertCircleIcon class="w-4 h-4 mr-1 animate-pulse" />
          导入前说明
        </h3>
        <ul class="text-xs text-blue-700 list-disc pl-5 space-y-1.5">
          <li class="hover:text-blue-800 transition-colors duration-200">导入时先别关闭应用；切出去再回来，进度还在</li>
          <li class="hover:text-blue-800 transition-colors duration-200">会自动去 TMDb 补齐海报、简介和季集信息</li>
          <li class="hover:text-blue-800 transition-colors duration-200">评分、观看日期、季数和短评会保留</li>
        </ul>
      </div>
    </div>
    
    <!-- 导入进度 -->
    <div v-else>
      <h2 class="text-lg font-semibold text-gray-900 mb-4 flex items-center">
        <LoaderIcon
          class="mr-2 w-5 h-5 text-blue-600"
          :class="{ 'animate-spin': isImporting }"
        />
        {{ isImporting ? '导入进度' : '最近一次导入结果' }}
      </h2>

      <div
        v-if="!isImporting"
        class="mb-4 rounded-xl border border-emerald-100 bg-emerald-50/80 px-4 py-3 text-sm text-emerald-700"
      >
        这次导入已经结束，结果会先留在这里。
      </div>

      <div
        v-if="pendingReviewCount > 0 || latestReviewItems.length > 0"
        class="mb-5 rounded-2xl border border-amber-200/80 bg-amber-50/80 p-4"
      >
        <div class="mb-3 flex items-start justify-between gap-4">
          <div>
            <h3 class="text-sm font-semibold text-amber-900">导入复核</h3>
            <p class="mt-1 text-xs leading-5 text-amber-700">
              跳过、失败和低分匹配的条目会先留在这里，点进去会直接带上搜索词。
            </p>
          </div>
          <div class="rounded-full bg-white/80 px-3 py-1 text-xs font-medium text-amber-800 shadow-sm">
            待处理 {{ pendingReviewCount }}
          </div>
        </div>

        <div class="space-y-2">
          <div
            v-for="item in latestReviewItems"
            :key="item.id"
            class="flex flex-col gap-3 rounded-xl border border-amber-100 bg-white/80 px-4 py-3 md:flex-row md:items-center md:justify-between"
          >
            <div class="min-w-0">
              <div class="flex flex-wrap items-center gap-2">
                <span class="text-sm font-medium text-gray-900">{{ item.title }}</span>
                <span class="rounded-full px-2 py-0.5 text-[11px] font-medium" :class="getReviewBadgeClass(item.category)">
                  {{ getReviewCategoryLabel(item.category) }}
                </span>
                <span v-if="typeof item.score === 'number'" class="text-[11px] text-gray-500">
                  匹配分 {{ item.score.toFixed(2) }}
                </span>
              </div>
              <p class="mt-1 text-xs text-gray-600">{{ item.reason }}</p>
              <p v-if="item.matchedTitle" class="mt-1 text-[11px] text-gray-500">
                当前匹配：{{ item.matchedTitle }}
              </p>
            </div>
            <div class="flex items-center justify-end gap-2">
              <button
                type="button"
                class="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-600 transition-colors duration-200 hover:border-gray-300 hover:text-gray-900"
                @click="markReviewResolved(item.id)"
              >
                标记已处理
              </button>
              <button
                type="button"
                class="rounded-lg bg-amber-500 px-3 py-2 text-xs font-medium text-white transition-colors duration-200 hover:bg-amber-600"
                @click="openReviewItem(item)"
              >
                {{ item.actionLabel }}
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <div class="mb-4">
        <div class="flex justify-between text-sm text-gray-600 mb-1">
          <span>总进度</span>
          <span>{{ importProgress.current }}/{{ importProgress.total }}</span>
        </div>
        <div class="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
          <div 
            class="bg-blue-600 h-2.5 rounded-full transition-all duration-300 progress-bar-animation" 
            :style="{ width: `${(importProgress.current / Math.max(importProgress.total, 1)) * 100}%` }"
          ></div>
        </div>
      </div>
      
      <div class="mb-4">
        <div class="flex justify-between text-sm text-gray-600 mb-1">
          <span>TMDb匹配</span>
          <span>{{ importProgress.matched }}/{{ importProgress.processed }}</span>
        </div>
        <div class="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
          <div 
            class="bg-green-500 h-2.5 rounded-full transition-all duration-300 progress-bar-animation" 
            :style="{ width: `${(importProgress.matched / Math.max(importProgress.processed, 1)) * 100}%` }"
          ></div>
        </div>
      </div>
      
      <!-- 日志 -->
      <div class="mt-6">
        <h3 class="text-sm font-medium text-gray-700 mb-2 flex items-center">
          <FileTextIcon class="w-4 h-4 mr-1 text-gray-500" />
          导入日志
        </h3>
        <div class="bg-gray-50/80 rounded-xl p-3 h-60 overflow-y-auto text-xs font-mono border border-gray-100/50 log-container">
          <div 
            v-for="(log, index) in importLogs" 
            :key="index" 
            class="py-1 border-b border-gray-100 last:border-0 flex items-start log-entry"
            :class="{
              'text-green-600': log.type === 'success',
              'text-red-600': log.type === 'error',
              'text-yellow-600': log.type === 'warning',
              'text-gray-600': log.type === 'info'
            }"
          >
            <span class="inline-block w-4 mr-1 flex-shrink-0">
              <CheckIcon v-if="log.type === 'success'" class="w-3 h-3" />
              <XIcon v-else-if="log.type === 'error'" class="w-3 h-3" />
              <AlertTriangleIcon v-else-if="log.type === 'warning'" class="w-3 h-3" />
              <InfoIcon v-else class="w-3 h-3" />
            </span>
            {{ log.message }}
          </div>
        </div>
        
        <div class="flex justify-center mt-4">
          <button 
            v-if="isImporting"
            @click="stopImport" 
            class="flex items-center px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-all duration-200 hover:scale-105 hover:shadow-md"
          >
            <StopCircleIcon class="w-4 h-4 mr-1" />
            停止导入
          </button>
          <button
            v-else
            @click="clearImportSession"
            class="flex items-center px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 hover:scale-105 hover:shadow-md"
          >
            <PlayIcon class="w-4 h-4 mr-1" />
            开始新的导入
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { watch } from 'vue';
import { useDoubanImport } from '../hooks/useDoubanImport';
import { useAppStore } from '../../../stores/app';
import type { ImportReviewCategory, ImportReviewItem } from '../../../types/import';
import TextField from '../../../components/ui/TextField.vue';
import { 
  User as UserIcon, 
  Import as ImportIcon, 
  Play as PlayIcon,
  Info as InfoIcon,
  AlertCircle as AlertCircleIcon,
  Loader as LoaderIcon,
  FileText as FileTextIcon,
  Check as CheckIcon,
  X as XIcon,
  AlertTriangle as AlertTriangleIcon,
  StopCircle as StopCircleIcon
} from 'lucide-vue-next';

const appStore = useAppStore();
const {
  doubanUserId,
  isImporting,
  hasImportSession,
  importProgress,
  importLogs,
  latestReviewItems,
  pendingReviewCount,
  startDoubanImport,
  stopImport,
  clearImportSession,
  openReviewItem,
} = useDoubanImport();

// 处理开始导入
const handleStartImport = () => {
  if (!doubanUserId.value.trim()) {
    appStore.modalService.showInfo('提示', '请输入豆瓣用户ID');
    return;
  }
  
  // 开始导入
  startDoubanImport();
};

const getReviewCategoryLabel = (category: ImportReviewCategory) => {
  const labels: Record<ImportReviewCategory, string> = {
    skipped: '已跳过',
    failed: '导入失败',
    merged: '合并复核',
    matched: '匹配复核',
  };
  return labels[category];
};

const getReviewBadgeClass = (category: ImportReviewCategory) => {
  const classes: Record<ImportReviewCategory, string> = {
    skipped: 'bg-gray-100 text-gray-700',
    failed: 'bg-red-100 text-red-700',
    merged: 'bg-blue-100 text-blue-700',
    matched: 'bg-amber-100 text-amber-700',
  };
  return classes[category];
};

const markReviewResolved = (id: string) => {
  const target = latestReviewItems.value.find(item => item.id === id);
  if (target) {
    target.status = 'resolved';
  }
};

// 监听日志更新，自动滚动到底部
watch(importLogs, () => {
  setTimeout(() => {
    const logContainer = document.querySelector('.log-container');
    if (logContainer) {
      logContainer.scrollTop = logContainer.scrollHeight;
    }
  }, 50);
}, { deep: true, immediate: true });
</script>

<style scoped>
/* 自定义样式 */
@keyframes pulse-subtle {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
}

.animate-bounce-subtle {
  animation: bounce 2s infinite ease-in-out;
}

@keyframes bounce {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-3px);
  }
}

.animate-card-appear {
  animation: card-appear 0.3s ease-out;
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

.progress-bar-animation {
  background-image: linear-gradient(
    45deg,
    rgba(255, 255, 255, 0.15) 25%,
    transparent 25%,
    transparent 50%,
    rgba(255, 255, 255, 0.15) 50%,
    rgba(255, 255, 255, 0.15) 75%,
    transparent 75%,
    transparent
  );
  background-size: 1rem 1rem;
  animation: progress-bar-stripes 1s linear infinite;
}

@keyframes progress-bar-stripes {
  0% {
    background-position: 1rem 0;
  }
  100% {
    background-position: 0 0;
  }
}

.log-entry {
  animation: fade-in 0.3s ease-in-out;
}

.douban-user-field :deep(.text-field) {
  border-top-right-radius: 0;
  border-bottom-right-radius: 0;
}

@keyframes fade-in {
  from {
    opacity: 0;
    transform: translateY(5px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style> 
