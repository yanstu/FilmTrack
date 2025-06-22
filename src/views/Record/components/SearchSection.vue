<template>
  <div class="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-200/50 mb-6 animate-fade-in-up" style="animation-delay: 100ms;">
    <h2 class="text-lg font-semibold text-gray-900 mb-4 flex items-center">
      <SearchIcon :size="20" class="mr-2 text-purple-600" />
      搜索影视作品
    </h2>
    
    <div class="relative">
      <input
        :value="searchQuery"
        @input="$emit('update:searchQuery', ($event.target as HTMLInputElement).value)"
        @keydown.enter="$emit('selectFirst')"
        type="text"
        placeholder="搜索电影或电视剧，支持中英文..."
        class="w-full px-4 py-3 pl-12 rounded-xl bg-white/80 backdrop-blur-sm 
               border border-gray-200/50 text-gray-900 placeholder-gray-500
               focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100
               hover:border-gray-300/70 hover:bg-white/90 transition-all duration-200"
      />
      <SearchIcon :size="20" class="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
      
      <!-- 搜索快捷提示 -->
      <div v-if="!searchQuery && showSearchTips" 
           class="absolute z-50 w-full mt-1 bg-white rounded-xl shadow-lg border border-gray-200 p-4">
        <p class="text-sm text-gray-600 mb-2">搜索提示：</p>
        <ul class="text-xs text-gray-500 space-y-1">
          <li>• 支持中文名称：如"流浪地球"、"星际穿越"</li>
          <li>• 支持英文原名：如"Interstellar"、"Avatar"</li>
          <li>• 支持年份搜索：如"2023电影"</li>
          <li>• 按回车键选择第一个结果</li>
        </ul>
      </div>
    </div>
          
    <!-- 搜索状态提示 -->
    <div v-if="loading" class="mt-4 p-4 rounded-xl bg-blue-50/60 border border-blue-200/50">
      <div class="flex items-center text-blue-600">
        <svg class="animate-spin -ml-1 mr-3 h-5 w-5" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        正在搜索影视作品...
      </div>
    </div>
    
    <!-- 无搜索结果提示 -->
    <div v-else-if="searchQuery && !loading && results.length === 0" class="mt-4 p-4 rounded-xl bg-gray-50/60 border border-gray-200/50">
      <div class="text-center text-gray-500">
        <SearchIcon :size="24" class="mx-auto mb-2 text-gray-400" />
        <p>未找到相关影视作品</p>
        <p class="text-sm mt-1">请尝试使用不同的关键词搜索</p>
      </div>
    </div>
          
    <!-- 搜索结果 -->
    <SearchResults
      v-if="results.length > 0"
      :results="results"
      :get-image-url="getImageUrl"
      :is-already-added="isAlreadyAdded"
      @result-click="$emit('resultClick', $event)"
    />
  </div>
</template>

<script setup lang="ts">
import { Search as SearchIcon } from 'lucide-vue-next';
import SearchResults from './SearchResults.vue';
import type { TMDbMovie } from '../../../types';

interface Props {
  searchQuery: string;
  results: TMDbMovie[];
  loading: boolean;
  showSearchTips: boolean;
  getImageUrl: (path: string | null) => string;
  isAlreadyAdded: (result: TMDbMovie) => boolean;
}

interface Emits {
  (e: 'update:searchQuery', value: string): void;
  (e: 'selectFirst'): void;
  (e: 'resultClick', result: TMDbMovie): void;
}

defineProps<Props>();
defineEmits<Emits>();
</script>
