/**
 * 全局右键菜单状态
 *
 * 使用方式：
 *   const { openMenu } = useContextMenu();
 *   <div data-context-menu @contextmenu.prevent="openMenu($event, items)">
 *
 * 顶层 <ContextMenu /> 负责实际渲染（已挂在 App.vue 上）。
 *
 * 注意：main.ts 全局禁用了非输入框的右键菜单；带 `data-context-menu`
 * 的元素已在 main.ts 中放行。
 */
import { reactive, readonly } from 'vue';
import type { Component } from 'vue';

export interface ContextMenuItem {
  id: string;
  label: string;
  icon?: Component;
  /** 危险操作（红色样式） */
  danger?: boolean;
  /** 是否禁用 */
  disabled?: boolean;
  /** 点击回调；返回 false 不关闭菜单 */
  onSelect: () => void | boolean | Promise<void>;
}

export interface ContextMenuDivider {
  id: string;
  divider: true;
}

export type ContextMenuEntry = ContextMenuItem | ContextMenuDivider;

interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  items: ContextMenuEntry[];
}

const state = reactive<ContextMenuState>({
  visible: false,
  x: 0,
  y: 0,
  items: [],
});

const open = (event: MouseEvent, items: ContextMenuEntry[]) => {
  event.stopPropagation();
  state.x = event.clientX;
  state.y = event.clientY;
  state.items = items;
  state.visible = true;
};

const close = () => {
  state.visible = false;
  state.items = [];
};

export const isDivider = (entry: unknown): boolean =>
  !!entry && typeof entry === 'object' && (entry as { divider?: boolean }).divider === true;

export function useContextMenu() {
  return {
    state: readonly(state),
    openMenu: open,
    closeMenu: close,
  };
}
