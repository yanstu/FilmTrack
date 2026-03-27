<template>
  <label
    :class="[
      'text-field',
      {
        'text-field-invalid': props.invalid,
        'text-field-disabled': props.disabled,
        'text-field-dense': props.dense,
      }
    ]"
  >
    <span v-if="props.leadingIcon" class="text-field-icon">
      <component :is="props.leadingIcon" class="h-4 w-4" />
    </span>

    <input
      :value="stringValue"
      :type="props.type"
      :inputmode="props.inputMode"
      :placeholder="props.placeholder"
      :min="props.min"
      :max="props.max"
      :step="props.step"
      :disabled="props.disabled"
      :readonly="props.readonly"
      class="text-field-input"
      @input="handleInput"
      @keydown.enter="$emit('enter')"
      @blur="$emit('blur')"
    />

    <span v-if="props.trailingText" class="text-field-trailing">{{ props.trailingText }}</span>
  </label>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { TextFieldProps, TextFieldEmits } from './types';

type Props = TextFieldProps;
type Emits = TextFieldEmits;

const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
  placeholder: '',
  type: 'text',
  inputMode: 'text',
  min: undefined,
  max: undefined,
  step: undefined,
  disabled: false,
  readonly: false,
  leadingIcon: null,
  trailingText: '',
  invalid: false,
  dense: false,
});

const stringValue = computed(() => {
  if (props.modelValue === null || props.modelValue === undefined) {
    return '';
  }

  return String(props.modelValue);
});

const emit = defineEmits<Emits>();

const handleInput = (event: Event) => {
  const target = event.target as HTMLInputElement;
  emit('update:modelValue', target.value);
};
</script>

<style scoped>
.text-field {
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

.text-field:hover {
  border-color: rgba(156, 163, 175, 0.85);
  background: rgba(255, 255, 255, 0.98);
}

.text-field:focus-within {
  border-color: rgba(59, 130, 246, 0.7);
  box-shadow:
    0 0 0 4px rgba(191, 219, 254, 0.65),
    0 10px 30px -24px rgba(59, 130, 246, 0.55);
}

.text-field-dense {
  min-height: 2.75rem;
  padding-top: 0.62rem;
  padding-bottom: 0.62rem;
}

.text-field-invalid {
  border-color: rgba(248, 113, 113, 0.75);
  box-shadow: 0 0 0 4px rgba(254, 226, 226, 0.7);
}

.text-field-disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.text-field-icon {
  display: inline-flex;
  flex-shrink: 0;
  color: #94a3b8;
}

.text-field-input {
  width: 100%;
  min-width: 0;
  flex: 1;
  border: 0;
  background: transparent;
  color: inherit;
  font-size: 0.92rem;
  line-height: 1.4;
  outline: none;
}

.text-field-input::placeholder {
  color: #94a3b8;
}

.text-field-input::-webkit-outer-spin-button,
.text-field-input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.text-field-trailing {
  flex-shrink: 0;
  font-size: 0.78rem;
  font-weight: 600;
  color: #64748b;
}

@media (prefers-reduced-motion: reduce) {
  .text-field {
    transition-duration: 0.01ms;
  }
}
</style>
