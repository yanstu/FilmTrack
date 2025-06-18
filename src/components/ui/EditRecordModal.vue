<template>
  <Modal
    :is-open="isOpen"
    type="info"
    title="编辑记录"
    message=""
    :show-cancel="true"
    :large="true"
    @close="handleClose"
    @confirm="handleSave"
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
            <input
              v-model.number="localMovie.current_season"
              type="number"
              min="1"
              :max="localMovie.total_seasons || 999"
              class="w-full px-4 py-3 rounded-xl bg-white/80 backdrop-blur-sm 
                     border border-gray-200/50 text-gray-900
                     focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">当前集数</label>
            <div class="flex space-x-2">
              <input
                v-model.number="localMovie.current_episode"
                type="number"
                min="0"
                :max="localMovie.total_episodes || 999"
                class="flex-1 px-4 py-3 rounded-xl bg-white/80 backdrop-blur-sm 
                       border border-gray-200/50 text-gray-900
                       focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
              <button
                v-if="localMovie.type === 'tv' && localMovie.total_episodes"
                @click="setToLastEpisode"
                class="px-3 py-3 bg-white text-gray-500 rounded-xl hover:bg-gray-50 hover:text-gray-600 transition-colors text-sm border border-gray-300 shadow-sm"
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
            v-model="localMovie.watch_source"
            type="text"
            placeholder="如：Netflix、爱奇艺、电影院等"
            class="w-full px-4 py-3 rounded-xl bg-white/80 backdrop-blur-sm 
                   border border-gray-200/50 text-gray-900 placeholder-gray-500
                   focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
          />
        </div>

        <!-- 观看笔记 -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">观看笔记</label>
          <textarea
            v-model="localMovie.notes"
            rows="4"
            placeholder="记录您的观看感受..."
            class="w-full px-4 py-3 rounded-xl bg-white/80 backdrop-blur-sm 
                   border border-gray-200/50 text-gray-900 placeholder-gray-500
                   focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 resize-none"
          ></textarea>
        </div>
      </div>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import type { Movie } from '../../types';
import { APP_CONFIG } from '../../../config/app.config';
import Modal from './Modal.vue';
import HeadlessSelect from './HeadlessSelect.vue';
import StarRating from './StarRating.vue';

interface Props {
  isOpen: boolean;
  movie: Movie | null;
}

interface Emits {
  (e: 'close'): void;
  (e: 'save', movie: Movie): void;
}

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

// 监听传入的电影数据变化
watch(() => props.movie, (newMovie) => {
  if (newMovie) {
    localMovie.value = { ...newMovie };
  }
}, { immediate: true });

function setToLastEpisode() {
  if (localMovie.value.total_episodes) {
    localMovie.value.current_episode = localMovie.value.total_episodes;
  }
}

function handleClose() {
  emit('close');
}

function handleSave() {
  emit('save', localMovie.value);
}
</script> 