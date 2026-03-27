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
          <HeadlessSelect
            :model-value="form.current_season"
            @update:model-value="$emit('update:currentSeason', $event)"
            :options="seasonOptions"
            placeholder="选择季数"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">当前集数</label>
          <div class="flex space-x-2">
            <TextField
              :model-value="form.current_episode"
              type="number"
              input-mode="numeric"
              min="1"
              :max="currentSeasonMaxEpisodes"
              placeholder="1"
              class="flex-1"
              @update:model-value="handleEpisodeValueChange"
            />
            <button
              v-if="currentSeasonMaxEpisodes > 0"
              @click="$emit('setToLastEpisode')"
              type="button"
              class="px-4 py-3 bg-white text-gray-500 rounded-xl hover:bg-gray-50 hover:text-gray-600 transition-colors text-sm whitespace-nowrap border border-gray-300 shadow-sm"
            >
              最后一集
            </button>
          </div>
        </div>
      </div>

      <!-- 观看时间和观看源 -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            观看时间 <span class="text-red-500">*</span>
          </label>
          <DateField
            :model-value="form.watched_date"
            @update:model-value="$emit('update:watchedDate', $event)"
            :max="new Date().toISOString().split('T')[0]"
            :invalid="Boolean(dateError)"
          />
          <!-- 日期错误提示 -->
          <div v-if="dateError" class="mt-1 text-sm text-red-600 flex items-center">
            <svg class="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
            </svg>
            {{ dateError }}
          </div>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">观看源/平台</label>
          <TextField
            :model-value="form.watch_source"
            placeholder="如：Netflix、爱奇艺、电影院等"
            @update:model-value="$emit('update:watchSource', $event)"
          />
        </div>
      </div>

      <!-- 观看笔记 -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">观看笔记</label>
        <TextAreaField
          :model-value="form.notes"
          @update:model-value="$emit('update:notes', $event)"
          :rows="4"
          placeholder="记录您的观看感受..."
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Clipboard as ClipboardIcon } from 'lucide-vue-next';
import DateField from '../../../components/ui/DateField.vue';
import HeadlessSelect from '../../../components/ui/HeadlessSelect.vue';
import StarRating from '../../../components/ui/StarRating.vue';
import TextAreaField from '../../../components/ui/TextAreaField.vue';
import TextField from '../../../components/ui/TextField.vue';
import type { UserRecordFormProps, UserRecordFormEmits } from '../types';
import { useWatchRecordFields } from '../../../composables/useWatchRecordFields';

type Props = UserRecordFormProps;
type Emits = UserRecordFormEmits;

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const formRef = computed(() => props.form);

const {
  dateError,
  seasonOptions,
  currentSeasonMaxEpisodes,
  handleEpisodeValueChange
} = useWatchRecordFields(formRef, {
  onDateValidityChange: value => emit('update:dateValid', value),
  onEpisodeChange: value => emit('update:currentEpisode', value)
});
</script>
