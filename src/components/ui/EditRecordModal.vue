<template>
  <Modal
    :is-open="isOpen"
    type="info"
    title="编辑记录"
    message=""
    :show-cancel="true"
    :large="true"
    :confirm-disabled="!canSave"
    @close="handleClose"
    @confirm="handleSave"
    @cancel="handleClose"
    confirm-text="保存"
    cancel-text="取消"
  >
    <template #content>
      <div class="space-y-6">
        <!-- 观看状态 -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">观看状态</label>
          <HeadlessSelect
            v-model="localMovie.status"
            :options="statusOptions"
            placeholder="选择状态"
          />
        </div>

        <!-- 个人评分 -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">个人评分</label>
          <div class="flex items-center h-[48px] px-4 py-3 rounded-xl bg-white/80 backdrop-blur-sm border border-gray-200/50">
            <StarRating
              v-model="localMovie.personal_rating"
              :allow-half="true"
              :show-value="true"
              :show-reset="false"
              :size="20"
              :max="5"
            />
          </div>
        </div>

        <!-- 集数记录（仅电视剧时显示） -->
        <div v-if="localMovie.type === 'tv'" class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">当前季数</label>
            <HeadlessSelect
              v-model="localMovie.current_season"
              :options="seasonOptions"
              placeholder="选择季数"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">当前集数</label>
            <div class="flex space-x-2">
              <TextField
                :model-value="localMovie.current_episode"
                type="number"
                input-mode="numeric"
                min="1"
                :max="currentSeasonMaxEpisodes"
                class="flex-1"
                @update:model-value="handleEpisodeValueChange"
              />
              <button
                v-if="localMovie.type === 'tv' && currentSeasonMaxEpisodes > 0"
                @click="setToLastEpisode"
                class="px-3 py-3 bg-white text-gray-500 rounded-xl hover:bg-gray-50 hover:text-gray-600 transition-colors text-sm border border-gray-300 shadow-sm"
              >
                最后一集
              </button>
            </div>
          </div>
        </div>

        <!-- 观看时间和观看源 -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- 观看时间 -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">观看时间</label>
            <DateField
              v-model="localMovie.watched_date"
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
          
          <!-- 观看源/平台 -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">观看源/平台</label>
            <TextField
              v-model="localMovie.watch_source"
              placeholder="如：Netflix、爱奇艺、电影院等"
            />
          </div>
        </div>

        <!-- 观看笔记 -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">观看笔记</label>
          <TextAreaField
            v-model="localMovie.notes"
            :rows="4"
            placeholder="记录您的观看感受..."
          />
        </div>
      </div>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { ref, watch, computed, nextTick } from 'vue';
import { APP_CONFIG } from '../../../config/app.config';
import DateField from './DateField.vue';
import Modal from './Modal.vue';
import HeadlessSelect from './HeadlessSelect.vue';
import StarRating from './StarRating.vue';
import TextAreaField from './TextAreaField.vue';
import TextField from './TextField.vue';
import type { EditRecordModalProps, EditRecordModalEmits } from './types';
import type { Movie } from '../../types';
import { getNormalizedProgress, normalizeProgressForStatus } from '../../utils/seasonProgress';
import { useWatchRecordFields } from '../../composables/useWatchRecordFields';

type Props = EditRecordModalProps;
type Emits = EditRecordModalEmits;

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const localMovie = ref<Movie>({} as Movie);

// 下拉选项配置
const statusOptions = [
  ...Object.entries(APP_CONFIG.features.watchStatus).map(([key, label]) => ({
    value: key,
    label
  }))
];

const {
  dateError,
  seasonOptions,
  currentSeasonMaxEpisodes,
  validateWatchedDate,
  handleEpisodeValueChange,
  setToLastEpisode
} = useWatchRecordFields(localMovie);

// 检查是否可以保存
const canSave = computed(() => {
  return validateWatchedDate();
});

// 初始化电影数据，确保所有必需字段都有默认值
const initializeMovieData = (movie: Movie): Movie => {
  return {
    ...movie,
    // 确保状态字段有默认值
    status: movie.status || 'planned',
    // 确保评分字段有默认值
    personal_rating: movie.personal_rating ?? 0,
    // 确保观看日期字段有默认值，正确回显watched_date
    watched_date: movie.watched_date || new Date().toISOString().split('T')[0],
    // 确保其他可能缺失的字段有默认值
    current_season: getNormalizedProgress(movie).season,
    current_episode: getNormalizedProgress(movie).episode,
    watch_source: movie.watch_source || '',
    notes: movie.notes || '',
    watch_count: movie.watch_count || 0,
    genres: movie.genres || [],
    tags: movie.tags || []
  };
};

// 监听传入的电影数据变化
watch(() => props.movie, (newMovie) => {
  if (newMovie && props.isOpen) {
    nextTick(() => {
      localMovie.value = initializeMovieData(JSON.parse(JSON.stringify(newMovie)));
    });
  }
}, { immediate: true });

// 监听弹窗打开状态
watch(() => props.isOpen, (isOpen) => {
  if (isOpen && props.movie) {
    nextTick(() => {
      localMovie.value = initializeMovieData(JSON.parse(JSON.stringify(props.movie)));
    });
  }
});

function handleClose() {
  emit('close');
}

function handleSave() {
  // 保存前进行日期校验
  if (!validateWatchedDate()) {
    return; // 校验失败，不执行保存
  }
  
  const normalizedMovie = normalizeProgressForStatus(JSON.parse(JSON.stringify(localMovie.value))) as Movie;
  emit('save', normalizedMovie);
}
</script>
