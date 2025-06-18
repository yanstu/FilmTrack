<template>
  <div class="relative">
    <input
      :value="modelValue"
      @input="handleInput"
      type="date"
      :placeholder="placeholder"
      class="w-full bg-white/80 backdrop-blur-sm border border-gray-200 rounded-xl px-4 py-3 
             text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 
             transition-all duration-200 hover:bg-white/90 hover:border-gray-300
             [&::-webkit-calendar-picker-indicator]:cursor-pointer 
             [&::-webkit-calendar-picker-indicator]:opacity-60 
             [&::-webkit-calendar-picker-indicator]:hover:opacity-100 
             [&::-webkit-calendar-picker-indicator]:transition-opacity 
             [&::-webkit-calendar-picker-indicator]:duration-200"
    />
    <div class="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
      <CalendarIcon class="h-5 w-5 text-gray-400" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { CalendarIcon } from '@heroicons/vue/24/outline';

interface Props {
  modelValue: string;
  placeholder?: string;
}

interface Emits {
  (e: 'update:modelValue', value: string): void;
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: '选择日期'
});

const emit = defineEmits<Emits>();

const handleInput = (event: Event) => {
  const target = event.target as HTMLInputElement;
  emit('update:modelValue', target.value);
};
</script> 