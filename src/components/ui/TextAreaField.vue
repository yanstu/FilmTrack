<template>
  <label
    :class="[
      'text-area-field',
      {
        'text-area-field-invalid': props.invalid,
        'text-area-field-disabled': props.disabled,
      }
    ]"
  >
    <textarea
      :value="props.modelValue ?? ''"
      :rows="props.rows"
      :placeholder="props.placeholder"
      :disabled="props.disabled"
      class="text-area-input"
      @input="handleInput"
      @blur="$emit('blur')"
    ></textarea>
  </label>
</template>

<script setup lang="ts">
import type { TextAreaFieldProps, TextAreaFieldEmits } from './types';

type Props = TextAreaFieldProps;
type Emits = TextAreaFieldEmits;

const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
  placeholder: '',
  rows: 4,
  disabled: false,
  invalid: false,
});

const emit = defineEmits<Emits>();

const handleInput = (event: Event) => {
  const target = event.target as HTMLTextAreaElement;
  emit('update:modelValue', target.value);
};
</script>

<style scoped>
.text-area-field {
  display: block;
  width: 100%;
  border-radius: 1rem;
  border: 1px solid rgba(209, 213, 219, 0.7);
  background: rgba(255, 255, 255, 0.92);
  padding: 0.9rem 1rem;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
  transition:
    border-color 160ms ease,
    box-shadow 160ms ease,
    background-color 160ms ease;
}

.text-area-field:hover {
  border-color: rgba(156, 163, 175, 0.85);
  background: rgba(255, 255, 255, 0.98);
}

.text-area-field:focus-within {
  border-color: rgba(59, 130, 246, 0.7);
  box-shadow:
    0 0 0 4px rgba(191, 219, 254, 0.65),
    0 10px 30px -24px rgba(59, 130, 246, 0.55);
}

.text-area-field-invalid {
  border-color: rgba(248, 113, 113, 0.75);
  box-shadow: 0 0 0 4px rgba(254, 226, 226, 0.7);
}

.text-area-field-disabled {
  opacity: 0.6;
}

.text-area-input {
  display: block;
  width: 100%;
  resize: vertical;
  border: 0;
  background: transparent;
  color: #111827;
  font-size: 0.92rem;
  line-height: 1.55;
  outline: none;
}

.text-area-input::placeholder {
  color: #94a3b8;
}

@media (prefers-reduced-motion: reduce) {
  .text-area-field {
    transition-duration: 0.01ms;
  }
}
</style>
