/**
 * Detail 页面 UI 状态管理
 */

import { ref, nextTick } from 'vue';
import type { ModalState, DialogState } from '../types';

export function useDetailUI() {
  // 模态框状态
  const modalState = ref<ModalState>({
    editModalVisible: false,
    posterPreviewVisible: false,
    dialog: {
      visible: false,
      type: 'info',
      title: '',
      message: '',
      onConfirm: () => {}
    }
  });

  // 显示编辑模态框
  const editRecord = () => {
    modalState.value.editModalVisible = true;
  };

  // 显示海报预览
  const showPosterPreview = () => {
    modalState.value.posterPreviewVisible = true;
  };

  // 显示对话框
  const showDialog = (
    type: DialogState['type'], 
    title: string, 
    message: string, 
    onConfirm?: () => void
  ) => {
    // 使用nextTick避免在同一渲染周期内多次更新状态
    nextTick(() => {
      modalState.value.dialog = {
        visible: true,
        type,
        title,
        message,
        onConfirm: onConfirm || (() => { modalState.value.dialog.visible = false; })
      };
    });
  };

  // 关闭编辑模态框
  const closeEditModal = () => {
    modalState.value.editModalVisible = false;
  };

  // 关闭海报预览
  const closePosterPreview = () => {
    modalState.value.posterPreviewVisible = false;
  };

  // 关闭对话框
  const closeDialog = () => {
    modalState.value.dialog.visible = false;
  };

  return {
    modalState,
    editRecord,
    showPosterPreview,
    showDialog,
    closeEditModal,
    closePosterPreview,
    closeDialog
  };
}
