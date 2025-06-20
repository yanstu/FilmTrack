<template>
  <TransitionRoot appear :show="isOpen" as="template">
    <Dialog as="div" @close="closeModal" class="relative z-50">
      <TransitionChild
        as="template"
        enter="duration-300 ease-out"
        enter-from="opacity-0"
        enter-to="opacity-100"
        leave="duration-200 ease-in"
        leave-from="opacity-100"
        leave-to="opacity-0"
      >
        <div class="fixed inset-0 bg-black/30 backdrop-blur-sm" />
      </TransitionChild>

      <div class="fixed inset-0 overflow-y-auto">
        <div class="flex min-h-full items-center justify-center p-4 text-center">
          <TransitionChild
            as="template"
            enter="duration-300 ease-out"
            enter-from="opacity-0 scale-95"
            enter-to="opacity-100 scale-100"
            leave="duration-200 ease-in"
            leave-from="opacity-100 scale-100"
            leave-to="opacity-0 scale-95"
          >
            <DialogPanel 
              :class="[
                'w-full transform overflow-hidden rounded-2xl bg-white backdrop-blur-xl border border-gray-200/50 p-6 text-left align-middle shadow-2xl transition-all',
                props.large ? 'max-w-4xl' : 'max-w-md'
              ]"
            >
              <!-- 标题 -->
              <DialogTitle
                as="h3"
                class="text-lg font-semibold leading-6 text-gray-900 mb-4 flex items-center"
              >
                <component 
                  :is="iconComponent" 
                  v-if="iconComponent"
                  :class="iconClass"
                  class="mr-3 w-5 h-5"
                />
                {{ title }}
              </DialogTitle>

              <!-- 内容 -->
              <div class="mt-2">
                <slot name="content">
                  <p class="text-sm text-gray-600 leading-relaxed">
                    {{ message }}
                  </p>
                </slot>
              </div>

              <!-- 按钮 -->
              <div class="mt-6 flex justify-end space-x-3">
                <button
                  v-if="showCancel"
                  type="button"
                  class="inline-flex justify-center rounded-xl border border-gray-300 
                         bg-white px-4 py-2 text-sm font-medium text-gray-700 
                         hover:bg-gray-50 focus:outline-none focus:ring-2 
                         focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200"
                  @click="handleCancel"
                >
                  {{ cancelText }}
                </button>
                
                <button
                  type="button"
                  :class="[
                    'inline-flex justify-center rounded-xl border border-transparent px-4 py-2 text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors duration-200',
                    confirmButtonClass
                  ]"
                  @click="handleConfirm"
                >
                  {{ confirmText }}
                </button>
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </div>
    </Dialog>
  </TransitionRoot>
</template>

<script setup lang="ts">
import { computed, nextTick } from 'vue'
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  TransitionChild,
  TransitionRoot,
} from '@headlessui/vue'
import { 
  CheckCircle,
  AlertTriangle,
  Info,
  XCircle
} from 'lucide-vue-next'

type ModalType = 'success' | 'warning' | 'error' | 'info' | 'confirm'

interface Props {
  isOpen: boolean
  type?: ModalType
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  showCancel?: boolean
  large?: boolean
}

interface Emits {
  (e: 'close'): void
  (e: 'confirm'): void
  (e: 'cancel'): void
}

const props = withDefaults(defineProps<Props>(), {
  type: 'info',
  confirmText: '确定',
  cancelText: '取消',
  showCancel: false,
  large: false
})

const emit = defineEmits<Emits>()

const iconComponent = computed(() => {
  switch (props.type) {
    case 'success': return CheckCircle
    case 'warning': return AlertTriangle
    case 'error': return XCircle
    case 'info': return Info
    case 'confirm': return AlertTriangle
    default: return Info
  }
})

const iconClass = computed(() => {
  switch (props.type) {
    case 'success': return 'text-green-600'
    case 'warning': return 'text-yellow-600'
    case 'error': return 'text-red-600'
    case 'info': return 'text-blue-600'
    case 'confirm': return 'text-orange-600'
    default: return 'text-blue-600'
  }
})

const confirmButtonClass = computed(() => {
  switch (props.type) {
    case 'success': return 'bg-green-600 hover:bg-green-700 focus:ring-green-500'
    case 'warning': return 'bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500'
    case 'error': return 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
    case 'info': return 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
    case 'confirm': return 'bg-orange-600 hover:bg-orange-700 focus:ring-orange-500'
    default: return 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
  }
})

const closeModal = () => {
  nextTick(() => {
    emit('close')
  })
}

const handleConfirm = () => {
  emit('confirm')
}

const handleCancel = () => {
  emit('cancel')
}
</script> 