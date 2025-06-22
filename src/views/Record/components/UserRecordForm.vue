<template>
  <div v-if="form.tmdb_id" class="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-200/50 mb-8 animate-fade-in-up" style="animation-delay: 300ms;">
    <h2 class="text-lg font-semibold text-gray-900 mb-4 flex items-center">
      <ClipboardIcon :size="20" class="mr-2 text-green-600" />
      用户记录
    </h2>
    
    <div class="space-y-6">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">观看状态</label>
          <HeadlessSelect
            :model-value="form.status"
            @update:model-value="$emit('update:status', $event)"
            :options="statusOptions"
            placeholder="选择观看状态"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">个人评分</label>
          <div class="flex items-center h-[48px] px-4 py-3 rounded-xl bg-white/80 backdrop-blur-sm border border-gray-200/50">
            <StarRating
              :model-value="form.personal_rating"
              @update:model-value="$emit('update:personalRating', $event)"
              :allow-half="true"
              :show-value="true"
              :show-reset="false"
              :size="20"
            />
          </div>
        </div>
      </div>

      <!-- 集数记录（仅电视剧时显示） -->
      <div v-if="form.type === 'tv'" class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">当前季数</label>
          <input
            :value="form.current_season"
            @input="$emit('update:currentSeason', parseInt(($event.target as HTMLInputElement).value) || 1)"
            type="number"
            min="1"
            :max="form.total_seasons || 999"
            placeholder="1"
            class="w-full px-4 py-3 rounded-xl bg-white/80 backdrop-blur-sm 
                   border border-gray-200/50 text-gray-900 placeholder-gray-500
                   focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100
                   hover:border-gray-300/70 hover:bg-white/90 transition-all duration-200"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">当前集数</label>
          <div class="flex space-x-2">
            <input
              :value="form.current_episode"
              @input="$emit('update:currentEpisode', parseInt(($event.target as HTMLInputElement).value) || 0)"
              type="number"
              min="0"
              :max="form.total_episodes || 999"
              placeholder="1"
              class="flex-1 px-4 py-3 rounded-xl bg-white/80 backdrop-blur-sm 
                     border border-gray-200/50 text-gray-900 placeholder-gray-500
                     focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100
                     hover:border-gray-300/70 hover:bg-white/90 transition-all duration-200"
            />
            <button
              v-if="form.total_episodes"
              @click="$emit('setToLastEpisode')"
              type="button"
              class="px-4 py-3 bg-white text-gray-500 rounded-xl hover:bg-gray-50 hover:text-gray-600 transition-colors text-sm whitespace-nowrap border border-gray-300 shadow-sm"
            >
              最后一集
            </button>
          </div>
        </div>
      </div>

      <!-- 观看源/平台 -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">观看源/平台</label>
        <input
          :value="form.watch_source"
          @input="$emit('update:watchSource', ($event.target as HTMLInputElement).value)"
          type="text"
          placeholder="如：Netflix、爱奇艺、电影院等"
          class="w-full px-4 py-3 rounded-xl bg-white/80 backdrop-blur-sm 
                 border border-gray-200/50 text-gray-900 placeholder-gray-500
                 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100
                 hover:border-gray-300/70 hover:bg-white/90 transition-all duration-200"
        />
      </div>

      <!-- 观看笔记 -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">观看笔记</label>
        <textarea
          :value="form.notes"
          @input="$emit('update:notes', ($event.target as HTMLTextAreaElement).value)"
          rows="4"
          placeholder="记录您的观看感受..."
          class="w-full px-4 py-3 rounded-xl bg-white/80 backdrop-blur-sm 
                 border border-gray-200/50 text-gray-900 placeholder-gray-500
                 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100
                 hover:border-gray-300/70 hover:bg-white/90 transition-all duration-200 resize-none"
        ></textarea>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Clipboard as ClipboardIcon } from 'lucide-vue-next';
import HeadlessSelect from '../../../components/ui/HeadlessSelect.vue';
import StarRating from '../../../components/ui/StarRating.vue';
import type { RecordForm, StatusOption } from '../types';

interface Props {
  form: RecordForm;
  statusOptions: StatusOption[];
}

interface Emits {
  (e: 'update:status', value: string): void;
  (e: 'update:personalRating', value: number): void;
  (e: 'update:currentSeason', value: number): void;
  (e: 'update:currentEpisode', value: number): void;
  (e: 'update:watchSource', value: string): void;
  (e: 'update:notes', value: string): void;
  (e: 'setToLastEpisode'): void;
}

defineProps<Props>();
defineEmits<Emits>();
</script>
