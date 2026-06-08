<template>
  <Teleport to="body">
    <Transition name="toast-slide">
      <div v-if="visible" class="toast-wrap" role="alert" aria-live="assertive">
        <div :class="['toast', toneClass]">
          <div class="toast-ico" :class="toneIconClass">
            <component :is="iconComp" class="w-4 h-4" />
          </div>
          <div class="toast-main">
            <div class="toast-title">{{ title }}</div>
            <div class="toast-msg">{{ message }}</div>
            <div v-if="onRetry || hint" class="toast-actions">
              <button v-if="onRetry" type="button" class="toast-btn primary" @click="handleRetry">
                <RefreshIcon class="w-3.5 h-3.5" /> 重试
              </button>
              <span v-if="hint" class="toast-hint">{{ hint }}</span>
            </div>
          </div>
          <button class="toast-close" type="button" aria-label="关闭" @click="dismiss">
            <XIcon class="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import {
  AlertTriangle as WarnIcon,
  CheckCircle2 as SuccessIcon,
  Info as InfoIcon,
  RefreshCcw as RefreshIcon,
  X as XIcon,
  XCircle as ErrorIcon,
} from 'lucide-vue-next';

type Tone = 'error' | 'warning' | 'info' | 'success';

interface Props {
  title?: string;
  message: string;
  /** 默认 error；网络问题建议传 warning */
  tone?: Tone;
  hint?: string;
  /** 自动关闭（毫秒）；0 表示不自动关闭 */
  duration?: number;
  /** 提供时显示"重试"按钮；点击后回调，默认会保持显示 */
  onRetry?: () => void;
}

const props = withDefaults(defineProps<Props>(), {
  tone: 'error',
  duration: 5000,
});

const emit = defineEmits<{ close: [] }>();

const visible = ref(true);
let timer: ReturnType<typeof setTimeout> | null = null;

const armTimer = () => {
  if (timer) clearTimeout(timer);
  if (props.duration > 0) {
    timer = setTimeout(() => dismiss(), props.duration);
  }
};

const dismiss = () => {
  visible.value = false;
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  emit('close');
};

const handleRetry = () => {
  if (props.onRetry) props.onRetry();
  armTimer();
};

watch(
  () => props.message,
  () => {
    visible.value = true;
    armTimer();
  },
  { immediate: true }
);

const toneClass = computed(() => `toast--${props.tone}`);
const toneIconClass = computed(() => `toast-ico--${props.tone}`);

const title = computed(() => {
  if (props.title) return props.title;
  switch (props.tone) {
    case 'warning': return '注意';
    case 'info': return '提示';
    case 'success': return '成功';
    default: return '出错了';
  }
});

const iconComp = computed(() => {
  switch (props.tone) {
    case 'warning': return WarnIcon;
    case 'info': return InfoIcon;
    case 'success': return SuccessIcon;
    default: return ErrorIcon;
  }
});

onBeforeUnmount(() => {
  if (timer) clearTimeout(timer);
});
</script>

<style scoped>
.toast-wrap {
  position: fixed;
  top: 16px;
  right: 16px;
  z-index: 80;
  max-width: min(420px, calc(100vw - 32px));
}

.toast {
  display: flex;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 12px;
  background: #fff;
  border: 1px solid rgba(0, 0, 0, 0.06);
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.16), 0 2px 6px rgba(0, 0, 0, 0.06);
}

.toast--error { border-color: rgba(239, 68, 68, 0.25); }
.toast--warning { border-color: rgba(245, 158, 11, 0.3); }
.toast--info { border-color: rgba(59, 130, 246, 0.25); }
.toast--success { border-color: rgba(16, 185, 129, 0.25); }

.toast-ico {
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.toast-ico--error { background: #fee2e2; color: #b91c1c; }
.toast-ico--warning { background: #fef3c7; color: #b45309; }
.toast-ico--info { background: #dbeafe; color: #1d4ed8; }
.toast-ico--success { background: #dcfce7; color: #15803d; }

.toast-main {
  flex: 1;
  min-width: 0;
}

.toast-title {
  font-size: 13px;
  font-weight: 600;
  color: #111827;
}

.toast-msg {
  margin-top: 2px;
  font-size: 12.5px;
  color: #374151;
  line-height: 1.5;
  word-break: break-word;
}

.toast-actions {
  margin-top: 10px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.toast-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border: none;
  background: #111827;
  color: #fff;
  padding: 5px 10px;
  font-size: 12px;
  font-weight: 500;
  border-radius: 7px;
  cursor: pointer;
  transition: background 120ms ease, transform 120ms ease;
}

.toast-btn.primary {
  background: #2563eb;
}

.toast-btn.primary:hover {
  background: #1d4ed8;
}

.toast-btn:active {
  transform: scale(0.96);
}

.toast-hint {
  font-size: 11px;
  color: #9ca3af;
}

.toast-close {
  border: none;
  background: transparent;
  width: 24px;
  height: 24px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #9ca3af;
  cursor: pointer;
  flex-shrink: 0;
}

.toast-close:hover {
  background: #f3f4f6;
  color: #4b5563;
}

.toast-slide-enter-active,
.toast-slide-leave-active {
  transition: transform 220ms cubic-bezier(0.16, 1, 0.3, 1), opacity 180ms ease;
}

.toast-slide-enter-from,
.toast-slide-leave-to {
  opacity: 0;
  transform: translateY(-8px) scale(0.98);
}
</style>
