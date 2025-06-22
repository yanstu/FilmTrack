<template>
  <!-- 编辑记录模态框 -->
  <EditRecordModal 
    :is-open="modalState.editModalVisible" 
    :movie="movie" 
    @close="$emit('closeEditModal')"
    @save="$emit('saveRecord', $event)" 
  />

  <!-- 海报预览模态框 -->
  <Modal 
    :is-open="modalState.posterPreviewVisible" 
    type="info" 
    title="海报预览" 
    message="" 
    confirm-text="关闭"
    @close="$emit('closePosterPreview')" 
    @confirm="$emit('closePosterPreview')" 
    :large="true"
  >
    <template #content>
      <div class="flex justify-center">
        <CachedImage 
          :src="getImageUrl(movie?.poster_path)"
          :alt="movie?.title"
          class-name="max-w-full max-h-[70vh] object-contain rounded-lg shadow-lg"
          fallback="/placeholder-poster.svg" 
        />
      </div>
    </template>
  </Modal>

  <!-- 提示对话框 -->
  <Modal 
    :is-open="modalState.dialog.visible" 
    :type="modalState.dialog.type" 
    :title="modalState.dialog.title" 
    :message="modalState.dialog.message"
    :show-cancel="modalState.dialog.type === 'confirm'" 
    @close="$emit('closeDialog')" 
    @confirm="modalState.dialog.onConfirm" 
  />
</template>

<script setup lang="ts">
import Modal from '../../../components/ui/Modal.vue';
import EditRecordModal from '../../../components/ui/EditRecordModal.vue';
import CachedImage from '../../../components/ui/CachedImage.vue';
import type { Movie } from '../../../types';
import type { ModalState } from '../types';

interface Props {
  modalState: ModalState;
  movie: Movie | null;
  getImageUrl: (path: string | undefined) => string;
}

interface Emits {
  (e: 'closeEditModal'): void;
  (e: 'closePosterPreview'): void;
  (e: 'closeDialog'): void;
  (e: 'saveRecord', movie: Movie): void;
}

defineProps<Props>();
defineEmits<Emits>();
</script>
