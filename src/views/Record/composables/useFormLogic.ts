/**
 * Record 页面表单逻辑
 */

import { ref, computed, watch, type Ref } from 'vue';
import { useRouter } from 'vue-router';
import { useMovieStore } from '../../../stores/movie';
import { APP_CONFIG } from '../../../../config/app.config';
import type { RecordForm, DialogState, StatusOption } from '../types';
import type { Status } from '../../../types';
import {
  clampEpisodeForSeason,
  getLastEpisodeInSeason,
  getNormalizedProgress,
  isTvMovie,
  normalizeProgressForStatus
} from '../../../utils/seasonProgress';

export function useFormLogic(
  showDialog: (type: DialogState['type'], title: string, message: string, onConfirm?: () => void) => void,
  isDateValid: Ref<boolean>
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
    current_episode: 0,
    current_season: 1,
    seasons_data: undefined,
    air_status: ''
  });

  // UI 状态
  const isSubmitting = ref(false);

  // 计算属性
  const canSubmit = computed(() => {
    return !!(form.value.title && form.value.status && form.value.tmdb_id && form.value.watched_date && isDateValid.value);
  });

  // 下拉选项配置
  const statusOptions: StatusOption[] = Object.entries(APP_CONFIG.features.watchStatus).map(([key, label]) => ({
    value: key,
    label
  }));

  // 设置到最后一集
  const setToLastEpisode = () => {
    if (!isTvMovie(form.value)) {
      return;
    }

    const currentProgress = getNormalizedProgress(form.value);
    form.value.current_episode = getLastEpisodeInSeason(form.value, currentProgress.season);
  };

  // 提交表单
  const handleSubmit = async () => {
    if (!canSubmit.value) {
      showDialog('warning', '提示', '请填写必填字段');
      return;
    }

    // 校验观看日期不能大于当前日期
    const currentDate = new Date().toISOString().split('T')[0];
    if (form.value.watched_date > currentDate) {
      showDialog('warning', '日期错误', '观看日期不能大于当前日期，请选择正确的观看日期');
      return;
    }

    isSubmitting.value = true;

    try {
      const movieData = normalizeProgressForStatus({
        tmdb_id: form.value.tmdb_id!,
        type: form.value.type as 'movie' | 'tv',
        status: form.value.status as Status,
        personal_rating: form.value.personal_rating || undefined,
        notes: form.value.notes || undefined,
        watch_source: form.value.watch_source || undefined,
        current_episode: form.value.current_episode || undefined,
        current_season: form.value.current_season || undefined,
        seasons_data: form.value.seasons_data || undefined,
        total_episodes: form.value.total_episodes,
        total_seasons: form.value.total_seasons,
        watched_date: form.value.watched_date // 传递观看日期用于设置date_added
      });

      const response = await movieStore.addMovie(movieData);
      
      if (response.success && response.data) {
        // 移除自动创建重刷记录的逻辑，用户需要手动添加重刷记录
        
        showDialog('success', '成功', '影视作品添加成功！', () => {
          router.push({ name: 'Home' });
        });
      } else {
        // 显示具体的错误信息
        const errorMessage = response.error || '添加失败，未知错误';
        console.error('添加失败:', errorMessage);
        showDialog('error', '添加失败', errorMessage);
      }
    } catch (error: unknown) {
      console.error('添加影视作品失败:', error);
      const errorMessage = error instanceof Error ? error.message || error.toString() || '添加失败，请重试' : String(error);
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
      current_episode: 0,
      current_season: 1,
      seasons_data: undefined,
      air_status: ''
    };
  };

  watch(() => form.value.status, (newStatus) => {
    if (newStatus === 'completed' && isTvMovie(form.value)) {
      const normalized = normalizeProgressForStatus({
        ...form.value,
        status: newStatus as Status
      });
      form.value.current_season = normalized.current_season ?? 1;
      form.value.current_episode = normalized.current_episode ?? 0;
      return;
    }

    if (isTvMovie(form.value)) {
      const normalized = getNormalizedProgress(form.value);
      form.value.current_season = normalized.season;
      form.value.current_episode = clampEpisodeForSeason(form.value, normalized.season, normalized.episode);
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
