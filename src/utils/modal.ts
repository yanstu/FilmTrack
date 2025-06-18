import { ref, reactive } from 'vue'

export type ModalType = 'success' | 'warning' | 'error' | 'info' | 'confirm'

export interface ModalState {
  isOpen: boolean
  type: ModalType
  title: string
  message: string
  confirmText: string
  cancelText: string
  showCancel: boolean
  onConfirm?: () => void
  onCancel?: () => void
}

export const modalState = reactive<ModalState>({
  isOpen: false,
  type: 'info',
  title: '',
  message: '',
  confirmText: '确定',
  cancelText: '取消',
  showCancel: false,
  onConfirm: undefined,
  onCancel: undefined
})

export const modalService = {
  show(
    type: ModalType,
    title: string,
    message: string,
    options: {
      confirmText?: string
      cancelText?: string
      showCancel?: boolean
      onConfirm?: () => void
      onCancel?: () => void
    } = {}
  ) {
    modalState.isOpen = true
    modalState.type = type
    modalState.title = title
    modalState.message = message
    modalState.confirmText = options.confirmText || '确定'
    modalState.cancelText = options.cancelText || '取消'
    modalState.showCancel = options.showCancel || false
    modalState.onConfirm = options.onConfirm
    modalState.onCancel = options.onCancel
  },

  close() {
    modalState.isOpen = false
    modalState.onConfirm = undefined
    modalState.onCancel = undefined
  },

  confirm() {
    if (modalState.onConfirm) {
      modalState.onConfirm()
    }
    this.close()
  },

  cancel() {
    if (modalState.onCancel) {
      modalState.onCancel()
    }
    this.close()
  },

  // 便捷方法
  success(title: string, message: string, onConfirm?: () => void) {
    this.show('success', title, message, { onConfirm })
  },

  error(title: string, message: string, onConfirm?: () => void) {
    this.show('error', title, message, { onConfirm })
  },

  warning(title: string, message: string, onConfirm?: () => void) {
    this.show('warning', title, message, { onConfirm })
  },

  info(title: string, message: string, onConfirm?: () => void) {
    this.show('info', title, message, { onConfirm })
  },

  confirmDialog(
    title: string,
    message: string,
    onConfirm?: () => void,
    onCancel?: () => void,
    options: { confirmText?: string; cancelText?: string } = {}
  ) {
    this.show('confirm', title, message, {
      showCancel: true,
      onConfirm,
      onCancel,
      ...options
    })
  }
} 