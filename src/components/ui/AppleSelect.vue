<template>
  <div class="relative">
    <select
      :value="modelValue"
      @change="handleChange"
      class="apple-select w-full px-4 py-3 bg-white/90 backdrop-blur-sm border border-gray-200/50 
             rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/50 
             focus:border-blue-500/50 transition-all duration-200 appearance-none cursor-pointer
             hover:bg-white/95 hover:border-gray-300/50"
    >
      <option
        v-for="option in options"
        :key="option.value"
        :value="option.value"
        :disabled="option.disabled"
      >
        {{ option.label }}
      </option>
    </select>
    
    <!-- 自定义箭头 -->
    <div class="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
      <ChevronDownIcon :size="20" class="text-gray-400" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ChevronDown as ChevronDownIcon } from 'lucide-vue-next';

interface Option {
  value: string | number;
  label: string;
  disabled?: boolean;
}

interface Props {
  modelValue: string | number;
  options: Option[];
  placeholder?: string;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  'update:modelValue': [value: string | number];
  change: [value: string | number];
}>();

const handleChange = (event: Event) => {
  const target = event.target as HTMLSelectElement;
  const value = target.value;
  emit('update:modelValue', value);
  emit('change', value);
};
</script>

<style scoped>
.apple-select {
  background-image: none;
}

.apple-select::-ms-expand {
  display: none;
}
</style> 