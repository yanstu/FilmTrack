<template>
  <div v-if="showButtons" class="flex justify-end items-center space-x-3 pt-4 border-t border-gray-200/50 animate-fade-in-up" style="animation-delay: 400ms;">
    <button
      @click="$emit('reset')"
      class="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 
             font-medium rounded-xl transition-colors duration-200"
    >
      重置
    </button>
    <button
      @click="$emit('submit')"
      :disabled="!canSubmit || isSubmitting"
      class="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 
             text-white font-medium rounded-xl transition-colors duration-200"
    >
      {{ isSubmitting ? '添加中...' : '添加记录' }}
    </button>
  </div>
</template>

<script setup lang="ts">
import type { ActionButtonsProps, ActionButtonsEmits } from '../types';

type Props = ActionButtonsProps;
type Emits = ActionButtonsEmits;

defineProps<Props>();
defineEmits<Emits>();
</script>
