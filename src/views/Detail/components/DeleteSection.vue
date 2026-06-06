<template>
  <div class="card p-6 border-red-200">
    <button 
      @click="$emit('deleteRecord')"
      class="w-full flex items-center justify-center px-4 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors duration-200 font-medium"
    >
      <TrashIcon class="w-4 h-4 mr-2" />
      删除记录
    </button>
  </div>
</template>

<script setup lang="ts">
import { Trash as TrashIcon } from 'lucide-vue-next';
import type { DeleteSectionEmits } from '../types';

defineEmits<DeleteSectionEmits>();
</script>
