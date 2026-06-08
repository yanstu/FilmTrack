/**
 * 全局快捷键管理
 *
 * - 集中注册 / 卸载，避免多处 addEventListener 散落
 * - 自动识别 macOS 的 ⌘ 与其它平台的 Ctrl
 * - 默认在输入框 / textarea / contenteditable 焦点中跳过（按需打开 allowInInput）
 */
import { onBeforeUnmount, onMounted } from 'vue';
import { isMacOS } from '../utils/platform';

export type KeyHandler = (event: KeyboardEvent) => void;

export interface ShortcutBinding {
  /** 单字符（小写）或特殊键，如 'k' / 'n' / ',' / '/' / 'Escape' / 'ArrowUp' */
  key: string;
  /** 在 mac 上要求 ⌘、其它平台要求 Ctrl；默认 false */
  mod?: boolean;
  /** 要求 Shift；默认 false */
  shift?: boolean;
  /** 要求 Alt/Option；默认 false */
  alt?: boolean;
  /** 输入框内是否允许触发；默认 false */
  allowInInput?: boolean;
  /** 处理器返回 false 时不阻止默认行为；默认会 preventDefault */
  handler: KeyHandler;
  /** 调试名 */
  label?: string;
}

interface NormalizedBinding extends ShortcutBinding {
  normalizedKey: string;
}

const INPUT_SELECTOR = 'input, textarea, [contenteditable="true"]';

const matches = (e: KeyboardEvent, b: NormalizedBinding) => {
  const wantMod = !!b.mod;
  const hasMod = isMacOS() ? e.metaKey : e.ctrlKey;
  if (wantMod !== hasMod) return false;
  if (!!b.shift !== e.shiftKey) return false;
  if (!!b.alt !== e.altKey) return false;
  return e.key.toLowerCase() === b.normalizedKey;
};

const normalize = (b: ShortcutBinding): NormalizedBinding => ({
  ...b,
  normalizedKey: b.key.toLowerCase(),
});

export interface ShortcutsApi {
  add: (binding: ShortcutBinding) => () => void;
  addMany: (bindings: ShortcutBinding[]) => () => void;
  bindings: () => ReadonlyArray<ShortcutBinding>;
}

const formatModSymbol = () => (isMacOS() ? '⌘' : 'Ctrl');

/** 把 binding 格式化成可读字符串，例如 "⌘K" / "Ctrl+Shift+/" */
export const formatShortcut = (b: ShortcutBinding): string => {
  const parts: string[] = [];
  if (b.mod) parts.push(formatModSymbol());
  if (b.shift) parts.push(isMacOS() ? '⇧' : 'Shift');
  if (b.alt) parts.push(isMacOS() ? '⌥' : 'Alt');
  const key = b.key.length === 1 ? b.key.toUpperCase() : b.key;
  parts.push(key);
  return parts.join(isMacOS() ? '' : '+');
};

/**
 * 一次性注册一组快捷键，组件卸载自动清理。
 */
export function useShortcuts(bindings: ShortcutBinding[]): ShortcutsApi {
  const list: NormalizedBinding[] = bindings.map(normalize);

  const onKeyDown = (e: KeyboardEvent) => {
    const inInput =
      e.target instanceof HTMLElement &&
      e.target.closest(INPUT_SELECTOR) !== null;

    for (const b of list) {
      if (!matches(e, b)) continue;
      if (inInput && !b.allowInInput) continue;
      e.preventDefault();
      b.handler(e);
      return;
    }
  };

  onMounted(() => {
    window.addEventListener('keydown', onKeyDown);
  });

  onBeforeUnmount(() => {
    window.removeEventListener('keydown', onKeyDown);
  });

  const add: ShortcutsApi['add'] = (binding) => {
    const n = normalize(binding);
    list.push(n);
    return () => {
      const i = list.indexOf(n);
      if (i >= 0) list.splice(i, 1);
    };
  };

  return {
    add,
    addMany: (bs) => {
      const offs = bs.map((b) => add(b));
      return () => offs.forEach((off) => off());
    },
    bindings: () => list,
  };
}
