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
              <input
                :value="localMovie.current_episode"
                @input="handleEpisodeInput"
                type="number"
                min="1"
                :max="currentSeasonMaxEpisodes"
                class="flex-1 px-4 py-3 rounded-xl bg-white/80 backdrop-blur-sm
                       border border-gray-200/50 text-gray-900
                       focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
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
import { ref, watch, nextTick, computed } from 'vue';
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

// 计算季数选项
const seasonOptions = computed(() => {
  if (!localMovie.value.seasons_data) {
    // 如果没有seasons_data，使用传统方式生成选项
    const options = [];
    const maxSeasons = localMovie.value.total_seasons || 1;
    for (let i = 1; i <= maxSeasons; i++) {
      options.push({
        value: i,
        label: `第 ${i} 季`
      });
    }
    return options;
  }

  // 基于seasons_data生成选项
  return Object.values(localMovie.value.seasons_data)
    .sort((a, b) => a.season_number - b.season_number)
    .map(season => ({
      value: season.season_number,
      label: `第 ${season.season_number} 季`
    }));
});

// 计算当前季的最大集数
const currentSeasonMaxEpisodes = computed(() => {
  if (!localMovie.value.seasons_data || !localMovie.value.current_season) {
    return localMovie.value.total_episodes || 999;
  }

  const currentSeasonData = localMovie.value.seasons_data[localMovie.value.current_season.toString()];
  return currentSeasonData?.episode_count || 999;
});

// 监听季数变化，重置集数为1
watch(() => localMovie.value.current_season, (newSeason, oldSeason) => {
  if (newSeason !== oldSeason && oldSeason !== undefined) {
    // 当季数发生变化时，重置集数为1
    localMovie.value.current_episode = 1;
  }
});

// 处理集数输入，确保不超过当前季最大集数且不小于等于0
const handleEpisodeInput = (event: Event) => {
  const target = event.target as HTMLInputElement;
  let value = parseInt(target.value) || 1;

  // 限制不能小于等于0，最小值为1
  if (value <= 0) {
    value = 1;
  }

  // 限制不能超过当前季最大集数
  if (value > currentSeasonMaxEpisodes.value) {
    value = currentSeasonMaxEpisodes.value;
  }

  // 更新输入框显示值
  target.value = value.toString();
  localMovie.value.current_episode = value;
};

// 初始化电影数据，确保所有必需字段都有默认值
const initializeMovieData = (movie: Movie): Movie => {
  return {
    ...movie,
    // 确保状态字段有默认值
    status: movie.status || 'planned',
    // 确保评分字段有默认值
    personal_rating: movie.personal_rating ?? 0,
    // 确保其他可能缺失的字段有默认值
    current_season: movie.current_season || 1,
    current_episode: movie.current_episode || 0,
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

function setToLastEpisode() {
  // 如果有seasons_data，使用当前季的集数
  if (localMovie.value.seasons_data && localMovie.value.current_season) {
    const currentSeasonData = localMovie.value.seasons_data[localMovie.value.current_season.toString()];
    if (currentSeasonData?.episode_count) {
      localMovie.value.current_episode = currentSeasonData.episode_count;
      return;
    }
  }

  // 回退到传统方式
  if (localMovie.value.total_episodes) {
    localMovie.value.current_episode = localMovie.value.total_episodes;
  }
}

function handleClose() {
  emit('close');
}

function handleSave() {
  emit('save', JSON.parse(JSON.stringify(localMovie.value)));
}
</script> 