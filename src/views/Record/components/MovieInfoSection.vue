<template>
  <div v-if="form.tmdb_id" class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8 animate-fade-in-up" style="animation-delay: 200ms;">
    <!-- 封面图片 -->
    <div class="lg:col-span-1">
      <div class="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-200/50">
        <div class="aspect-[2/3] rounded-xl overflow-hidden bg-gray-100 cursor-pointer hover:shadow-lg transition-all duration-200" @click="$emit('showImagePreview')">
          <CachedImage
            :src="getImageUrl(form.poster_path)"
            :alt="form.title"
            class-name="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
          />
        </div>
      </div>
    </div>

    <!-- 影视信息 -->
    <div class="lg:col-span-2">
      <div class="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-200/50">
        <h2 class="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <FilmIcon :size="20" class="mr-2 text-blue-600" />
          影视信息
        </h2>
        
        <div class="space-y-4">
          <!-- 标题信息 -->
          <div>
            <h3 class="text-xl font-bold text-gray-900">{{ form.title }}</h3>
            <p v-if="form.original_title && form.original_title !== form.title" 
               class="text-sm text-gray-600 mt-1">{{ form.original_title }}</p>
          </div>

          <!-- 基本信息 -->
          <div class="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span class="text-gray-500">类型：</span>
              <span class="text-gray-900">{{ getTypeLabel(form.type) }}</span>
            </div>
            <div>
              <span class="text-gray-500">年份：</span>
              <span class="text-gray-900">{{ form.year || '暂无' }}</span>
            </div>
            <div v-if="form.type === 'tv'">
              <span class="text-gray-500">总集数：</span>
              <span class="text-gray-900">{{ form.total_episodes || '未知' }}</span>
            </div>
            <div v-if="form.type === 'tv'">
              <span class="text-gray-500">播出状态：</span>
              <span class="text-gray-900">{{ getAirStatusLabel(form.air_status) }}</span>
            </div>
          </div>

          <!-- 评分信息 -->
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm text-gray-500 mb-1">TMDb评分</label>
              <div class="flex items-center space-x-2">
                <StarIcon :size="16" class="text-yellow-400 fill-yellow-400" />
                <span class="text-lg font-semibold text-gray-900">
                  {{ form.tmdb_rating ? form.tmdb_rating.toFixed(1) : '暂无' }}
                </span>
              </div>
            </div>
            <div>
              <label class="block text-sm text-gray-500 mb-1">个人评分</label>
              <div class="flex items-center space-x-2">
                <StarIcon :size="16" class="text-yellow-400 fill-yellow-400" />
                <span class="text-lg font-semibold text-gray-900">
                  {{ form.personal_rating ? (form.personal_rating / 2).toFixed(1) : '暂无' }}
                </span>
              </div>
            </div>
          </div>

          <!-- 简介 -->
          <div v-if="form.overview">
            <label class="block text-sm text-gray-500 mb-2">简介</label>
            <p class="text-sm text-gray-700 leading-relaxed">{{ form.overview }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Film as FilmIcon, Star as StarIcon } from 'lucide-vue-next';
import CachedImage from '../../../components/ui/CachedImage.vue';
import { getTypeLabel, getAirStatusLabel } from '../../../utils/constants';
import type { RecordForm } from '../types';

import type { RecordFormProps, MovieInfoSectionEmits } from '../types';

type Props = RecordFormProps;
type Emits = MovieInfoSectionEmits;

defineProps<Props>();
defineEmits<Emits>();
</script>
