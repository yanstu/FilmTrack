<template>
  <button
    type="button"
    :disabled="props.disabled"
    :aria-checked="props.modelValue"
    role="switch"
    :class="['toggle-switch', { 'toggle-switch-active': props.modelValue, 'toggle-switch-disabled': props.disabled }]"
    @click="emit('update:modelValue', !props.modelValue)"
  >
    <span class="toggle-switch-knob"></span>
  </button>
</template>

<script setup lang="ts">
import type { ToggleSwitchProps, ToggleSwitchEmits } from './types';

type Props = ToggleSwitchProps;
type Emits = ToggleSwitchEmits;

const props = withDefaults(defineProps<Props>(), {
  modelValue: false,
  disabled: false,
});

const emit = defineEmits<Emits>();
</script>

<style scoped>
.toggle-switch {
  position: relative;
  display: inline-flex;
  height: 2rem;
  width: 3.5rem;
  align-items: center;
  border: 0;
  border-radius: 9999px;
  background: #cbd5e1;
  padding: 0 0.2rem;
  transition:
    background-color 180ms ease,
    box-shadow 180ms ease,
    transform 180ms ease;
}

.toggle-switch:hover {
  box-shadow: 0 10px 24px -20px rgba(15, 23, 42, 0.75);
}

.toggle-switch:focus-visible {
  outline: none;
  box-shadow: 0 0 0 4px rgba(191, 219, 254, 0.8);
}

.toggle-switch-active {
  background: linear-gradient(135deg, #2563eb, #1d4ed8);
}

.toggle-switch-disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.toggle-switch-knob {
  display: block;
  height: 1.55rem;
  width: 1.55rem;
  border-radius: 9999px;
  background: #ffffff;
  box-shadow: 0 8px 18px -14px rgba(15, 23, 42, 0.75);
  transition: transform 220ms cubic-bezier(0.34, 1.56, 0.64, 1);
}

.toggle-switch-active .toggle-switch-knob {
  transform: translateX(1.45rem);
}

@media (prefers-reduced-motion: reduce) {
  .toggle-switch,
  .toggle-switch-knob {
    transition-duration: 0.01ms;
  }
}
</style>
