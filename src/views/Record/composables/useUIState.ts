/**
 * Record 页面 UI 状态管理
 */

import { ref, type Ref } from 'vue';
import type { RecordForm, DialogState } from '../types';

export function useUIState() {
  // 图片预览状态
  const imagePreviewVisible = ref(false);

  // 对话框状态
  const dialog = ref<DialogState>({
    visible: false,
    type: 'info',
    title: '',
    message: '',
    onConfirm: () => {}
  });

  // 显示图片预览
  const showImagePreview = (form: Ref<RecordForm>) => {
    if (form.value.poster_path) {
      imagePreviewVisible.value = true;
    }
  };

  // 显示对话框
  const showDialog = (
    type: DialogState['type'], 
    title: string, 
    message: string, 
    onConfirm?: () => void
  ) => {
    dialog.value = {
      visible: true,
      type,
      title,
      message,
      onConfirm: onConfirm || (() => {})
    };
  };

  // 关闭对话框
  const closeDialog = () => {
    dialog.value.visible = false;
  };

  // 关闭图片预览
  const closeImagePreview = () => {
    imagePreviewVisible.value = false;
  };

  return {
    imagePreviewVisible,
    dialog,
    showImagePreview,
    showDialog,
    closeDialog,
    closeImagePreview
  };
}
