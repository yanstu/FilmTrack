<template>
  <div class="card p-6">
    <h2 class="text-xl font-semibold text-gray-900 mb-4">观看进度</h2>
    <div class="space-y-4">
      <!-- 单季电视剧：只显示观看进度 -->
      <div v-if="movie.type === 'tv' && isSingleSeason" class="space-y-3">
        <div class="flex items-center justify-between">
          <span class="text-gray-600">观看进度</span>
          <span class="font-semibold">{{ watchProgress.current }}/{{ watchProgress.total || '?' }}</span>
        </div>
        <div class="w-full bg-gray-200 rounded-full h-3">
          <div
            :class="[
              'h-3 rounded-full transition-all duration-300',
              getProgressColor(watchProgress.percentage)
            ]"
            :style="{ width: `${watchProgress.percentage}%` }"
          ></div>
        </div>
        <div class="flex justify-between text-sm text-gray-500">
          <span>{{ watchProgress.percentage }}% 完成</span>
          <span>观看进度</span>
        </div>
      </div>

      <!-- 多季电视剧：显示当前季进度和整体进度 -->
      <template v-else-if="movie.type === 'tv' && !isSingleSeason">
        <!-- 当前季进度 -->
        <div v-if="currentSeasonProgress" class="space-y-3">
          <div class="flex items-center justify-between">
            <span class="text-gray-600">{{ currentSeasonProgress.seasonName }}</span>
            <span class="font-semibold">{{ currentSeasonProgress.current }}/{{ currentSeasonProgress.total }}</span>
          </div>
          <div class="w-full bg-gray-200 rounded-full h-3">
            <div
              :class="[
                'h-3 rounded-full transition-all duration-300',
                getProgressColor(currentSeasonProgress.percentage)
              ]"
              :style="{ width: `${currentSeasonProgress.percentage}%` }"
            ></div>
          </div>
          <div class="flex justify-between text-sm text-gray-500">
            <span>{{ currentSeasonProgress.percentage }}% 完成</span>
            <span>当前季进度</span>
          </div>
        </div>

        <!-- 整体进度 -->
        <div class="space-y-3 pt-3 border-t border-gray-100">
          <div class="flex items-center justify-between">
            <span class="text-gray-600">整体进度</span>
            <span class="font-semibold">{{ watchProgress.current }}/{{ watchProgress.total || '?' }}</span>
          </div>
          <div class="w-full bg-gray-200 rounded-full h-2">
            <div
              :class="[
                'h-2 rounded-full transition-all duration-300',
                getProgressColor(watchProgress.percentage)
              ]"
              :style="{ width: `${watchProgress.percentage}%` }"
            ></div>
          </div>
          <div class="flex justify-between text-sm text-gray-500">
            <span>{{ watchProgress.percentage }}% 完成</span>
            <span>全剧进度</span>
          </div>
        </div>
      </template>

      <!-- 电影进度 -->
      <div v-else class="space-y-3">
        <div class="flex items-center justify-between">
          <span class="text-gray-600">观看状态</span>
          <span class="font-semibold">{{ movie.status === 'completed' ? '已完成' : '未完成' }}</span>
        </div>
        <div class="w-full bg-gray-200 rounded-full h-3">
          <div
            :class="[
              'h-3 rounded-full transition-all duration-300',
              movie.status === 'completed' ? 'bg-green-500' : 'bg-blue-500'
            ]"
            :style="{ width: movie.status === 'completed' ? '100%' : '0%' }"
          ></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { WatchProgressProps } from '../types';
import {
  clampEpisodeForSeason,
  getNormalizedProgress,
  getSeasonOptions
} from '../../../utils/seasonProgress';

const props = defineProps<WatchProgressProps>();

// 判断是否为单季电视剧
const isSingleSeason = computed(() => {
  return getSeasonOptions(props.movie.seasons_data, props.movie.total_seasons).length <= 1;
});

// 计算当前季进度
const currentSeasonProgress = computed(() => {
  if (props.movie.type !== 'tv') {
    return null;
  }

  const normalized = getNormalizedProgress(props.movie);
  const currentSeasonData = props.movie.seasons_data?.[normalized.season.toString()];
  if (!currentSeasonData) {
    return null;
  }

  const current = clampEpisodeForSeason(props.movie, normalized.season, normalized.episode);
  const total = currentSeasonData.episode_count;
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0;

  return {
    seasonName: currentSeasonData.name,
    current,
    total,
    percentage: Math.min(percentage, 100)
  };
});
</script>
