<template>
  <Modal
    :is-open="isOpen"
    type="info"
    :title="title"
    message=""
    :show-cancel="true"
    :confirm-disabled="saving"
    @close="$emit('close')"
    @confirm="handleSave"
    @cancel="$emit('close')"
    :confirm-text="saving ? '保存中…' : '一键保存'"
    cancel-text="取消"
  >
    <template #content>
      <div class="quick-form">
        <!-- 进度行 -->
        <section class="quick-section">
          <div class="quick-label">进度</div>

          <div v-if="movie.type === 'tv'" class="quick-progress-row">
            <button
              type="button"
              class="quick-step quick-step-minus"
              :disabled="!canStepDown"
              @click="stepDown"
              aria-label="减一集"
            >
              <MinusIcon class="w-4 h-4" />
            </button>

            <div class="quick-progress-text">
              <span class="quick-progress-current">{{ formattedProgress }}</span>
              <span v-if="totalEpisodes" class="quick-progress-total">/ {{ totalEpisodes }} 集</span>
              <span v-else-if="!canStepUp" class="quick-progress-done">已是最后一集</span>
            </div>

            <button
              type="button"
              class="quick-step quick-step-plus"
              :disabled="!canStepUp"
              @click="stepUp"
              aria-label="加一集"
            >
              <PlusIcon class="w-4 h-4" />
            </button>
          </div>

          <div v-else class="quick-completed-row">
            <ToggleSwitch v-model="markedCompleted" />
            <span class="quick-completed-text">已经看完这部</span>
          </div>

          <p v-if="delta !== 0" class="quick-delta">
            <span :class="delta > 0 ? 'quick-delta-positive' : 'quick-delta-negative'">
              {{ delta > 0 ? `本次 +${delta} 集` : `回退 ${Math.abs(delta)} 集` }}
            </span>
          </p>
          <p v-if="willMarkCompleted && delta === 0" class="quick-delta quick-delta-positive">
            状态将更新为「已看完」
          </p>
        </section>

        <!-- 评分行 -->
        <section class="quick-section">
          <div class="quick-label">评分</div>
          <div class="quick-rating-row">
            <StarRating
              v-model="rating"
              :allow-half="true"
              :show-value="true"
              :show-reset="true"
              :size="22"
              :max="5"
            />
          </div>
        </section>

        <!-- 短评行 -->
        <section class="quick-section">
          <div class="quick-label-row">
            <div class="quick-label">短评 / 备注</div>
            <span class="quick-count">{{ note.length }} / 280</span>
          </div>
          <TextAreaField
            v-model="note"
            placeholder="一句话感受，比如：节奏到位、女主演技顶 / 这集太炸了..."
            :rows="3"
          />
        </section>
      </div>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { Minus as MinusIcon, Plus as PlusIcon } from 'lucide-vue-next';
import Modal from '../../../components/ui/Modal.vue';
import StarRating from '../../../components/ui/StarRating.vue';
import TextAreaField from '../../../components/ui/TextAreaField.vue';
import ToggleSwitch from '../../../components/ui/ToggleSwitch.vue';
import type { Movie } from '../../../types';
import {
  getNextWatchProgress,
  getPreviousWatchProgress,
  getOverallWatchedEpisodes,
} from '../../../utils/seasonProgress';

interface Props {
  isOpen: boolean;
  movie: Movie;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  close: [];
  save: [partial: Partial<Movie>];
}>();

const saving = ref(false);

// —— 当前编辑态 ——
const season = ref<number>(props.movie.current_season ?? 1);
const episode = ref<number>(props.movie.current_episode ?? 0);
const rating = ref<number>(props.movie.personal_rating ?? 0);
const note = ref<string>(props.movie.notes ?? '');
const markedCompleted = ref<boolean>(props.movie.status === 'completed');

// 初始基线（用于显示"本次 +N 集"等增量）
const initialEpisodes = ref<number>(getOverallWatchedEpisodes(props.movie as never));
const initialStatus = ref<string>(props.movie.status ?? '');

const totalEpisodes = computed(() => Math.max(0, Number(props.movie.total_episodes || 0)));

const formattedProgress = computed(() => {
  if (props.movie.type !== 'tv') return '';
  return `第 ${season.value} 季 · 第 ${episode.value} 集`;
});

const previewMovie = computed<Movie>(() => ({
  ...props.movie,
  current_season: season.value,
  current_episode: episode.value,
}));

const canStepUp = computed(() => getNextWatchProgress(previewMovie.value) !== null);
const canStepDown = computed(() => getPreviousWatchProgress(previewMovie.value) !== null);

const stepUp = () => {
  const next = getNextWatchProgress(previewMovie.value);
  if (!next) return;
  season.value = next.season;
  episode.value = next.episode;
};

const stepDown = () => {
  const prev = getPreviousWatchProgress(previewMovie.value);
  if (!prev) return;
  season.value = prev.season;
  episode.value = prev.episode;
};

const currentTotalWatched = computed(() => getOverallWatchedEpisodes(previewMovie.value));
const delta = computed(() => currentTotalWatched.value - initialEpisodes.value);

const willMarkCompleted = computed(() => {
  if (markedCompleted.value && initialStatus.value !== 'completed') return true;
  if (props.movie.type === 'tv' && totalEpisodes.value && currentTotalWatched.value >= totalEpisodes.value) {
    return true;
  }
  return false;
});

const title = computed(() =>
  props.movie.type === 'tv' ? '记录这次观看' : '记录这次观看'
);

// 当弹窗重新打开时，从最新 movie 同步内部状态
watch(
  () => props.isOpen,
  (open) => {
    if (!open) return;
    season.value = props.movie.current_season ?? 1;
    episode.value = props.movie.current_episode ?? 0;
    rating.value = props.movie.personal_rating ?? 0;
    note.value = props.movie.notes ?? '';
    markedCompleted.value = props.movie.status === 'completed';
    initialEpisodes.value = getOverallWatchedEpisodes(props.movie as never);
    initialStatus.value = props.movie.status ?? '';
  }
);

// 软限制 280 字
watch(note, (value) => {
  if (value.length > 280) {
    note.value = value.slice(0, 280);
  }
});

const handleSave = async () => {
  if (saving.value) return;
  saving.value = true;
  try {
    const partial: Partial<Movie> = {
      personal_rating: rating.value,
      notes: note.value,
    };

    if (props.movie.type === 'tv') {
      partial.current_season = season.value;
      partial.current_episode = episode.value;
    }

    // 状态更新策略：
    // - 用户显式打开"已经看完" → completed
    // - 否则若有正向 delta，自动切到 watching（如果原来是 planned/paused）
    if (willMarkCompleted.value) {
      partial.status = 'completed';
    } else if (delta.value > 0 && ['planned', 'paused'].includes(initialStatus.value)) {
      partial.status = 'watching';
    }

    // 同步观看日期为今天（仅当有 delta 或新完成时）
    if (delta.value > 0 || willMarkCompleted.value) {
      partial.watched_date = new Date().toISOString().slice(0, 10);
    }

    emit('save', partial);
    emit('close');
  } finally {
    saving.value = false;
  }
};
</script>

<style scoped>
.quick-form {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.quick-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.quick-label,
.quick-label-row {
  font-size: 12px;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.quick-label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.quick-count {
  font-variant-numeric: tabular-nums;
  font-size: 11px;
  color: #9ca3af;
  text-transform: none;
  letter-spacing: 0;
}

.quick-progress-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 12px;
  background: #f8fafc;
  border: 1px solid rgba(0, 0, 0, 0.04);
}

.quick-step {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: none;
  background: #fff;
  color: #1f2937;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06);
  transition: background 150ms ease, color 150ms ease, transform 120ms ease;
}

.quick-step:hover:not(:disabled) {
  background: #2563eb;
  color: #fff;
}

.quick-step:active:not(:disabled) {
  transform: scale(0.94);
}

.quick-step:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.quick-progress-text {
  flex: 1;
  display: flex;
  align-items: baseline;
  gap: 6px;
  color: #0f172a;
  font-size: 14px;
  font-weight: 600;
}

.quick-progress-total {
  font-size: 12px;
  color: #94a3b8;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
}

.quick-progress-done {
  font-size: 12px;
  color: #9ca3af;
  font-weight: 500;
}

.quick-completed-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 12px;
  background: #f8fafc;
  border: 1px solid rgba(0, 0, 0, 0.04);
}

.quick-completed-text {
  font-size: 14px;
  color: #0f172a;
  font-weight: 600;
}

.quick-delta {
  font-size: 12px;
  color: #6b7280;
}

.quick-delta-positive {
  color: #15803d;
}

.quick-delta-negative {
  color: #b45309;
}

.quick-rating-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 12px;
  background: #f8fafc;
  border: 1px solid rgba(0, 0, 0, 0.04);
}
</style>
