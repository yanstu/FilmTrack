/**
 * 影视库批量选择逻辑
 */

import { ref, type Ref } from 'vue';
import { useMovieStore } from '../../../stores/movie';
import { useAppStore } from '../../../stores/app';
import type { SelectionState } from '../types';

export function useSelectionLogic(
  selectionState: Ref<SelectionState>,
  refreshData: () => void
) {
  const movieStore = useMovieStore();
  const appStore = useAppStore();

  // 启用选择模式
  const enableSelectionMode = () => {
    selectionState.value.isSelectionMode = true;
    selectionState.value.selectedItems = [];
  };

  // 取消选择模式
  const cancelSelectionMode = () => {
    selectionState.value.isSelectionMode = false;
    selectionState.value.selectedItems = [];
  };

  // 切换选择项
  const toggleSelectItem = (id: string) => {
    const index = selectionState.value.selectedItems.indexOf(id);
    if (index === -1) {
      selectionState.value.selectedItems.push(id);
    } else {
      selectionState.value.selectedItems.splice(index, 1);
    }
  };

  // 检查项目是否被选中
  const isItemSelected = (id: string) => {
    return selectionState.value.selectedItems.includes(id);
  };

  // 确认删除
  const confirmDelete = () => {
    if (selectionState.value.selectedItems.length === 0) return;
    selectionState.value.showDeleteConfirm = true;
    selectionState.value.confirmInput = '';
  };

  // 取消删除
  const cancelDelete = () => {
    selectionState.value.showDeleteConfirm = false;
    selectionState.value.confirmInput = '';
  };

  // 执行删除
  const executeDelete = async () => {
    if (selectionState.value.confirmInput !== 'y') return;

    try {
      // 批量删除选中的影视作品
      for (const movieId of selectionState.value.selectedItems) {
        await movieStore.deleteMovie(movieId);
      }

      // 显示成功消息
      appStore.showMessage({
        type: 'success',
        message: `成功删除 ${selectionState.value.selectedItems.length} 个影视作品`
      });

      // 重置状态
      selectionState.value.showDeleteConfirm = false;
      selectionState.value.confirmInput = '';
      selectionState.value.isSelectionMode = false;
      selectionState.value.selectedItems = [];

      // 刷新数据
      refreshData();
    } catch (error) {
      appStore.showMessage({
        type: 'error',
        message: '删除失败，请重试'
      });
    }
  };

  return {
    enableSelectionMode,
    cancelSelectionMode,
    toggleSelectItem,
    isItemSelected,
    confirmDelete,
    cancelDelete,
    executeDelete
  };
}
