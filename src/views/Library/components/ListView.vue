<template>
  <div class="space-y-4">
    <div
      v-for="movie in movies"
      :key="movie.id"
      class="bg-white/90 rounded-2xl p-6 border border-gray-200/50
             hover:bg-white hover:border-gray-300/50 transition-colors duration-200
             hover:shadow-md"
      style="transform: none; will-change: auto; isolation: auto;"
      :class="{'cursor-pointer': !isSelectionMode, 'border-blue-500 bg-blue-50/50': isItemSelected(movie.id)}"
      @click="handleItemClick(movie.id)"
    >
      <div class="flex items-start space-x-4">
        <!-- 选择框 -->
        <div v-if="isSelectionMode" class="flex-shrink-0 pt-2">
          <div 
            class="w-6 h-6 rounded-full flex items-center justify-center"
            :class="isItemSelected(movie.id) ? 'bg-blue-500' : 'bg-white/80 border border-gray-300'"
          >
            <CheckIcon v-if="isItemSelected(movie.id)" :size="14" class="text-white" />
          </div>
        </div>
        
        <!-- 海报 -->
        <div class="overflow-hidden rounded-xl">
          <CachedImage
            :src="getImageURL(movie.poster_path)"
            :alt="movie.title"
            class-name="w-20 h-30 object-cover shadow-sm transition-transform duration-300 hover:scale-110"
            fallback="/placeholder-poster.svg"
          />
        </div>
        
        <!-- 内容信息 -->
        <div class="flex-1">
          <div class="flex items-start justify-between">
            <div>
              <h3 class="text-lg font-semibold text-gray-900">{{ movie.title }}</h3>
              <p class="text-gray-600 text-sm mt-1">{{ movie.original_title }}</p>
              <div class="flex items-center space-x-4 mt-2">
                <span class="text-sm text-gray-500">{{ movie.year }}</span>
                <span class="text-sm text-gray-500">{{ getTypeLabel(movie.type) }}</span>
                <div v-if="movie.user_rating" class="flex items-center space-x-1">
                  <StarIcon :size="14" class="text-yellow-400 fill-yellow-400" />
                  <span class="text-sm text-gray-600">{{ movie.user_rating }}/5</span>
                </div>
              </div>
            </div>
            
            <!-- 状态标签 -->
            <span
              class="px-3 py-1 rounded-full text-xs font-medium"
              :class="getStatusBadgeClass(movie.status)"
            >
              {{ getStatusLabel(movie.status) }}
            </span>
          </div>
          
          <!-- 简介 -->
          <p v-if="movie.overview" class="text-gray-700 text-sm mt-3 line-clamp-2">
            {{ movie.overview }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Check as CheckIcon, Star as StarIcon } from 'lucide-vue-next';
import CachedImage from '../../../components/ui/CachedImage.vue';
import { getStatusLabel, getStatusBadgeClass, getTypeLabel } from '../../../utils/constants';
import type { MovieRecord } from '../types';

interface Props {
  movies: MovieRecord[];
  isSelectionMode: boolean;
  isItemSelected: (id: string) => boolean;
  getImageURL: (path: string | undefined) => string;
}

interface Emits {
  (e: 'itemClick', id: string): void;
  (e: 'toggleSelect', id: string): void;
  (e: 'navigateToDetail', id: string): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const handleItemClick = (id: string) => {
  if (props.isSelectionMode) {
    emit('toggleSelect', id);
  } else {
    emit('navigateToDetail', id);
  }
};
</script>
