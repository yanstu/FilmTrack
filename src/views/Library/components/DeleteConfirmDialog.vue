<template>
  <div 
    v-if="show" 
    class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
  >
    <div class="bg-white rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl">
      <h3 class="text-xl font-bold text-gray-900 mb-4">确认删除</h3>
      <p class="text-gray-700 mb-6">
        您确定要删除选中的 {{ selectedCount }} 个影视作品吗？此操作无法撤销。
      </p>
      <div class="mb-4">
        <input 
          :value="confirmInput"
          @input="$emit('update:confirmInput', ($event.target as HTMLInputElement).value)"
          type="text"
          placeholder="输入 y 确认删除"
          class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div class="flex justify-end space-x-4">
        <button 
          @click="$emit('cancel')"
          class="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
        >
          取消
        </button>
        <button 
          @click="$emit('confirm')"
          :disabled="confirmInput !== 'y'"
          class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          删除
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  show: boolean;
  selectedCount: number;
  confirmInput: string;
}

interface Emits {
  (e: 'update:confirmInput', value: string): void;
  (e: 'cancel'): void;
  (e: 'confirm'): void;
}

defineProps<Props>();
defineEmits<Emits>();
</script>
