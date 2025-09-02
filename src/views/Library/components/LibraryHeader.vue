<template>
  <div class="sticky top-0 z-50 px-8 py-6 bg-white/90 backdrop-blur-lg border-b border-gray-200/30 animate-fade-in-down" style="animation-delay: 0ms;">
    <div class="w-full">
      <!-- 标题和批量操作 -->
      <div class="flex justify-between items-center mb-6">
        <h1 class="text-2xl font-bold text-gray-900">影视库</h1>
        
        <!-- 批量操作按钮 -->
        <div class="flex items-center space-x-3">
          <button
            v-if="!isSelectionMode"
            @click="$emit('enableSelection')"
            class="flex items-center px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
          >
            <CheckSquare :size="16" class="mr-2" />
            批量操作
          </button>
          
          <div v-else class="flex items-center space-x-3">
            <span class="text-sm text-gray-600">已选择 {{ selectedCount }} 项</span>
            
            <button
              @click="$emit('confirmDelete')"
              class="flex items-center px-3 py-2 rounded-lg bg-red-100 hover:bg-red-200 text-red-700 transition-colors"
              :disabled="selectedCount === 0"
            >
              <Trash2 :size="16" class="mr-2" />
              删除所选
            </button>
            
            <button
              @click="$emit('cancelSelection')"
              class="flex items-center px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
            >
              <X :size="16" class="mr-2" />
              取消
            </button>
          </div>
        </div>
      </div>
      
      <!-- 搜索和筛选区域 -->
      <div class="flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-4 w-full">
        <!-- 搜索输入框 -->
        <div class="relative flex-1 sm:max-w-md">
          <SearchIcon 
            :size="20" 
            class="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none z-10" 
          />
          <input
            :value="searchQuery"
            @input="$emit('update:searchQuery', ($event.target as HTMLInputElement).value)"
            type="text"
            placeholder="搜索影视作品标题，支持拼音首字母..."
            class="w-full pl-12 pr-4 py-3 rounded-xl bg-white/80 backdrop-blur-sm 
                   border border-gray-200/50 text-gray-900 placeholder-gray-500
                   focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100
                   hover:border-gray-300/70 hover:bg-white/90 transition-all duration-200"
          />
        </div>
        
        <!-- 筛选区域 -->
        <div class="flex items-center space-x-3 flex-shrink-0 relative z-50">
          <!-- 类型筛选 -->
          <div class="w-32">
            <HeadlessSelect
              :model-value="selectedType"
              @update:model-value="$emit('update:selectedType', $event)"
              :options="TYPE_OPTIONS"
              placeholder="类型"
            />
          </div>

          <!-- 状态筛选 -->
          <div class="w-32">
            <HeadlessSelect
              :model-value="selectedStatus"
              @update:model-value="$emit('update:selectedStatus', $event)"
              :options="STATUS_OPTIONS"
              placeholder="状态"
            />
          </div>

          <!-- 视图切换 -->
          <div class="flex bg-gray-100/80 backdrop-blur-sm rounded-xl p-1">
            <button
              @click="$emit('changeViewMode', 'grid')"
              class="p-2 rounded-lg transition-all duration-200"
              :class="viewMode === 'grid' ? 'bg-white shadow-sm' : 'hover:bg-white/50'"
            >
              <GridIcon :size="18" class="text-gray-600" />
            </button>
            <button
              @click="$emit('changeViewMode', 'list')"
              class="p-2 rounded-lg transition-all duration-200"
              :class="viewMode === 'list' ? 'bg-white shadow-sm' : 'hover:bg-white/50'"
            >
              <ListIcon :size="18" class="text-gray-600" />
            </button>
          </div>
        </div>
      </div>

      <!-- 搜索统计 -->
      <div v-if="showSearchStats" class="mt-4">
        <p class="text-sm text-gray-600">
          找到 <span class="font-medium">{{ totalCount }}</span> 个结果
          <span v-if="searchQuery">关于 "<span class="font-medium">{{ searchQuery }}</span>"</span>
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { 
  Search as SearchIcon,
  Grid3x3 as GridIcon,
  List as ListIcon,
  CheckSquare,
  Trash2,
  X
} from 'lucide-vue-next';
import HeadlessSelect from '../../../components/ui/HeadlessSelect.vue';
import { STATUS_OPTIONS, TYPE_OPTIONS } from '../../../utils/constants';
import type { ViewMode } from '../types';

interface Props {
  searchQuery: string;
  selectedType: string;
  selectedStatus: string;
  viewMode: ViewMode;
  isSelectionMode: boolean;
  selectedCount: number;
  totalCount: number;
  showSearchStats: boolean;
}

interface Emits {
  (e: 'update:searchQuery', value: string): void;
  (e: 'update:selectedType', value: string | number): void;
  (e: 'update:selectedStatus', value: string | number): void;
  (e: 'changeViewMode', mode: ViewMode): void;
  (e: 'enableSelection'): void;
  (e: 'cancelSelection'): void;
  (e: 'confirmDelete'): void;
}

defineProps<Props>();
defineEmits<Emits>();
</script>
