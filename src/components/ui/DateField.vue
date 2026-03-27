<template>
  <div ref="rootRef" class="date-field-shell">
    <button
      type="button"
      :disabled="props.disabled"
      :class="[
        'date-field-trigger',
        {
          'date-field-trigger-invalid': props.invalid,
          'date-field-trigger-disabled': props.disabled,
        }
      ]"
      @click="toggleOpen"
      @blur="handleTriggerBlur"
    >
      <div class="date-field-icon">
        <CalendarDays class="h-4 w-4" />
      </div>
      <span :class="['date-field-label', { 'date-field-placeholder': !props.modelValue }]">
        {{ displayValue }}
      </span>
      <ChevronDown class="h-4 w-4 text-slate-400" />
    </button>

    <transition
      enter-active-class="date-panel-enter-active"
      enter-from-class="date-panel-enter-from"
      enter-to-class="date-panel-enter-to"
      leave-active-class="date-panel-leave-active"
      leave-from-class="date-panel-leave-from"
      leave-to-class="date-panel-leave-to"
    >
      <div v-if="isOpen" class="date-panel">
        <div class="date-panel-header">
          <button type="button" class="date-nav-button" @click="moveMonth(-1)">
            <ChevronLeft class="h-4 w-4" />
          </button>
          <div class="date-panel-title">{{ monthLabel }}</div>
          <button type="button" class="date-nav-button" @click="moveMonth(1)">
            <ChevronRight class="h-4 w-4" />
          </button>
        </div>

        <div class="date-week-grid">
          <span v-for="label in weekdayLabels" :key="label" class="date-weekday">{{ label }}</span>
        </div>

        <div class="date-day-grid">
          <button
            v-for="cell in calendarCells"
            :key="cell.key"
            type="button"
            :disabled="cell.disabled || !cell.date"
            :class="[
              'date-day',
              {
                'date-day-muted': cell.isMuted,
                'date-day-selected': cell.date === selectedValue,
                'date-day-today': cell.date === todayString,
                'date-day-disabled': cell.disabled || !cell.date,
              }
            ]"
            @click="selectDate(cell.date)"
          >
            {{ cell.label }}
          </button>
        </div>

        <div class="date-panel-footer">
          <button type="button" class="date-footer-button" @click="selectDate(todayWithinRange)">
            今天
          </button>
          <button type="button" class="date-footer-button date-footer-button-secondary" @click="closePanel">
            关闭
          </button>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-vue-next';
import type { DateFieldProps, DateFieldEmits } from './types';

type Props = DateFieldProps;
type Emits = DateFieldEmits;

interface CalendarCell {
  key: string;
  label: string;
  date: string | null;
  isMuted: boolean;
  disabled: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
  placeholder: '选择日期',
  max: undefined,
  min: undefined,
  disabled: false,
  invalid: false,
});

const emit = defineEmits<Emits>();
const rootRef = ref<HTMLElement | null>(null);
const isOpen = ref(false);

const weekdayLabels = ['一', '二', '三', '四', '五', '六', '日'];
const todayString = new Date().toISOString().split('T')[0];

const clampDate = (date: string) => {
  let value = date;

  if (props.min && value < props.min) {
    value = props.min;
  }

  if (props.max && value > props.max) {
    value = props.max;
  }

  return value;
};

const selectedValue = computed(() => {
  if (!props.modelValue) {
    return '';
  }

  return clampDate(props.modelValue);
});

const initialDate = selectedValue.value || clampDate(todayString);
const visibleYear = ref(parseInt(initialDate.slice(0, 4), 10));
const visibleMonth = ref(parseInt(initialDate.slice(5, 7), 10));

const displayValue = computed(() => {
  if (!selectedValue.value) {
    return props.placeholder;
  }

  const [year, month, day] = selectedValue.value.split('-').map(Number);
  return `${year}年${month}月${day}日`;
});

const monthLabel = computed(() => `${visibleYear.value}年${visibleMonth.value}月`);

const todayWithinRange = computed(() => {
  const value = clampDate(todayString);
  return value;
});

const getDateString = (year: number, month: number, day: number) => {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};

const normalizeMonth = (offset: number) => {
  const base = new Date(visibleYear.value, visibleMonth.value - 1 + offset, 1);
  visibleYear.value = base.getFullYear();
  visibleMonth.value = base.getMonth() + 1;
};

const moveMonth = (offset: number) => {
  normalizeMonth(offset);
};

const isDateDisabled = (date: string) => {
  if (props.min && date < props.min) {
    return true;
  }

  if (props.max && date > props.max) {
    return true;
  }

  return false;
};

const calendarCells = computed<CalendarCell[]>(() => {
  const cells: CalendarCell[] = [];
  const firstDay = new Date(visibleYear.value, visibleMonth.value - 1, 1);
  const daysInMonth = new Date(visibleYear.value, visibleMonth.value, 0).getDate();
  const startOffset = (firstDay.getDay() + 6) % 7;
  const prevMonthDate = new Date(visibleYear.value, visibleMonth.value - 1, 0);
  const prevMonthDays = prevMonthDate.getDate();

  for (let index = 0; index < startOffset; index++) {
    const day = prevMonthDays - startOffset + index + 1;
    const date = new Date(visibleYear.value, visibleMonth.value - 2, day);
    const dateString = getDateString(date.getFullYear(), date.getMonth() + 1, date.getDate());
    cells.push({
      key: `prev-${dateString}`,
      label: String(day),
      date: dateString,
      isMuted: true,
      disabled: isDateDisabled(dateString),
    });
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const dateString = getDateString(visibleYear.value, visibleMonth.value, day);
    cells.push({
      key: `current-${dateString}`,
      label: String(day),
      date: dateString,
      isMuted: false,
      disabled: isDateDisabled(dateString),
    });
  }

  const trailingCount = (7 - (cells.length % 7)) % 7;
  for (let index = 1; index <= trailingCount; index++) {
    const date = new Date(visibleYear.value, visibleMonth.value, index);
    const dateString = getDateString(date.getFullYear(), date.getMonth() + 1, date.getDate());
    cells.push({
      key: `next-${dateString}`,
      label: String(index),
      date: dateString,
      isMuted: true,
      disabled: isDateDisabled(dateString),
    });
  }

  return cells;
});

const syncVisibleMonth = (value?: string | null) => {
  const source = value || todayWithinRange.value;
  if (!source) {
    return;
  }

  visibleYear.value = parseInt(source.slice(0, 4), 10);
  visibleMonth.value = parseInt(source.slice(5, 7), 10);
};

watch(
  () => props.modelValue,
  value => {
    if (value) {
      syncVisibleMonth(value);
    }
  },
  { immediate: true }
);

const closePanel = () => {
  if (!isOpen.value) {
    return;
  }

  isOpen.value = false;
  emit('blur');
};

const toggleOpen = () => {
  if (props.disabled) {
    return;
  }

  if (!isOpen.value) {
    syncVisibleMonth(selectedValue.value || todayWithinRange.value);
  }

  isOpen.value = !isOpen.value;
};

const selectDate = (value: string | undefined) => {
  if (!value || isDateDisabled(value)) {
    return;
  }

  emit('update:modelValue', value);
  closePanel();
};

const handleDocumentPointerDown = (event: MouseEvent) => {
  if (!rootRef.value) {
    return;
  }

  const target = event.target as Node;
  if (!rootRef.value.contains(target)) {
    closePanel();
  }
};

const handleTriggerBlur = () => {
  window.setTimeout(() => {
    const activeElement = document.activeElement;
    if (rootRef.value && activeElement instanceof Node && rootRef.value.contains(activeElement)) {
      return;
    }

    closePanel();
  }, 0);
};

onMounted(() => {
  document.addEventListener('mousedown', handleDocumentPointerDown);
});

onBeforeUnmount(() => {
  document.removeEventListener('mousedown', handleDocumentPointerDown);
});
</script>

<style scoped>
.date-field-shell {
  position: relative;
}

.date-field-trigger {
  display: flex;
  min-height: 3rem;
  width: 100%;
  align-items: center;
  gap: 0.75rem;
  border-radius: 1rem;
  border: 1px solid rgba(209, 213, 219, 0.7);
  background: rgba(255, 255, 255, 0.92);
  padding: 0.78rem 0.95rem;
  color: #111827;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
  transition:
    border-color 160ms ease,
    box-shadow 160ms ease,
    transform 160ms ease,
    background-color 160ms ease;
}

.date-field-trigger:hover {
  border-color: rgba(156, 163, 175, 0.85);
  background: rgba(255, 255, 255, 0.98);
}

.date-field-trigger:focus-visible {
  outline: none;
  border-color: rgba(59, 130, 246, 0.7);
  box-shadow:
    0 0 0 4px rgba(191, 219, 254, 0.65),
    0 10px 30px -24px rgba(59, 130, 246, 0.55);
}

.date-field-trigger-invalid {
  border-color: rgba(248, 113, 113, 0.75);
  box-shadow: 0 0 0 4px rgba(254, 226, 226, 0.7);
}

.date-field-trigger-disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.date-field-icon {
  display: inline-flex;
  flex-shrink: 0;
  color: #94a3b8;
}

.date-field-label {
  flex: 1;
  min-width: 0;
  text-align: left;
  font-size: 0.92rem;
}

.date-field-placeholder {
  color: #94a3b8;
}

.date-panel {
  position: absolute;
  top: calc(100% + 0.65rem);
  left: 0;
  z-index: 80;
  width: min(320px, 100%);
  border-radius: 1.25rem;
  border: 1px solid rgba(226, 232, 240, 0.95);
  background: rgba(255, 255, 255, 0.98);
  padding: 1rem;
  box-shadow: 0 26px 60px -34px rgba(15, 23, 42, 0.4);
  backdrop-filter: blur(18px);
}

.date-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.9rem;
}

.date-panel-title {
  font-size: 0.92rem;
  font-weight: 600;
  color: #0f172a;
}

.date-nav-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 2rem;
  width: 2rem;
  border: 0;
  border-radius: 9999px;
  background: rgba(241, 245, 249, 0.95);
  color: #475569;
  transition: background-color 160ms ease, transform 160ms ease;
}

.date-nav-button:hover {
  background: rgba(219, 234, 254, 0.92);
  transform: translateY(-1px);
}

.date-week-grid,
.date-day-grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
}

.date-week-grid {
  margin-bottom: 0.4rem;
}

.date-weekday {
  display: inline-flex;
  justify-content: center;
  font-size: 0.72rem;
  color: #94a3b8;
}

.date-day-grid {
  gap: 0.22rem;
}

.date-day {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  aspect-ratio: 1 / 1;
  border: 0;
  border-radius: 0.9rem;
  background: transparent;
  font-size: 0.84rem;
  color: #0f172a;
  transition:
    background-color 160ms ease,
    color 160ms ease,
    transform 160ms ease;
}

.date-day:hover:not(.date-day-disabled) {
  background: rgba(219, 234, 254, 0.8);
  color: #1d4ed8;
  transform: translateY(-1px);
}

.date-day-muted {
  color: #cbd5e1;
}

.date-day-selected {
  background: linear-gradient(135deg, #2563eb, #1d4ed8);
  color: #ffffff;
  box-shadow: 0 10px 22px -18px rgba(37, 99, 235, 0.8);
}

.date-day-today:not(.date-day-selected) {
  background: rgba(239, 246, 255, 0.95);
  color: #1d4ed8;
}

.date-day-disabled {
  cursor: not-allowed;
  opacity: 0.38;
}

.date-panel-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.6rem;
  margin-top: 0.9rem;
}

.date-footer-button {
  border: 0;
  border-radius: 9999px;
  background: rgba(219, 234, 254, 0.92);
  padding: 0.5rem 0.9rem;
  font-size: 0.78rem;
  font-weight: 600;
  color: #1d4ed8;
  transition: background-color 160ms ease;
}

.date-footer-button:hover {
  background: rgba(191, 219, 254, 0.95);
}

.date-footer-button-secondary {
  background: rgba(241, 245, 249, 0.95);
  color: #475569;
}

.date-panel-enter-active,
.date-panel-leave-active {
  transition: opacity 180ms ease, transform 180ms ease;
}

.date-panel-enter-from,
.date-panel-leave-to {
  opacity: 0;
  transform: translateY(-6px) scale(0.98);
}

.date-panel-enter-to,
.date-panel-leave-from {
  opacity: 1;
  transform: translateY(0) scale(1);
}

@media (prefers-reduced-motion: reduce) {
  .date-field-trigger,
  .date-nav-button,
  .date-day,
  .date-panel-enter-active,
  .date-panel-leave-active {
    transition-duration: 0.01ms;
  }
}
</style>
