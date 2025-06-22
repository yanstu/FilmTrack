/**
 * Record 页面表单逻辑
 */

import { ref, computed, watch, type Ref } from 'vue';
import { useRouter } from 'vue-router';
import { useMovieStore } from '../../../stores/movie';
import { APP_CONFIG } from '../../../../config/app.config';
import type { RecordForm, DialogState, StatusOption } from '../types';

export function useFormLogic(
  showDialog: (type: DialogState['type'], title: string, message: string, onConfirm?: () => void) => void
) {
  const router = useRouter();
  const movieStore = useMovieStore();

  // 表单数据
  const form = ref<RecordForm>({
    title: '',
    original_title: '',
    type: '',
    year: undefined,
    status: 'watching',
    personal_rating: 0,
    watch_source: '',
    overview: '',
    notes: '',
    watched_date: new Date().toISOString().split('T')[0], // 默认当天
    tmdb_id: undefined,
    tmdb_rating: undefined,
    poster_path: '',
    total_episodes: undefined,
    total_seasons: undefined,
    current_episode: 1,
    current_season: 1,
    air_status: ''
  });

  // UI 状态
  const isSubmitting = ref(false);

  // 计算属性
  const canSubmit = computed(() => {
    return !!(form.value.title && form.value.status && form.value.tmdb_id);
  });

  // 下拉选项配置
  const statusOptions: StatusOption[] = Object.entries(APP_CONFIG.features.watchStatus).map(([key, label]) => ({
    value: key,
    label
  }));

  // 设置到最后一集
  const setToLastEpisode = () => {
    if (form.value.total_episodes) {
      form.value.current_episode = form.value.total_episodes;
    }
  };

  // 提交表单
  const handleSubmit = async () => {
    if (!canSubmit.value) {
      showDialog('warning', '提示', '请填写必填字段');
      return;
    }

    isSubmitting.value = true;

    try {
      const movieData = {
        tmdb_id: form.value.tmdb_id!,
        type: form.value.type as 'movie' | 'tv',
        status: form.value.status as any,
        personal_rating: form.value.personal_rating || undefined,
        notes: form.value.notes || undefined,
        watch_source: form.value.watch_source || undefined,
        current_episode: form.value.current_episode || undefined,
        current_season: form.value.current_season || undefined
      };

      const response = await movieStore.addMovie(movieData);
      
      if (response.success) {
        showDialog('success', '成功', '影视作品添加成功！', () => {
          router.push({ name: 'Home' });
        });
      } else {
        // 显示具体的错误信息
        const errorMessage = response.error || '添加失败，未知错误';
        console.error('添加失败:', errorMessage);
        showDialog('error', '添加失败', errorMessage);
      }
    } catch (error: any) {
      console.error('添加影视作品失败:', error);
      const errorMessage = error?.message || error?.toString() || '添加失败，请重试';
      showDialog('error', '添加失败', errorMessage);
    } finally {
      isSubmitting.value = false;
    }
  };

  // 重置表单
  const handleReset = () => {
    form.value = {
      title: '',
      original_title: '',
      type: '',
      year: undefined,
      status: 'watching',
      personal_rating: 0,
      watch_source: '',
      overview: '',
      notes: '',
      watched_date: new Date().toISOString().split('T')[0],
      tmdb_id: undefined,
      tmdb_rating: undefined,
      poster_path: '',
      total_episodes: undefined,
      total_seasons: undefined,
      current_episode: 1,
      current_season: 1,
      air_status: ''
    };
  };

  // 监听状态变化，如果选择已看且是电视剧，自动设置当前集数为最后一集
  watch(() => form.value.status, (newStatus) => {
    if (newStatus === 'completed' && form.value.type === 'tv' && form.value.total_episodes) {
      form.value.current_episode = form.value.total_episodes;
    }
  });

  return {
    form,
    isSubmitting,
    canSubmit,
    statusOptions,
    setToLastEpisode,
    handleSubmit,
    handleReset
  };
}
