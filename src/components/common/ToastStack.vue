<template>
  <Teleport to="body">
    <div class="toast-stack" role="status" aria-live="polite">
      <TransitionGroup name="toast-stack-anim" tag="div" class="toast-stack-inner">
        <ToastItemView
          v-for="item in stack"
          :key="item.id"
          :item="item"
          @dismiss="dismiss(item.id)"
        />
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { useToastStack } from '../../utils/toast';
import ToastItemView from './ToastItemView.vue';

const { stack, dismiss } = useToastStack();
</script>

<style scoped>
.toast-stack {
  position: fixed;
  top: 16px;
  right: 16px;
  z-index: 90;
  pointer-events: none;
}

.toast-stack-inner {
  display: flex;
  flex-direction: column;
  gap: 10px;
  pointer-events: none;
}

.toast-stack-inner > :deep(*) {
  pointer-events: auto;
}

/* 入场：从右上角小幅滑入 */
.toast-stack-anim-enter-active {
  transition: transform 260ms cubic-bezier(0.22, 1, 0.36, 1), opacity 200ms ease-out;
}
.toast-stack-anim-leave-active {
  transition: transform 180ms ease-in, opacity 160ms ease-in;
  position: absolute;
}
.toast-stack-anim-enter-from {
  opacity: 0;
  transform: translate(12px, -8px) scale(0.96);
}
.toast-stack-anim-leave-to {
  opacity: 0;
  transform: translateX(12px);
}

@media (prefers-reduced-motion: reduce) {
  .toast-stack-anim-enter-active,
  .toast-stack-anim-leave-active {
    transition: opacity 120ms ease;
  }
  .toast-stack-anim-enter-from,
  .toast-stack-anim-leave-to {
    transform: none;
  }
}
</style>
