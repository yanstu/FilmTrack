<template>
  <div class="flex items-center space-x-2">
    <div class="flex items-center space-x-1 relative">
      <button
        v-for="i in maxRating"
        :key="i"
        type="button"
        @click="!readonly && interactive ? setRating(i) : undefined"
        @mouseover="!readonly && interactive ? hoverRating = i : undefined"
        @mouseleave="!readonly && interactive ? hoverRating = 0 : undefined"
        :class="[
          'relative transition-transform duration-150',
          !readonly && interactive ? 'focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-1 rounded-sm hover:scale-125 active:scale-95 cursor-pointer' : 'cursor-default'
        ]"
        :style="{ width: `${size}px`, height: `${size}px` }"
        :disabled="readonly || !interactive"
      >
        <!-- 背景星星 -->
        <svg
          :width="size"
          :height="size"
          viewBox="0 0 24 24"
          class="text-gray-200 transition-colors duration-150"
          fill="currentColor"
        >
          <path d="M11.48 3.5a.563.563 0 011.04 0l2.125 5.11a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.562.562 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"/>
        </svg>
        
        <!-- 前景星星 -->
        <svg
          :width="size"
          :height="size"
          viewBox="0 0 24 24"
          :class="[
            'absolute top-0 left-0 transition-all duration-200 drop-shadow-[0_1px_2px_rgba(234,179,8,0.35)]',
            getStarClass(i)
          ]"
          :style="{ clipPath: getClipPath(i) }"
          fill="currentColor"
        >
          <path d="M11.48 3.5a.563.563 0 011.04 0l2.125 5.11a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.562.562 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"/>
        </svg>
      </button>
      
      <!-- 半星按钮（仅在允许半星时显示） -->
      <template v-if="allowHalf && !readonly && interactive">
        <button
          v-for="i in maxRating"
          :key="`half-${i}`"
          type="button"
          @click="setRating(i - 0.5)"
          @mouseover="hoverRating = i - 0.5"
          @mouseleave="hoverRating = 0"
          class="absolute focus:outline-none"
          :style="{ 
            left: `${(i - 1) * (size + 4)}px`,
            width: `${size / 2}px`, 
            height: `${size}px`,
            top: 0
          }"
        />
      </template>
    </div>
    
    <!-- 评分显示 -->
    <div v-if="showValue" class="flex items-center space-x-2">
      <span class="text-sm text-gray-600 font-medium min-w-[2.5rem]">
        {{ displayValue }}
      </span>
      
      <!-- 重置按钮 -->
    <div v-if="showReset && currentRating > 0 && !readonly && interactive" class="ml-2">
      <button
        type="button"
        @click="resetRating"
        class="text-gray-400 hover:text-gray-600 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-1 rounded-sm"
        title="重置评分"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M6.225 4.811a1 1 0 00-1.414 1.414L10.586 12 4.81 17.775a1 1 0 101.414 1.414L12 13.414l5.775 5.775a1 1 0 001.414-1.414L13.414 12l5.775-5.775a1 1 0 00-1.414-1.414L12 10.586 6.225 4.81z"/>
        </svg>
      </button>
    </div>
  </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

import type { StarRatingProps, StarRatingEmits } from './types';

type Props = StarRatingProps;
type Emits = StarRatingEmits;

const props = withDefaults(defineProps<Props>(), {
  allowHalf: false,
  showValue: false,
  showReset: false,
  size: 20,
  maxRating: 5,
  modelValue: 0,
  readonly: false,
  interactive: true
})

const emit = defineEmits<Emits>()

const hoverRating = ref(0)

const currentRating = computed(() => props.modelValue ?? 0)

const displayRating = computed(() => {
  return hoverRating.value || currentRating.value
})

const displayValue = computed(() => {
  const rating = currentRating.value
  if (rating === 0) return '暂无评分'
  return props.allowHalf ? rating.toFixed(1) : rating.toString()
})

const setRating = (rating: number) => {
  emit('update:modelValue', rating)
}

const resetRating = () => {
  emit('update:modelValue', 0)
}

const getStarClass = (index: number) => {
  const rating = displayRating.value
  
  if (rating >= index) {
    return 'text-amber-400'
  } else if (props.allowHalf && rating >= index - 0.5) {
    return 'text-amber-400'
  } else if (hoverRating.value >= index - 0.5 && hoverRating.value < index) {
    return 'text-amber-300'
  } else {
    return 'text-transparent'
  }
}

const getClipPath = (index: number) => {
  const rating = displayRating.value
  
  if (rating >= index) {
    return 'none'
  } else if (props.allowHalf && rating >= index - 0.5) {
    return 'polygon(0 0, 50% 0, 50% 100%, 0 100%)'
  } else {
    return 'none'
  }
}
</script>