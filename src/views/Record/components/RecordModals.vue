<template>
  <!-- 图片预览模态框 -->
  <Modal
    :is-open="imagePreviewVisible"
    type="info"
    title="封面预览"
    :message="''"
    confirm-text="关闭"
    @close="$emit('closeImagePreview')"
    @confirm="$emit('closeImagePreview')"
    :large="true"
  >
    <template #content>
      <div class="flex justify-center">
        <CachedImage
          :src="getImageUrl(form.poster_path)"
          :alt="form.title"
          class-name="max-w-full max-h-[70vh] object-contain rounded-lg shadow-lg"
        />
      </div>
    </template>
  </Modal>

  <!-- 提示对话框 -->
  <Modal
    :is-open="dialog.visible"
    :type="dialog.type"
    :title="dialog.title"
    :message="dialog.message"
    :show-cancel="dialog.type === 'confirm'"
    @close="$emit('closeDialog')"
    @confirm="dialog.onConfirm"
  />
</template>

<script setup lang="ts">
import Modal from '../../../components/ui/Modal.vue';
import CachedImage from '../../../components/ui/CachedImage.vue';
import type { RecordForm, DialogState } from '../types';

import type { RecordModalsProps, RecordModalsEmits } from '../types';

type Props = RecordModalsProps;
type Emits = RecordModalsEmits;

defineProps<Props>();
defineEmits<Emits>();
</script>
