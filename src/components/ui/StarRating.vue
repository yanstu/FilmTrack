<template>
  <div class="flex items-center space-x-2">
    <div class="flex items-center space-x-1 relative">
      <button
        v-for="i in maxRating"
        :key="i"
        type="button"
        @click="setRating(i)"
        @mouseover="hoverRating = i"
        @mouseleave="hoverRating = 0"
        class="relative focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-1 rounded-sm transition-all duration-150 hover:scale-110"
        :style="{ width: `${size}px`, height: `${size}px` }"
      >
        <!-- 背景星星 -->
        <svg
          :width="size"
          :height="size"
          viewBox="0 0 24 24"
          class="text-gray-200 transition-colors duration-150"
          fill="currentColor"
        >
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
        </svg>
        
        <!-- 前景星星 -->
        <svg
          :width="size"
          :height="size"
          viewBox="0 0 24 24"
          :class="[
            'absolute top-0 left-0 transition-all duration-200',
            getStarClass(i)
          ]"
          :style="{ clipPath: getClipPath(i) }"
          fill="currentColor"
        >
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
        </svg>
      </button>
      
      <!-- 半星按钮（仅在允许半星时显示） -->
      <template v-if="allowHalf">
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
      <button
        v-if="showReset && modelValue > 0"
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
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

interface Props {
  modelValue?: number | null | undefined
  allowHalf?: boolean
  showValue?: boolean
  showReset?: boolean
  size?: number
  maxRating?: number
}

interface Emits {
  (e: 'update:modelValue', value: number): void
}

const props = withDefaults(defineProps<Props>(), {
  allowHalf: false,
  showValue: false,
  showReset: false,
  size: 20,
  maxRating: 5,
  modelValue: 0
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
    return 'text-yellow-400'
  } else if (props.allowHalf && rating >= index - 0.5) {
    return 'text-yellow-400'
  } else if (hoverRating.value >= index - 0.5 && hoverRating.value < index) {
    return 'text-yellow-300'
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