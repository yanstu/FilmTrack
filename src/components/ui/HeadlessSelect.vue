<template>
  <Listbox v-model="selectedValue" as="div" class="relative" v-slot="{ open }">
    <div ref="triggerRef" class="relative">
      <ListboxButton
        @click="handleButtonClick(open)"
        :disabled="disabled"
        :class="[
          'relative w-full rounded-xl backdrop-blur-sm border py-3 pl-4 pr-10 text-left shadow-sm transition-all duration-200 focus:outline-none',
          disabled
            ? 'cursor-not-allowed border-gray-200/60 bg-slate-100/90 text-slate-400 opacity-75'
            : open
              ? 'cursor-pointer border-blue-400 bg-white/95 ring-4 ring-blue-200/60'
              : 'cursor-pointer border-gray-200/50 bg-white/80 hover:border-gray-300/70 hover:bg-white/90 active:scale-[0.99] focus-visible:border-blue-400 focus-visible:ring-4 focus-visible:ring-blue-200/60'
        ]"
      >
        <span :class="['block truncate', displayValue === placeholder ? 'text-gray-400' : 'text-gray-900']">{{ displayValue }}</span>
        <span class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
          <ChevronsUpDown
            :class="['h-5 w-5 transition-colors duration-200', disabled ? 'text-slate-300' : open ? 'text-blue-500' : 'text-gray-400']"
            aria-hidden="true"
          />
        </span>
      </ListboxButton>

      <Teleport to="body">
        <div v-if="open" class="pointer-events-none fixed inset-0 z-[99990]">
          <transition
            enter-active-class="transition duration-150 ease-out"
            enter-from-class="opacity-0 scale-[0.96]"
            enter-to-class="opacity-100 scale-100"
            leave-active-class="transition duration-100 ease-in"
            leave-from-class="opacity-100 scale-100"
            leave-to-class="opacity-0 scale-[0.96]"
          >
            <ListboxOptions
              v-if="open"
              class="scrollbar-apple pointer-events-auto fixed overflow-y-auto overscroll-contain rounded-xl border p-1 shadow-2xl ring-1 ring-black/5 focus:outline-none"
              :style="floatingStyle"
            >
              <ListboxOption
                v-for="option in options"
                :key="option.value"
                v-slot="{ active, selected }"
                :value="option.value"
                as="template"
              >
                <li
                  :ref="selected ? setSelectedOptionRef : undefined"
                  :class="[
                    active ? 'bg-blue-50 text-blue-700' : 'text-gray-800',
                    'relative flex cursor-pointer select-none items-center rounded-lg py-2.5 pl-4 pr-9 transition-colors duration-150'
                  ]"
                >
                  <span :class="[selected ? 'font-semibold' : 'font-normal', 'block truncate']">
                    {{ option.label }}
                  </span>

                  <span
                    v-if="selected"
                    class="absolute inset-y-0 right-0 flex items-center pr-3 text-blue-600"
                  >
                    <Check class="h-4 w-4" aria-hidden="true" />
                  </span>
                </li>
              </ListboxOption>
            </ListboxOptions>
          </transition>
        </div>
      </Teleport>
    </div>
  </Listbox>
</template>

<script setup lang="ts">
import { Teleport, computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import {
  Listbox,
  ListboxButton,
  ListboxOption,
  ListboxOptions,
} from '@headlessui/vue'
import { Check, ChevronsUpDown } from 'lucide-vue-next'

import type { HeadlessSelectProps, HeadlessSelectEmits } from './types';

type Props = HeadlessSelectProps;
type Emits = HeadlessSelectEmits;

const props = withDefaults(defineProps<Props>(), {
  placeholder: '请选择...',
  modelValue: undefined,
  disabled: false
})

const emit = defineEmits<Emits>()
const selectedOptionRef = ref<HTMLElement | null>(null)
const triggerRef = ref<HTMLElement | null>(null)
const floatingStyle = ref<Record<string, string>>({
  zIndex: '99999',
  left: '16px',
  top: '0px',
  width: '240px',
  maxHeight: '288px',
  transformOrigin: 'top center',
  background: 'rgba(255, 255, 255, 0.98)',
  borderColor: 'rgba(226, 232, 240, 0.92)',
  boxShadow: '0 12px 24px -10px rgba(15, 23, 42, 0.14), 0 28px 56px -18px rgba(15, 23, 42, 0.22)'
})

const selectedValue = computed({
  get: () => props.modelValue ?? '',
  set: (value) => emit('update:modelValue', value)
})

const displayValue = computed(() => {
  const currentValue = props.modelValue ?? ''
  const option = props.options.find(opt => opt.value === currentValue)
  return option?.label || props.placeholder
})

const scrollSelectedIntoView = () => {
  selectedOptionRef.value?.scrollIntoView({
    block: 'nearest',
    inline: 'nearest'
  })
}

const updateFloatingPosition = () => {
  const trigger = triggerRef.value
  if (!trigger) {
    return
  }

  const rect = trigger.getBoundingClientRect()
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight
  const gap = 8
  const sidePadding = 16
  const availableBelow = viewportHeight - rect.bottom - gap - sidePadding
  const availableAbove = rect.top - gap - sidePadding
  const shouldOpenAbove = availableBelow < 220 && availableAbove > availableBelow
  const maxHeight = Math.max(160, Math.min(320, shouldOpenAbove ? availableAbove : availableBelow))
  const width = Math.min(rect.width, viewportWidth - sidePadding * 2)
  const left = Math.min(
    Math.max(rect.left, sidePadding),
    Math.max(sidePadding, viewportWidth - width - sidePadding)
  )

  floatingStyle.value = {
    zIndex: '99999',
    left: `${left}px`,
    width: `${width}px`,
    maxHeight: `${maxHeight}px`,
    transformOrigin: shouldOpenAbove ? 'bottom center' : 'top center',
    background: 'rgba(255, 255, 255, 0.98)',
    borderColor: 'rgba(226, 232, 240, 0.92)',
    boxShadow: '0 12px 24px -10px rgba(15, 23, 42, 0.14), 0 28px 56px -18px rgba(15, 23, 42, 0.22)',
    top: shouldOpenAbove ? 'auto' : `${rect.bottom + gap}px`,
    bottom: shouldOpenAbove ? `${Math.max(sidePadding, viewportHeight - rect.top + gap)}px` : 'auto'
  }
}

const scheduleFloatingPositionUpdate = () => {
  window.requestAnimationFrame(updateFloatingPosition)
}

const handleViewportChange = () => {
  scheduleFloatingPositionUpdate()
}

const handleButtonClick = (open: boolean) => {
  if (props.disabled) {
    return
  }

  if (open) {
    return
  }

  scheduleFloatingPositionUpdate()
  window.setTimeout(() => {
    void nextTick().then(() => {
      updateFloatingPosition()
      scrollSelectedIntoView()
    })
  }, 0)
}

const setSelectedOptionRef = (element: Element | null) => {
  selectedOptionRef.value = element as HTMLElement | null
}

onMounted(() => {
  window.addEventListener('resize', handleViewportChange)
  window.addEventListener('scroll', handleViewportChange, true)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleViewportChange)
  window.removeEventListener('scroll', handleViewportChange, true)
})

</script>
