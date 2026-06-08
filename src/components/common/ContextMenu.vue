<template>
  <Teleport to="body">
    <Transition name="ctx-fade">
      <div
        v-if="state.visible"
        ref="menuEl"
        class="context-menu"
        :style="positionStyle"
        role="menu"
        @click.stop
        @contextmenu.prevent
      >
        <template v-for="entry in state.items" :key="entry.id">
          <div v-if="isDivider(entry)" class="ctx-divider" />
          <button
            v-else
            type="button"
            class="ctx-item"
            :class="{ danger: (entry as ContextMenuItem).danger, disabled: (entry as ContextMenuItem).disabled }"
            :disabled="(entry as ContextMenuItem).disabled"
            role="menuitem"
            @click="handleSelect(entry as ContextMenuItem)"
          >
            <component :is="(entry as ContextMenuItem).icon" v-if="(entry as ContextMenuItem).icon" class="ctx-icon" />
            <span class="ctx-label">{{ (entry as ContextMenuItem).label }}</span>
          </button>
        </template>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { isDivider, useContextMenu } from '../../composables/useContextMenu';
import type { ContextMenuItem } from '../../composables/useContextMenu';

const { state, closeMenu } = useContextMenu();
const menuEl = ref<HTMLDivElement | null>(null);

const positionStyle = computed(() => ({
  left: `${state.x}px`,
  top: `${state.y}px`,
}));

const handleSelect = async (item: ContextMenuItem) => {
  if (item.disabled) return;
  const result = await item.onSelect();
  if (result !== false) {
    closeMenu();
  }
};

const onGlobalDown = (event: MouseEvent) => {
  if (!state.visible) return;
  const target = event.target as Node | null;
  if (menuEl.value && target && menuEl.value.contains(target)) return;
  closeMenu();
};

const onEsc = (event: KeyboardEvent) => {
  if (state.visible && event.key === 'Escape') {
    event.preventDefault();
    closeMenu();
  }
};

const onScroll = () => state.visible && closeMenu();
const onResize = () => state.visible && closeMenu();

const clampInsideViewport = () => {
  const el = menuEl.value;
  if (!el) return;
  const rect = el.getBoundingClientRect();
  const overflowX = rect.right - window.innerWidth;
  const overflowY = rect.bottom - window.innerHeight;
  if (overflowX > 0) {
    el.style.left = `${Math.max(8, state.x - rect.width)}px`;
  }
  if (overflowY > 0) {
    el.style.top = `${Math.max(8, state.y - rect.height)}px`;
  }
};

watch(
  () => state.visible,
  (visible) => {
    if (visible) {
      void nextTick(clampInsideViewport);
    }
  }
);

onMounted(() => {
  window.addEventListener('mousedown', onGlobalDown, true);
  window.addEventListener('keydown', onEsc);
  window.addEventListener('scroll', onScroll, true);
  window.addEventListener('resize', onResize);
});

onBeforeUnmount(() => {
  window.removeEventListener('mousedown', onGlobalDown, true);
  window.removeEventListener('keydown', onEsc);
  window.removeEventListener('scroll', onScroll, true);
  window.removeEventListener('resize', onResize);
});
</script>

<style scoped>
.context-menu {
  position: fixed;
  z-index: 80;
  min-width: 180px;
  padding: 4px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.98);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(0, 0, 0, 0.06);
  box-shadow: 0 12px 36px rgba(0, 0, 0, 0.18), 0 2px 6px rgba(0, 0, 0, 0.08);
}

.ctx-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 7px 10px;
  border-radius: 6px;
  font-size: 13px;
  color: #1f2937;
  text-align: left;
  cursor: pointer;
  transition: background 120ms ease, color 120ms ease;
  background: transparent;
  border: none;
}

.ctx-item:hover:not(.disabled) {
  background: #f3f4f6;
}

.ctx-item.danger {
  color: #b91c1c;
}

.ctx-item.danger:hover:not(.disabled) {
  background: #fef2f2;
}

.ctx-item.disabled {
  color: #9ca3af;
  cursor: not-allowed;
}

.ctx-icon {
  width: 14px;
  height: 14px;
  color: currentColor;
  flex-shrink: 0;
}

.ctx-label {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ctx-divider {
  height: 1px;
  margin: 4px 6px;
  background: rgba(0, 0, 0, 0.06);
}

.ctx-fade-enter-active,
.ctx-fade-leave-active {
  transition: opacity 120ms ease, transform 120ms ease;
}

.ctx-fade-enter-from,
.ctx-fade-leave-to {
  opacity: 0;
  transform: translateY(-4px) scale(0.98);
  transform-origin: top left;
}
</style>
