<template>
  <Teleport to="body">
    <Transition name="overlay" appear>
      <div
        v-if="visible"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
        @click="handleOverlayClick"
      >
        <Transition name="dialog" appear>
          <div
            v-if="visible"
            class="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl p-6 mx-4 max-w-md w-full"
            @click.stop
          >
            <!-- 图标区域 -->
            <div v-if="type !== 'confirm'" class="flex justify-center mb-4">
              <div
                class="w-16 h-16 rounded-full flex items-center justify-center"
                :class="{
                  'bg-green-100': type === 'success',
                  'bg-red-100': type === 'error',
                  'bg-yellow-100': type === 'warning',
                  'bg-blue-100': type === 'info'
                }"
              >
                <CheckCircleIcon
                  v-if="type === 'success'"
                  :size="32"
                  class="text-green-600"
                />
                <XCircleIcon
                  v-else-if="type === 'error'"
                  :size="32"
                  class="text-red-600"
                />
                <AlertTriangleIcon
                  v-else-if="type === 'warning'"
                  :size="32"
                  class="text-yellow-600"
                />
                <InfoIcon
                  v-else-if="type === 'info'"
                  :size="32"
                  class="text-blue-600"
                />
              </div>
            </div>

            <!-- 标题 -->
            <h3 v-if="title" class="text-lg font-semibold text-gray-900 text-center mb-2">
              {{ title }}
            </h3>

            <!-- 内容 -->
            <p class="text-gray-700 text-center mb-6 leading-relaxed">
              {{ message }}
            </p>

            <!-- 按钮区域 -->
            <div class="flex space-x-3">
              <button
                v-if="type === 'confirm'"
                @click="handleCancel"
                class="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 
                       text-gray-700 font-medium rounded-xl transition-colors duration-200"
              >
                {{ cancelText }}
              </button>
              <button
                @click="handleConfirm"
                class="px-4 py-3 font-medium rounded-xl transition-colors duration-200"
                :class="{
                  'flex-1 bg-blue-600 hover:bg-blue-700 text-white': type === 'confirm',
                  'w-full bg-green-600 hover:bg-green-700 text-white': type === 'success',
                  'w-full bg-red-600 hover:bg-red-700 text-white': type === 'error',
                  'w-full bg-yellow-600 hover:bg-yellow-700 text-white': type === 'warning',
                  'w-full bg-blue-600 hover:bg-blue-700 text-white': type === 'info'
                }"
              >
                {{ confirmText }}
              </button>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import {
  CheckCircle as CheckCircleIcon,
  XCircle as XCircleIcon,
  AlertTriangle as AlertTriangleIcon,
  Info as InfoIcon
} from 'lucide-vue-next';

interface Props {
  visible: boolean;
  type?: 'success' | 'error' | 'warning' | 'info' | 'confirm';
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  allowOverlayClose?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  type: 'info',
  confirmText: '确定',
  cancelText: '取消',
  allowOverlayClose: true
});

const emit = defineEmits<{
  confirm: [];
  cancel: [];
  close: [];
}>();

const handleConfirm = () => {
  emit('confirm');
  emit('close');
};

const handleCancel = () => {
  emit('cancel');
  emit('close');
};

const handleOverlayClick = () => {
  if (props.allowOverlayClose) {
    emit('close');
  }
};

const handleEscapeKey = (event: KeyboardEvent) => {
  if (event.key === 'Escape' && props.visible) {
    if (props.type === 'confirm') {
      handleCancel();
    } else {
      emit('close');
    }
  }
};

onMounted(() => {
  document.addEventListener('keydown', handleEscapeKey);
});

onUnmounted(() => {
  document.removeEventListener('keydown', handleEscapeKey);
});
</script>

<style scoped>
.overlay-enter-active,
.overlay-leave-active {
  transition: opacity 0.3s ease;
}

.overlay-enter-from,
.overlay-leave-to {
  opacity: 0;
}

.dialog-enter-active,
.dialog-leave-active {
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.dialog-enter-from,
.dialog-leave-to {
  opacity: 0;
  transform: scale(0.9) translateY(-20px);
}
</style> 