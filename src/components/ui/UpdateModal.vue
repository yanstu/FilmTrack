<template>
  <Transition
    name="modal"
    appear
    @enter="onEnter"
    @leave="onLeave"
  >
    <NModal
      v-if="visible"
      :show="true"
      preset="card"
      class="update-modal w-[580px] rounded-xl bg-gradient-to-br from-slate-50 to-slate-200 border border-slate-200 shadow-2xl"
      :mask-closable="!isDownloading"
      :closable="!isDownloading"
      @update:show="(val) => !val && emit('update:visible', false)"
      @close="handleClose"
      :auto-focus="false"
      :trap-focus="false"
      transform-origin="center"
    >
    <template #header>
      <div class="text-xl font-semibold text-gray-800">🎉 发现新版本</div>
    </template>

    <div class="space-y-6 text-gray-700">
      <!-- 版本信息 -->
      <div class="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div class="flex items-center justify-between">
          <div class="text-lg font-medium text-blue-900">v{{ updateInfo.version }}</div>
          <div v-if="updateInfo.publish_date" class="text-sm text-blue-600">
            {{ formatDate(updateInfo.publish_date) }}
          </div>
        </div>
      </div>

      <!-- 下载进度 -->
      <div v-if="isDownloading" class="bg-green-50 border border-green-200 rounded-xl p-4">
        <div class="flex items-center justify-between mb-3">
          <span class="font-medium text-green-900">正在下载更新...</span>
          <span class="text-sm text-green-600">{{ downloadProgress.speed }}</span>
        </div>
        <NProgress
          type="line"
          :percentage="downloadProgress.percentage"
          :show-indicator="false"
          :height="8"
          border-radius="6px"
          fill-border-radius="6px"
          color="#10b981"
          class="rounded-md"
        />
        <div class="flex justify-between text-sm mt-2 text-green-700">
          <span>{{ formatBytes(downloadProgress.downloaded) }}</span>
          <span>{{ downloadProgress.percentage.toFixed(1) }}%</span>
          <span>{{ formatBytes(downloadProgress.total) }}</span>
        </div>
      </div>

      <!-- 更新内容 -->
      <div v-if="updateInfo.release_notes && !isDownloading" class="bg-gray-50 border border-gray-200 rounded-xl p-4">
        <div class="text-base font-medium mb-3 text-gray-800">📋 更新内容</div>
        <div
          v-html="parseMarkdown(updateInfo.release_notes)"
          class="text-sm markdown-content max-h-80 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100"
        ></div>
      </div>
    </div>

    <template #footer>
      <div class="flex justify-between items-center">
        <NButton
          v-if="!isDownloading"
          text
          @click="handleIgnoreVersion"
          class="text-gray-500 rounded-lg hover:bg-gray-100 border-none transition-all duration-200"
        >
          忽略此版本
        </NButton>
        <div v-else></div>

        <NSpace>
          <NButton
            v-if="!isDownloading"
            @click="handleRemindLater"
            class="bg-gray-100 text-gray-700 rounded-lg font-medium border-none hover:bg-gray-200 transition-all duration-200"
          >
            稍后提醒
          </NButton>
          <NButton
            v-if="!isDownloading"
            @click="handleUpdate"
            :loading="isChecking"
            type="primary"
            size="medium"
            strong
          >
            {{ isChecking ? '检查中...' : '立即更新' }}
          </NButton>
          <NButton
            v-if="isDownloading"
            @click="handleCancelDownload"
            type="error"
            size="medium"
          >
            取消下载
          </NButton>
        </NSpace>
      </div>
    </template>
  </NModal>
  </Transition>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { NModal, NButton, NSpace, NProgress } from 'naive-ui'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import { invoke } from '@tauri-apps/api/core'
import { isWindows } from '../../utils/platform'
import { listen } from '@tauri-apps/api/event'
import type { UpdateCheckResult } from '../../types'

// 下载进度类型
interface DownloadProgress {
  downloaded: number
  total: number
  percentage: number
  speed: string
}

const props = defineProps<{
  updateInfo: UpdateCheckResult
  visible: boolean
}>()

const emit = defineEmits<{
  (e: 'update:visible', visible: boolean): void
  (e: 'update'): void
  (e: 'remind-later'): void
}>()

// 响应式状态
const isDownloading = ref(false)
const isChecking = ref(false)
const downloadProgress = ref<DownloadProgress>({
  downloaded: 0,
  total: 0,
  percentage: 0,
  speed: '0 B/s'
})

// 下载监听器
let downloadListener: (() => void) | null = null

// 处理关闭
const handleClose = () => {
  emit('update:visible', false)
}

// 处理更新
const handleUpdate = async () => {
  if (!props.updateInfo.download_url) return

  // 内置「下载并静默安装」仅适配 Windows 安装包；
  // 在 macOS/Linux 上改为用系统浏览器打开下载页，由用户自行安装对应平台的产物。
  if (!isWindows()) {
    try {
      await invoke('open_download_url', { url: props.updateInfo.download_url })
    } catch (error) {
      console.error('打开下载链接失败:', error)
    } finally {
      emit('remind-later')
    }
    return
  }

  try {
    isChecking.value = true

    // 检查是否已下载
    const existingFile = await invoke<string | null>('is_update_downloaded', {
      url: props.updateInfo.download_url
    })

    if (existingFile) {
      // 文件已存在，直接打开安装包
      await invoke('open_installer', { filePath: existingFile })
      // 关闭应用
      await invoke('exit_app')
      return
    }

    // 先获取文件信息
    try {
      const fileInfo = await invoke<{ size: number }>('get_file_info', {
        url: props.updateInfo.download_url
      })

      // 初始化下载进度
      downloadProgress.value = {
        downloaded: 0,
        total: fileInfo.size,
        percentage: 0,
        speed: '0 B/s'
      }
    } catch (infoError) {
      console.warn('获取文件信息失败，将在下载过程中获取:', infoError)
      // 如果获取文件信息失败，继续下载，在下载过程中获取
      downloadProgress.value = {
        downloaded: 0,
        total: 0,
        percentage: 0,
        speed: '0 B/s'
      }
    }

    // 开始下载
    isChecking.value = false
    isDownloading.value = true

    // 监听下载进度
    downloadListener = await listen<DownloadProgress>('download-progress', (event) => {
      downloadProgress.value = event.payload
    })

    // 下载文件（携带期望哈希，后端会在下载后做完整性校验）
    const filePath = await invoke<string>('download_update', {
      url: props.updateInfo.download_url,
      expectedSha256: props.updateInfo.sha256 ?? null
    })

    // 下载完成，打开安装包
    await invoke('open_installer', { filePath })

    // 关闭应用
    await invoke('exit_app')

  } catch (error) {
    console.error('更新失败:', error)
    isDownloading.value = false
    isChecking.value = false
  }
}

// 处理稍后提醒
const handleRemindLater = () => {
  emit('remind-later')
  handleClose()
}

// 处理忽略此版本
const handleIgnoreVersion = async () => {
  if (props.updateInfo.version) {
    try {
      await invoke('ignore_version', { version: props.updateInfo.version })
    } catch (error) {
      console.error('忽略版本失败:', error)
    }
  }
  handleClose()
}

// 取消下载
const handleCancelDownload = async () => {
  try {
    // 调用后端取消下载
    await invoke('cancel_download')

    // 清理前端状态
    isDownloading.value = false
    if (downloadListener) {
      downloadListener()
      downloadListener = null
    }

    // 重置下载进度
    downloadProgress.value = {
      downloaded: 0,
      total: 0,
      percentage: 0,
      speed: '0 B/s'
    }

    handleClose()
  } catch (error) {
    console.error('取消下载失败:', error)
    // 即使取消失败，也要清理前端状态
    isDownloading.value = false
    if (downloadListener) {
      downloadListener()
      downloadListener = null
    }
    handleClose()
  }
}

// 格式化字节数
const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// 组件挂载时设置监听器
onMounted(async () => {
  // 可以在这里添加其他初始化逻辑
})

// 组件卸载时清理监听器
onUnmounted(() => {
  if (downloadListener) {
    downloadListener()
    downloadListener = null
  }
})

// 动画钩子函数
const onEnter = (_el: Element) => {
  // 进入动画已通过 CSS 处理
}

const onLeave = (_el: Element) => {
  // 离开动画已通过 CSS 处理
}

// 格式化发布日期
const formatDate = (dateStr?: string) => {
  if (!dateStr) return ''
  try {
    // 处理非ISO格式的时间字符串
    const date = new Date(dateStr.replace(' ', 'T'))
    return date.toLocaleDateString('zh-CN', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })
  } catch {
    return dateStr
  }
}

// 配置 marked 选项
marked.setOptions({
  breaks: true, // 支持换行符转换为 <br>
  gfm: true // 启用 GitHub Flavored Markdown
})

// 解析 Markdown 为 HTML
const parseMarkdown = (markdown?: string): string => {
  if (!markdown) return ''

  try {
    // 预处理：将 \n 转换为实际换行符
    const processedMarkdown = markdown.replace(/\\n/g, '\n').replace(/\\t/g, '\t')

    // 使用 marked 解析 Markdown
    const html = marked.parse(processedMarkdown) as string

    // 更新日志来自远程更新源，必须净化后再渲染，避免 XSS（如 <img onerror>）
    return DOMPurify.sanitize(html, { USE_PROFILES: { html: true } })
  } catch (error) {
    console.error('Markdown 解析失败:', error)
    // 如果解析失败，返回原始文本（转义HTML）
    return markdown.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>')
  }
}
</script>

<style scoped>
/* Vue Transition 动画 */
.modal-enter-active {
  transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.modal-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.modal-enter-from {
  opacity: 0;
  transform: translateY(-30px) scale(0.9);
}

.modal-leave-to {
  opacity: 0;
  transform: translateY(-20px) scale(0.95);
}

/* 弹窗动画效果 */
.update-modal :deep(.n-modal-mask) {
  animation: maskFadeIn 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.update-modal :deep(.n-modal-container) {
  animation: modalSlideIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.update-modal :deep(.n-card) {
  overflow: hidden;
  backdrop-filter: blur(10px);
  animation: cardScaleIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}

/* 关闭按钮样式 */
.update-modal :deep(.n-base-close) {
  color: #6b7280;
  border-radius: 8px;
  transition: all 0.2s ease;
}

.update-modal :deep(.n-base-close:hover) {
  background-color: #f3f4f6;
  color: #374151;
}

/* 弹窗进入动画 */
@keyframes maskFadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes modalSlideIn {
  from {
    transform: translateY(-30px) scale(0.95);
    opacity: 0;
  }
  to {
    transform: translateY(0) scale(1);
    opacity: 1;
  }
}

@keyframes cardScaleIn {
  from {
    transform: scale(0.9);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}

/* 按钮样式重置 */
.update-modal :deep(.n-button) {
  border: none !important;
}

/* Markdown 内容样式 */
.markdown-content {
  line-height: 1.6;
  color: #374151;
}

.markdown-content :deep(h1) {
  font-size: 1.5rem;
  font-weight: 700;
  margin: 1rem 0 0.5rem 0;
  color: #1f2937;
  border-bottom: 2px solid #e5e7eb;
  padding-bottom: 0.25rem;
}

.markdown-content :deep(h2) {
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0.75rem 0 0.5rem 0;
  color: #1f2937;
}

.markdown-content :deep(h3) {
  font-size: 1.125rem;
  font-weight: 600;
  margin: 0.5rem 0 0.25rem 0;
  color: #374151;
}

.markdown-content :deep(p) {
  margin: 0.5rem 0;
}

.markdown-content :deep(ul) {
  margin: 0.5rem 0;
  padding-left: 1.5rem;
  list-style-type: disc;
}

.markdown-content :deep(ol) {
  margin: 0.5rem 0;
  padding-left: 1.5rem;
  list-style-type: decimal;
}

.markdown-content :deep(li) {
  margin: 0.25rem 0;
  display: list-item;
}

.markdown-content :deep(strong) {
  font-weight: 600;
  color: #1f2937;
}

.markdown-content :deep(em) {
  font-style: italic;
}

.markdown-content :deep(code) {
  background-color: #f3f4f6;
  padding: 0.125rem 0.25rem;
  border-radius: 0.25rem;
  font-family: 'Courier New', monospace;
  font-size: 0.875rem;
  color: #dc2626;
}

.markdown-content :deep(pre) {
  background-color: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 0.375rem;
  padding: 0.75rem;
  margin: 0.5rem 0;
  overflow-x: auto;
}

.markdown-content :deep(pre code) {
  background-color: transparent;
  padding: 0;
  color: #374151;
}

.markdown-content :deep(blockquote) {
  border-left: 4px solid #3b82f6;
  padding-left: 1rem;
  margin: 0.5rem 0;
  color: #6b7280;
  font-style: italic;
}

.markdown-content :deep(a) {
  color: #3b82f6;
  text-decoration: underline;
}

.markdown-content :deep(a:hover) {
  color: #1d4ed8;
}

.markdown-content :deep(hr) {
  border: none;
  border-top: 1px solid #e5e7eb;
  margin: 1rem 0;
}

.markdown-content :deep(table) {
  width: 100%;
  border-collapse: collapse;
  margin: 0.5rem 0;
}

.markdown-content :deep(th),
.markdown-content :deep(td) {
  border: 1px solid #e5e7eb;
  padding: 0.5rem;
  text-align: left;
}

.markdown-content :deep(th) {
  background-color: #f9fafb;
  font-weight: 600;
}

/* 自定义滚动条样式 */
.scrollbar-thin {
  scrollbar-width: thin;
}

.scrollbar-thumb-gray-300::-webkit-scrollbar-thumb {
  background-color: #d1d5db;
  border-radius: 6px;
}

.scrollbar-track-gray-100::-webkit-scrollbar-track {
  background-color: #f3f4f6;
  border-radius: 6px;
}

.scrollbar-thin::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

.scrollbar-thin::-webkit-scrollbar-thumb {
  background-color: #d1d5db;
  border-radius: 6px;
}

.scrollbar-thin::-webkit-scrollbar-track {
  background-color: #f3f4f6;
  border-radius: 6px;
}

.scrollbar-thin::-webkit-scrollbar-thumb:hover {
  background-color: #9ca3af;
}
</style>