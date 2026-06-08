<template>
  <div :class="['toast', `toast--${item.tone}`]">
    <div :class="['toast-ico', `toast-ico--${item.tone}`]">
      <component :is="iconComp" class="w-4 h-4" />
    </div>
    <div class="toast-main">
      <div class="toast-title">{{ item.title }}</div>
      <div class="toast-msg">{{ item.message }}</div>
      <div v-if="item.hint" class="toast-hint">{{ item.hint }}</div>
    </div>
    <button class="toast-close" type="button" aria-label="关闭" @click="$emit('dismiss')">
      <XIcon class="w-3.5 h-3.5" />
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted } from 'vue';
import {
  AlertTriangle as WarnIcon,
  CheckCircle2 as SuccessIcon,
  Info as InfoIcon,
  X as XIcon,
  XCircle as ErrorIcon,
} from 'lucide-vue-next';
import type { ToastItem } from '../../utils/toast';

const props = defineProps<{ item: ToastItem }>();
const emit = defineEmits<{ dismiss: [] }>();

let timer: ReturnType<typeof setTimeout> | null = null;

const iconComp = computed(() => {
  switch (props.item.tone) {
    case 'warning':
      return WarnIcon;
    case 'info':
      return InfoIcon;
    case 'success':
      return SuccessIcon;
    default:
      return ErrorIcon;
  }
});

onMounted(() => {
  if (props.item.duration > 0) {
    timer = setTimeout(() => emit('dismiss'), props.item.duration);
  }
});

onBeforeUnmount(() => {
  if (timer) clearTimeout(timer);
});
</script>

<style scoped>
.toast {
  display: flex;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 12px;
  background: #fff;
  border: 1px solid rgba(0, 0, 0, 0.06);
  box-shadow:
    0 16px 40px rgba(0, 0, 0, 0.16),
    0 2px 6px rgba(0, 0, 0, 0.06);
  max-width: min(420px, calc(100vw - 32px));
  min-width: 240px;
}

.toast--error { border-color: rgba(239, 68, 68, 0.25); }
.toast--warning { border-color: rgba(245, 158, 11, 0.3); }
.toast--info { border-color: rgba(59, 130, 246, 0.25); }
.toast--success { border-color: rgba(16, 185, 129, 0.28); }

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

/* 成功 icon 进入时的「打勾微动画」 */
.toast--success .toast-ico {
  animation: success-pop 320ms cubic-bezier(0.22, 1, 0.36, 1);
}

@keyframes success-pop {
  0% {
    transform: scale(0.6);
    opacity: 0;
  }
  60% {
    transform: scale(1.08);
    opacity: 1;
  }
  100% {
    transform: scale(1);
  }
}

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

.toast-hint {
  margin-top: 6px;
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

@media (prefers-reduced-motion: reduce) {
  .toast--success .toast-ico {
    animation: none;
  }
}
</style>
