<template>
  <Teleport to="body">
    <Transition name="help-fade">
      <div v-if="visible" class="help-overlay" @click.self="close" @contextmenu.prevent>
        <div class="help-panel" role="dialog" aria-modal="true" aria-label="键盘快捷键">
          <div class="help-head">
            <div>
              <h3 class="help-title">键盘快捷键</h3>
              <p class="help-sub">桌面端常用操作，按 esc 关闭</p>
            </div>
            <button class="help-close" type="button" aria-label="关闭" @click="close">
              <XIcon class="w-4 h-4" />
            </button>
          </div>

          <div class="help-body scrollbar-apple">
            <section v-for="group in groups" :key="group.title" class="help-group">
              <div class="help-group-title">{{ group.title }}</div>
              <ul class="help-list">
                <li v-for="item in group.items" :key="item.label" class="help-item">
                  <span class="help-label">{{ item.label }}</span>
                  <span class="help-keys">
                    <kbd v-for="(k, ki) in splitKeys(item.keys)" :key="ki" class="help-kbd">{{ k }}</kbd>
                  </span>
                </li>
              </ul>
            </section>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { X as XIcon } from 'lucide-vue-next';
import { isMacOS } from '../../utils/platform';

const props = defineProps<{ visible: boolean }>();
const emit = defineEmits<{ close: [] }>();

const close = () => emit('close');

const mod = computed(() => (isMacOS() ? '⌘' : 'Ctrl'));

const groups = computed(() => [
  {
    title: '全局',
    items: [
      { label: '打开命令面板', keys: `${mod.value}+K` },
      { label: '打开设置', keys: `${mod.value}+,` },
      { label: '快捷键帮助', keys: `${mod.value}+/` },
      { label: '关闭弹窗 / 命令面板', keys: 'esc' },
    ],
  },
  {
    title: '页面跳转',
    items: [
      { label: '首页', keys: `${mod.value}+1` },
      { label: '影视库', keys: `${mod.value}+2` },
      { label: '添加记录', keys: `${mod.value}+3` },
      { label: '历史', keys: `${mod.value}+4` },
      { label: '导入', keys: `${mod.value}+5` },
    ],
  },
  {
    title: '列表与卡片',
    items: [
      { label: '右键作品卡片：快捷操作', keys: '右键' },
      { label: '命令面板内移动 / 选择', keys: '↑ ↓ ↵' },
    ],
  },
]);

const splitKeys = (combo: string): string[] => {
  if (combo.includes('+')) return combo.split('+');
  // mac 风格无加号：拆成单字符（⌘ ⌥ ⇧ ⌃ 和 ASCII 数字字母 / 符号）
  return Array.from(combo);
};
</script>

<style scoped>
.help-overlay {
  position: fixed;
  inset: 0;
  z-index: 75;
  background: rgba(15, 23, 42, 0.4);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}

.help-panel {
  width: 100%;
  max-width: 560px;
  background: #fff;
  border-radius: 16px;
  border: 1px solid rgba(0, 0, 0, 0.05);
  box-shadow: 0 30px 60px rgba(0, 0, 0, 0.24);
  display: flex;
  flex-direction: column;
  max-height: min(80vh, 640px);
}

.help-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 18px 20px 14px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

.help-title {
  font-size: 16px;
  font-weight: 600;
  color: #111827;
}

.help-sub {
  margin-top: 2px;
  font-size: 12px;
  color: #6b7280;
}

.help-close {
  border: none;
  background: transparent;
  padding: 6px;
  border-radius: 8px;
  color: #6b7280;
  cursor: pointer;
}

.help-close:hover {
  background: #f3f4f6;
  color: #111827;
}

.help-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 12px 20px 20px;
}

.help-group + .help-group {
  margin-top: 18px;
}

.help-group-title {
  font-size: 11px;
  font-weight: 600;
  color: #6b7280;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  margin-bottom: 8px;
}

.help-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.help-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid rgba(0, 0, 0, 0.04);
  font-size: 13px;
  color: #1f2937;
}

.help-item:last-child {
  border-bottom: none;
}

.help-keys {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.help-kbd {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 22px;
  height: 22px;
  padding: 0 6px;
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-bottom-width: 2px;
  border-radius: 5px;
  background: #fafafa;
  font-family: ui-sans-serif, system-ui, -apple-system, sans-serif;
  font-size: 11px;
  font-weight: 600;
  color: #374151;
}

.help-fade-enter-active,
.help-fade-leave-active {
  transition: opacity 160ms ease;
}

.help-fade-enter-active .help-panel,
.help-fade-leave-active .help-panel {
  transition: transform 180ms cubic-bezier(0.16, 1, 0.3, 1), opacity 160ms ease;
}

.help-fade-enter-from,
.help-fade-leave-to {
  opacity: 0;
}

.help-fade-enter-from .help-panel,
.help-fade-leave-to .help-panel {
  opacity: 0;
  transform: translateY(-8px) scale(0.98);
}
</style>
