<template>
  <div class="bg-white/80 backdrop-blur-sm rounded-xl border border-gray-200/50 p-6 animate-slide-in-right transition-all duration-300">
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-lg font-semibold text-gray-900 flex items-center">
        <svg class="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        重刷记录
        <span v-if="replayRecords.length > 0" class="ml-2 px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
          {{ replayRecords.length }}
        </span>
      </h3>
      <button 
        @click="addNewHistory" 
        class="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        :disabled="loading"
      >
        <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        添加记录
      </button>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="flex items-center justify-center py-8">
      <div class="w-6 h-6 border-2 border-gray-200 rounded-full animate-spin border-t-blue-600"></div>
      <span class="ml-2 text-gray-600">加载中...</span>
    </div>

    <!-- 空状态 - 简化显示 -->
    <div v-else-if="replayRecords.length === 0" class="text-center py-2">
      <p class="text-gray-400 text-xs">暂无重刷记录</p>
    </div>

    <!-- 重刷记录列表 -->
    <div v-else class="space-y-2">
      <div 
        v-for="history in sortedHistory" 
        :key="history.id"
        class="group bg-gradient-to-r from-white to-gray-50/30 border border-gray-100 rounded-xl p-3 hover:border-blue-200 hover:bg-gradient-to-r hover:from-blue-50/30 hover:to-white transition-all duration-300 hover:scale-[1.01]"
      >
        <!-- 现代化布局 -->
        <div class="flex items-center justify-between">
          <!-- 左侧：日期标签 -->
          <div class="flex items-center space-x-3">
            <div class="bg-blue-100 text-blue-700 px-2 py-1 rounded-lg text-xs font-medium">
              {{ formatDate(history.watched_date) }}
            </div>
            
            <!-- 评分 -->
            <div v-if="history.rating" class="flex items-center">
              <StarRating
                :model-value="history.rating"
                :readonly="true"
                :size="16"
                :max-rating="5"
                :show-value="false"
                :interactive="false"
              />
            </div>
          </div>

          <!-- 右侧操作按钮 -->
          <div class="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <button 
              @click="editHistory(history)"
              class="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200"
              title="编辑记录"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button 
              @click="deleteHistory(history.id)"
              class="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
              title="删除记录"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
        
        <!-- 笔记区域 - 现代化设计 -->
        <div v-if="history.notes" class="mt-3 pt-3 border-t border-gray-100">
          <div class="bg-gradient-to-r from-gray-50 to-transparent rounded-lg p-3 border-l-3 border-blue-300">
            <p class="text-sm text-gray-700 leading-relaxed">{{ history.notes }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- 重刷记录编辑模态框 -->
    <Teleport to="body">
      <div v-if="showEditModal" class="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[9999] animate-fade-in p-4" style="margin: 0; padding: 16px;">
        <div class="bg-white rounded-2xl border border-gray-200/50 max-w-md w-full ring-1 ring-black/5 max-h-[90vh] overflow-y-auto transform transition-all duration-300 scale-100">
        <div class="p-6">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-semibold text-gray-900">
              {{ editingHistory ? '编辑重刷记录' : '添加重刷记录' }}
            </h3>
            <button 
              @click="closeEditModal" 
              class="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all duration-200 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-1"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form @submit.prevent="saveHistory" class="space-y-4">
            <!-- 重刷日期 -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">重刷日期</label>
              <DateField
                v-model="historyForm.watched_date"
                :max="new Date().toISOString().split('T')[0]"
                :invalid="Boolean(historyDateError)"
              />
              <p v-if="historyDateError" class="mt-2 text-sm text-red-600">
                {{ historyDateError }}
              </p>
            </div>

            <!-- 评分 -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">评分 (可选)</label>
              <StarRating
                v-model="historyForm.rating"
                :allow-half="true"
                :show-value="true"
                :show-reset="true"
                :size="24"
                :max-rating="5"
              />
            </div>

            <!-- 观看笔记 -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">重刷笔记 (可选)</label>
              <TextAreaField
                v-model="historyForm.notes"
                :rows="3"
                placeholder="记录重刷感受、重要情节等..."
              />
            </div>

            <!-- 按钮 -->
            <div class="flex justify-end space-x-3 pt-4">
              <button 
                type="button" 
                @click="closeEditModal"
                class="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-all duration-200 hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
              >
                取消
              </button>
              <button 
                type="submit" 
                class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all duration-200 hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                :disabled="saving"
              >
                {{ saving ? '保存中...' : '保存' }}
              </button>
            </div>
          </form>
        </div>
        </div>
      </div>
    </Teleport>

    <!-- 删除确认弹窗 -->
    <Teleport to="body">
      <DeleteConfirmDialog
        :show="showDeleteConfirm"
        :selected-count="1"
        :confirm-input="deleteConfirmInput"
        @update:confirmInput="deleteConfirmInput = $event"
        @cancel="cancelDelete"
        @confirm="confirmDelete"
      />
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useAppStore } from '../../../stores/app';
import { useMovieStore } from '../../../stores/movie';
import { formatDate } from '../../../utils/constants';
import DateField from '../../../components/ui/DateField.vue';
import StarRating from '../../../components/ui/StarRating.vue';
import TextAreaField from '../../../components/ui/TextAreaField.vue';
import DeleteConfirmDialog from '../../Library/components/DeleteConfirmDialog.vue';
import type { Movie, ReplayRecord } from '../../../types';
import type { ReplayRecordSectionProps } from '../types';

const props = defineProps<ReplayRecordSectionProps>();
const movieStore = useMovieStore();
const appStore = useAppStore();

// 状态管理
const loading = ref(false);
const saving = ref(false);
const replayRecords = ref<ReplayRecord[]>([]);
const showEditModal = ref(false);
const editingHistory = ref<ReplayRecord | null>(null);

// 删除确认弹窗状态
const showDeleteConfirm = ref(false);
const deleteConfirmInput = ref('');
const deletingHistoryId = ref<string | null>(null);

// 表单数据
const historyForm = ref({
  watched_date: new Date().toISOString().split('T')[0],
  rating: undefined as number | undefined,
  notes: ''
});
const historyDateError = ref('');

// 计算属性
const sortedHistory = computed(() => {
  return [...replayRecords.value].sort((a, b) => 
    new Date(b.watched_date).getTime() - new Date(a.watched_date).getTime()
  );
});

// 方法
const loadReplayRecords = async () => {
  if (!props.movie.id) return;
  
  loading.value = true;
  try {
    const response = await movieStore.getMovieReplayRecords(props.movie.id.toString());
    if (response.success && response.data) {
      replayRecords.value = response.data;
    }
  } catch (error) {
    console.error('加载观看历史失败:', error);
  } finally {
    loading.value = false;
  }
};

const addNewHistory = () => {
  editingHistory.value = null;
  historyDateError.value = '';
  historyForm.value = {
    watched_date: new Date().toISOString().split('T')[0],
    rating: undefined,
    notes: ''
  };
  showEditModal.value = true;
};

const editHistory = (history: ReplayRecord) => {
  editingHistory.value = history;
  historyDateError.value = '';
  historyForm.value = {
    watched_date: history.watched_date || history.watch_date,
    rating: history.rating,
    notes: history.notes || ''
  };
  showEditModal.value = true;
};

const closeEditModal = () => {
  showEditModal.value = false;
  editingHistory.value = null;
  historyDateError.value = '';
};

const saveHistory = async () => {
  if (!props.movie.id) return;
  
  // 校验观看日期不能大于当前日期
  const currentDate = new Date().toISOString().split('T')[0];
  if (historyForm.value.watched_date > currentDate) {
    historyDateError.value = '重刷日期不能晚于今天';
    appStore.modalService.showInfo('日期有误', '重刷日期不能晚于今天');
    return;
  }

  historyDateError.value = '';
  
  saving.value = true;
  try {
    const historyData = {
      movie_id: props.movie.id.toString(),
      watch_date: historyForm.value.watched_date, // 修正字段名：数据库使用watch_date
      duration: 0, // 默认观看时长
      progress: 1.0, // 默认观看进度为完成
      rating: historyForm.value.rating || undefined,
      notes: historyForm.value.notes || undefined
    };

    if (editingHistory.value) {
      // 更新现有记录
      await movieStore.updateReplayRecord({
        ...editingHistory.value,
        ...historyData
      });
    } else {
      // 添加新记录
      await movieStore.addReplayRecord(historyData);
    }

    // 重新加载观看历史
    await loadReplayRecords();
    
    closeEditModal();
  } catch (error) {
    console.error('保存观看历史失败:', error);
  } finally {
    saving.value = false;
  }
};

const deleteHistory = (historyId: string) => {
  deletingHistoryId.value = historyId;
  showDeleteConfirm.value = true;
  deleteConfirmInput.value = '';
};

const cancelDelete = () => {
  showDeleteConfirm.value = false;
  deleteConfirmInput.value = '';
  deletingHistoryId.value = null;
};

const confirmDelete = async () => {
  if (!deletingHistoryId.value || deleteConfirmInput.value !== 'y') return;
  
  try {
    await movieStore.deleteReplayRecord(deletingHistoryId.value);
    await loadReplayRecords();
    showDeleteConfirm.value = false;
    deleteConfirmInput.value = '';
    deletingHistoryId.value = null;
  } catch (error) {
    console.error('删除观看历史失败:', error);
  }
};

// 生命周期
onMounted(() => {
  loadReplayRecords();
});
</script>

<style scoped>
/* 动画效果 */
.animate-slide-in-right {
  animation: slideInRight 0.3s ease-out;
}

.animate-fade-in {
  animation: fadeIn 0.2s ease-out;
}

@keyframes slideInRight {
  from {
    opacity: 0;
    transform: translateX(20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
</style>
