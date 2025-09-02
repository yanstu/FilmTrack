<template>
  <div class="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-3 sm:gap-4 md:gap-6">
    <div
      v-for="movie in movies"
      :key="movie.id"
      class="group"
      :class="{'cursor-pointer': !isSelectionMode}"
      @click="handleItemClick(movie.id)"
    >
      <div 
        class="relative bg-white/90 rounded-2xl p-4 lg:p-4 md:p-3 border border-gray-200/50
               hover:bg-white hover:border-gray-300/50 transition-all duration-300
               hover:shadow-md"
        :class="{'border-blue-500 bg-blue-50/50': isItemSelected(movie.id)}"
        style="transform: none; will-change: auto; isolation: auto;"
      >
        <!-- 选择框 -->
        <div v-if="isSelectionMode" class="absolute top-2 right-2 z-10">
          <div 
            class="w-6 h-6 rounded-full flex items-center justify-center"
            :class="isItemSelected(movie.id) ? 'bg-blue-500' : 'bg-white/80 border border-gray-300'"
          >
            <CheckIcon v-if="isItemSelected(movie.id)" :size="14" class="text-white" />
          </div>
        </div>
        
        <!-- 海报 -->
        <div class="aspect-[2/3] mb-4 overflow-hidden rounded-xl">
          <CachedImage
            :src="getImageURL(movie.poster_path)"
            :alt="movie.title"
            class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            fallback="/placeholder-poster.svg"
          />
        </div>
        
        <!-- 标题和状态 -->
        <div class="flex items-center justify-between mb-2">
          <h3 class="font-semibold text-gray-900 line-clamp-2 flex-1 pr-2 text-[16px] lg:text-[16px] md:text-[13px]">{{ movie.title }}</h3>
          <span
            class="px-2 py-1 rounded-full font-medium flex-shrink-0 text-xs lg:text-xs md:text-[11px]"
            :class="getStatusBadgeClass(movie.status)"
          >
            {{ getStatusLabel(movie.status) }}
          </span>
        </div>
        
        <!-- 评分 -->
        <div v-if="movie.user_rating" class="flex items-center space-x-1">
          <StarIcon :size="14" class="text-yellow-400 fill-yellow-400" />
          <span class="text-sm text-gray-600">{{ movie.user_rating }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Check as CheckIcon, Star as StarIcon } from 'lucide-vue-next';
import CachedImage from '../../../components/ui/CachedImage.vue';
import { getStatusLabel, getStatusBadgeClass } from '../../../utils/constants';
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
