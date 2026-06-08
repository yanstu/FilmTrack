<template>
  <div :class="['empty-block', dense ? 'empty-block--dense' : '']">
    <div class="empty-art" :class="`empty-art--${tone}`">
      <component :is="iconComp" class="empty-art-ico" />
    </div>
    <h3 class="empty-h3">{{ title }}</h3>
    <p v-if="description" class="empty-desc">{{ description }}</p>
    <div v-if="$slots.actions || actionLabel" class="empty-actions">
      <slot name="actions">
        <button
          v-if="actionLabel"
          type="button"
          class="empty-cta"
          :class="`empty-cta--${tone}`"
          @click="$emit('action')"
        >
          <component :is="actionIconComp" v-if="actionIconComp" class="w-4 h-4" />
          {{ actionLabel }}
        </button>
      </slot>
    </div>
    <p v-if="hint" class="empty-hint">{{ hint }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed, type Component } from 'vue';
import {
  AlertTriangle as AlertIcon,
  Compass as CompassIcon,
  Film as FilmIcon,
  PlugZap as PlugZapIcon,
  Search as SearchIcon,
  Sparkles as SparklesIcon,
} from 'lucide-vue-next';

type Tone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

interface Props {
  title: string;
  description?: string;
  hint?: string;
  /** 行为按钮文案（也可通过 #actions slot 自定义） */
  actionLabel?: string;
  /** 调性，影响图标底色 / CTA 颜色 */
  tone?: Tone;
  /** 自定义图标组件，未传则按 tone 选默认 */
  icon?: Component;
  /** 按钮图标 */
  actionIcon?: Component;
  /** 紧凑布局（用在卡片内/侧栏） */
  dense?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  tone: 'neutral',
  dense: false,
});

defineEmits<{ action: [] }>();

const defaultIcon: Record<Tone, Component> = {
  neutral: FilmIcon,
  info: CompassIcon,
  success: SparklesIcon,
  warning: SearchIcon,
  danger: PlugZapIcon,
};

const iconComp = computed(() => props.icon ?? defaultIcon[props.tone]);
const actionIconComp = computed(() => props.actionIcon ?? AlertIcon);
</script>

<style scoped>
.empty-block {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 56px 20px 48px;
  color: #4b5563;
}

.empty-block--dense {
  padding: 28px 16px;
}

.empty-art {
  width: 64px;
  height: 64px;
  border-radius: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 14px;
  background: linear-gradient(135deg, #f3f4f6, #e5e7eb);
  color: #6b7280;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.5);
}

.empty-block--dense .empty-art {
  width: 48px;
  height: 48px;
  border-radius: 14px;
  margin-bottom: 10px;
}

.empty-art-ico {
  width: 28px;
  height: 28px;
}

.empty-art--info {
  background: linear-gradient(135deg, #dbeafe, #bfdbfe);
  color: #1d4ed8;
}

.empty-art--success {
  background: linear-gradient(135deg, #dcfce7, #bbf7d0);
  color: #15803d;
}

.empty-art--warning {
  background: linear-gradient(135deg, #fef3c7, #fde68a);
  color: #b45309;
}

.empty-art--danger {
  background: linear-gradient(135deg, #fee2e2, #fecaca);
  color: #b91c1c;
}

.empty-h3 {
  font-size: 16px;
  font-weight: 600;
  color: #111827;
  margin-bottom: 6px;
}

.empty-desc {
  font-size: 13px;
  color: #6b7280;
  max-width: 380px;
  margin: 0 auto;
  line-height: 1.55;
}

.empty-actions {
  margin-top: 16px;
  display: flex;
  gap: 8px;
}

.empty-cta {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 500;
  color: #fff;
  background: #2563eb;
  border: none;
  cursor: pointer;
  transition: background 120ms ease, transform 120ms ease;
}

.empty-cta:hover {
  background: #1d4ed8;
}

.empty-cta:active {
  transform: scale(0.98);
}

.empty-cta--neutral {
  background: #111827;
}

.empty-cta--neutral:hover {
  background: #1f2937;
}

.empty-cta--success {
  background: #15803d;
}

.empty-cta--success:hover {
  background: #166534;
}

.empty-cta--warning {
  background: #b45309;
}

.empty-cta--warning:hover {
  background: #92400e;
}

.empty-cta--danger {
  background: #b91c1c;
}

.empty-cta--danger:hover {
  background: #991b1b;
}

.empty-hint {
  margin-top: 14px;
  font-size: 11px;
  color: #9ca3af;
}
</style>
