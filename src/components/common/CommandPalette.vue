<template>
  <Teleport to="body">
    <Transition name="cmdk-overlay">
      <div v-if="open" class="cmdk-overlay" @click.self="close" @contextmenu.prevent>
        <div class="cmdk-panel" role="dialog" aria-modal="true" aria-label="命令面板">
          <div class="cmdk-input-wrap">
            <SearchIcon class="cmdk-search-ico" />
            <input
              ref="inputEl"
              v-model="query"
              type="text"
              class="cmdk-input"
              :placeholder="placeholder"
              autocomplete="off"
              spellcheck="false"
              @keydown="onKeyDown"
            />
            <span class="cmdk-kbd">esc</span>
          </div>

          <div ref="listEl" class="cmdk-list scrollbar-apple">
            <template v-if="filtered.length > 0">
              <template v-for="(group, gi) in filtered" :key="group.title">
                <div class="cmdk-group-title">{{ group.title }}</div>
                <button
                  v-for="(item, ii) in group.items"
                  :key="`${gi}-${ii}-${item.id}`"
                  type="button"
                  :data-active="globalIndexOf(gi, ii) === activeIndex"
                  class="cmdk-item"
                  @mouseenter="activeIndex = globalIndexOf(gi, ii)"
                  @click="execute(item)"
                >
                  <component :is="item.icon ?? CommandIcon" class="cmdk-item-ico" />
                  <div class="cmdk-item-main">
                    <div class="cmdk-item-title" v-html="item.titleHtml ?? item.title"></div>
                    <div v-if="item.subtitle" class="cmdk-item-sub">{{ item.subtitle }}</div>
                  </div>
                  <span v-if="item.shortcut" class="cmdk-kbd">{{ item.shortcut }}</span>
                  <span v-else class="cmdk-hint">{{ item.kind }}</span>
                </button>
              </template>
            </template>
            <div v-else class="cmdk-empty">
              <SearchIcon class="cmdk-empty-ico" />
              <div class="cmdk-empty-title">没有匹配项</div>
              <div class="cmdk-empty-sub">试试作品名、页面名（首页 / 库 / 历史 / 导入）或动作（设置 / 检查更新）</div>
            </div>
          </div>

          <div class="cmdk-foot">
            <span><kbd>↑</kbd><kbd>↓</kbd> 移动</span>
            <span><kbd>↵</kbd> 选择</span>
            <span><kbd>esc</kbd> 关闭</span>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch, type Component } from 'vue';
import { useRouter } from 'vue-router';
import {
  Command as CommandIcon,
  Film as FilmIcon,
  History as HistoryIcon,
  Home as HomeIcon,
  Import as ImportIcon,
  Plus as PlusIcon,
  RefreshCcw as RefreshIcon,
  Search as SearchIcon,
  Settings as SettingsIcon,
} from 'lucide-vue-next';
import { useMovieStore } from '../../stores/movie';
import { formatShortcut } from '../../composables/useShortcuts';
// 兼容 SSR/测试环境：在浏览器才注册 open 事件
import { getTypeLabel } from '../../utils/constants';
import type { ParsedMovie } from '../../types';

interface CmdItem {
  id: string;
  title: string;
  titleHtml?: string;
  subtitle?: string;
  icon?: Component;
  kind: string;
  shortcut?: string;
  run: () => void;
}

interface CmdGroup {
  title: string;
  items: CmdItem[];
}

const router = useRouter();
const movieStore = useMovieStore();

const open = ref(false);
const query = ref('');
const activeIndex = ref(0);
const inputEl = ref<HTMLInputElement | null>(null);
const listEl = ref<HTMLDivElement | null>(null);

const placeholder = '搜索作品、页面、动作…（⌘K / Ctrl+K）';

const close = () => {
  open.value = false;
  query.value = '';
  activeIndex.value = 0;
};

const dispatchOpenSettings = () => {
  window.dispatchEvent(new CustomEvent('open-settings'));
};

const dispatchCheckUpdate = () => {
  window.dispatchEvent(new CustomEvent('open-settings', { detail: { section: 'about' } }));
  setTimeout(() => {
    window.dispatchEvent(new CustomEvent('trigger-check-update'));
  }, 250);
};

const baseActions = computed<CmdItem[]>(() => [
  {
    id: 'go-home',
    title: '首页',
    subtitle: '统计 / 追剧 / 提醒',
    icon: HomeIcon,
    kind: '页面',
    shortcut: formatShortcut({ key: '1', mod: true, handler: () => {} }),
    run: () => router.push({ name: 'Home' }),
  },
  {
    id: 'go-library',
    title: '影视库',
    subtitle: '所有作品',
    icon: FilmIcon,
    kind: '页面',
    shortcut: formatShortcut({ key: '2', mod: true, handler: () => {} }),
    run: () => router.push({ name: 'Library' }),
  },
  {
    id: 'go-record',
    title: '添加记录',
    subtitle: '搜索 + 录入新作品',
    icon: PlusIcon,
    kind: '页面',
    shortcut: formatShortcut({ key: '3', mod: true, handler: () => {} }),
    run: () => router.push({ name: 'Record' }),
  },
  {
    id: 'go-history',
    title: '历史',
    subtitle: '时间轴 / 热力图',
    icon: HistoryIcon,
    kind: '页面',
    shortcut: formatShortcut({ key: '4', mod: true, handler: () => {} }),
    run: () => router.push({ name: 'History' }),
  },
  {
    id: 'go-import',
    title: '导入',
    subtitle: '豆瓣 / CSV / JSON',
    icon: ImportIcon,
    kind: '页面',
    shortcut: formatShortcut({ key: '5', mod: true, handler: () => {} }),
    run: () => router.push({ name: 'Import' }),
  },
  {
    id: 'open-settings',
    title: '打开设置',
    subtitle: '通用 / 播放 / 关于',
    icon: SettingsIcon,
    kind: '动作',
    shortcut: formatShortcut({ key: ',', mod: true, handler: () => {} }),
    run: dispatchOpenSettings,
  },
  {
    id: 'check-update',
    title: '检查更新',
    subtitle: '立即向更新服务发起查询',
    icon: RefreshIcon,
    kind: '动作',
    run: dispatchCheckUpdate,
  },
]);

const escapeHtml = (text: string) =>
  text.replace(/[&<>"']/g, (ch) => {
    switch (ch) {
      case '&': return '&amp;';
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '"': return '&quot;';
      default: return '&#39;';
    }
  });

const highlight = (text: string, q: string) => {
  const escaped = escapeHtml(text);
  if (!q) return escaped;
  const needle = escapeHtml(q);
  return escaped.replace(
    new RegExp(needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'),
    (m) => `<mark>${m}</mark>`
  );
};

const movieToItem = (movie: ParsedMovie, q: string): CmdItem => ({
  id: `movie-${movie.id}`,
  title: movie.title,
  titleHtml: highlight(movie.title, q),
  subtitle: [getTypeLabel(movie.type), movie.year || '', movie.original_title || '']
    .filter(Boolean)
    .join(' · '),
  icon: FilmIcon,
  kind: '作品',
  run: () => router.push({ name: 'Detail', params: { id: movie.id } }),
});

const matchMovie = (movie: ParsedMovie, q: string) => {
  const lower = q.toLowerCase();
  return (
    movie.title.toLowerCase().includes(lower) ||
    (movie.original_title || '').toLowerCase().includes(lower)
  );
};

const filtered = computed<CmdGroup[]>(() => {
  const q = query.value.trim();
  const groups: CmdGroup[] = [];

  if (q) {
    const moviesMatched = movieStore.movies
      .filter((m) => matchMovie(m, q))
      .slice(0, 8)
      .map((m) => movieToItem(m, q));
    if (moviesMatched.length > 0) {
      groups.push({ title: '作品', items: moviesMatched });
    }

    const lower = q.toLowerCase();
    const actions = baseActions.value.filter(
      (a) =>
        a.title.toLowerCase().includes(lower) ||
        (a.subtitle ?? '').toLowerCase().includes(lower) ||
        a.kind.toLowerCase().includes(lower)
    );
    if (actions.length > 0) {
      groups.push({ title: '页面与动作', items: actions });
    }
  } else {
    const recent = movieStore.movies.slice(0, 5).map((m) => movieToItem(m, ''));
    if (recent.length > 0) {
      groups.push({ title: '最近添加', items: recent });
    }
    groups.push({ title: '页面与动作', items: baseActions.value });
  }

  return groups;
});

const flatItems = computed<CmdItem[]>(() => filtered.value.flatMap((g) => g.items));

const globalIndexOf = (groupIndex: number, itemIndex: number) => {
  let n = 0;
  for (let i = 0; i < groupIndex; i++) {
    n += filtered.value[i].items.length;
  }
  return n + itemIndex;
};

watch(filtered, () => {
  activeIndex.value = 0;
});

const scrollActiveIntoView = () => {
  const container = listEl.value;
  if (!container) return;
  const active = container.querySelector('[data-active="true"]') as HTMLElement | null;
  if (active) {
    active.scrollIntoView({ block: 'nearest' });
  }
};

const onKeyDown = (e: KeyboardEvent) => {
  const max = flatItems.value.length;
  if (e.key === 'Escape') {
    e.preventDefault();
    close();
    return;
  }
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    if (max === 0) return;
    activeIndex.value = (activeIndex.value + 1) % max;
    void nextTick(scrollActiveIntoView);
    return;
  }
  if (e.key === 'ArrowUp') {
    e.preventDefault();
    if (max === 0) return;
    activeIndex.value = (activeIndex.value - 1 + max) % max;
    void nextTick(scrollActiveIntoView);
    return;
  }
  if (e.key === 'Enter') {
    e.preventDefault();
    const item = flatItems.value[activeIndex.value];
    if (item) execute(item);
  }
};

const execute = (item: CmdItem) => {
  close();
  void nextTick(() => item.run());
};

const onOpenEvent = () => {
  open.value = true;
  query.value = '';
  activeIndex.value = 0;
  void nextTick(() => inputEl.value?.focus());
};

defineExpose({ openPalette: onOpenEvent });

if (typeof window !== 'undefined') {
  window.addEventListener('open-command-palette', onOpenEvent);
}
</script>

<style scoped>
.cmdk-overlay {
  position: fixed;
  inset: 0;
  z-index: 70;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 12vh 16px 16px;
}

.cmdk-panel {
  width: 100%;
  max-width: 640px;
  background: rgba(255, 255, 255, 0.98);
  border-radius: 14px;
  border: 1px solid rgba(0, 0, 0, 0.05);
  box-shadow: 0 30px 60px rgba(0, 0, 0, 0.24), 0 6px 16px rgba(0, 0, 0, 0.08);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  max-height: min(70vh, 560px);
}

.cmdk-input-wrap {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

.cmdk-search-ico {
  width: 18px;
  height: 18px;
  color: #6b7280;
  flex-shrink: 0;
}

.cmdk-input {
  flex: 1;
  border: none;
  outline: none;
  font-size: 15px;
  background: transparent;
  color: #111827;
}

.cmdk-input::placeholder {
  color: #9ca3af;
}

.cmdk-kbd {
  font-size: 11px;
  font-weight: 600;
  color: #6b7280;
  background: #f3f4f6;
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-radius: 6px;
  padding: 2px 6px;
  letter-spacing: 0.05em;
}

.cmdk-list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 4px;
}

.cmdk-group-title {
  padding: 8px 12px 4px;
  font-size: 11px;
  font-weight: 600;
  color: #9ca3af;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.cmdk-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 8px 10px;
  border-radius: 8px;
  border: none;
  background: transparent;
  cursor: pointer;
  text-align: left;
  transition: background 120ms ease;
}

.cmdk-item[data-active='true'] {
  background: rgba(59, 130, 246, 0.1);
}

.cmdk-item-ico {
  width: 16px;
  height: 16px;
  color: #4b5563;
  flex-shrink: 0;
}

.cmdk-item-main {
  flex: 1;
  min-width: 0;
}

.cmdk-item-title {
  font-size: 13px;
  font-weight: 500;
  color: #111827;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cmdk-item-title :deep(mark) {
  background: transparent;
  color: #2563eb;
  font-weight: 700;
}

.cmdk-item-sub {
  margin-top: 1px;
  font-size: 11px;
  color: #6b7280;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cmdk-hint {
  font-size: 11px;
  color: #9ca3af;
}

.cmdk-empty {
  text-align: center;
  padding: 40px 16px 32px;
  color: #6b7280;
}

.cmdk-empty-ico {
  width: 32px;
  height: 32px;
  color: #d1d5db;
  margin: 0 auto 8px;
}

.cmdk-empty-title {
  font-size: 14px;
  font-weight: 600;
  color: #4b5563;
}

.cmdk-empty-sub {
  margin-top: 4px;
  font-size: 12px;
  color: #9ca3af;
}

.cmdk-foot {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 8px 14px;
  background: #fafafa;
  border-top: 1px solid rgba(0, 0, 0, 0.04);
  font-size: 11px;
  color: #6b7280;
}

.cmdk-foot kbd {
  background: #fff;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-bottom-width: 2px;
  border-radius: 4px;
  padding: 1px 5px;
  font-family: ui-sans-serif, system-ui, -apple-system, sans-serif;
  font-size: 10px;
  margin-right: 4px;
  color: #374151;
}

.cmdk-overlay-enter-active,
.cmdk-overlay-leave-active {
  transition: opacity 160ms ease;
}

.cmdk-overlay-enter-active .cmdk-panel,
.cmdk-overlay-leave-active .cmdk-panel {
  transition: transform 180ms cubic-bezier(0.16, 1, 0.3, 1), opacity 160ms ease;
}

.cmdk-overlay-enter-from,
.cmdk-overlay-leave-to {
  opacity: 0;
}

.cmdk-overlay-enter-from .cmdk-panel,
.cmdk-overlay-leave-to .cmdk-panel {
  opacity: 0;
  transform: translateY(-8px) scale(0.98);
}
</style>
