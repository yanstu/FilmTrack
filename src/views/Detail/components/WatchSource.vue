<template>
  <div class="mt-2">
    <span class="text-sm text-gray-300">观看平台：</span>
    <div class="inline-flex items-center">
      <LinkIcon v-if="isValidUrl(watchSource)" class="w-4 h-4 text-white mr-1" />
      <a 
        v-if="isValidUrl(watchSource)" 
        @click="$emit('openLink', watchSource)"
        class="text-white font-medium hover:text-blue-300 transition-colors cursor-pointer"
      >
        {{ watchSource }}
      </a>
      <span v-else class="text-white font-medium">{{ watchSource }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Link as LinkIcon } from 'lucide-vue-next';
import type { WatchSourceProps, WatchSourceEmits } from '../types';

defineProps<WatchSourceProps>();
defineEmits<WatchSourceEmits>();
</script>
