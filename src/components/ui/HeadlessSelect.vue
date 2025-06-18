<template>
  <Listbox v-model="selectedValue" as="div" class="relative">
    <div class="relative">
      <ListboxButton 
        class="relative w-full cursor-pointer rounded-xl bg-white/80 backdrop-blur-sm 
               border border-gray-200/50 py-3 px-4 text-left 
               shadow-sm transition-all duration-200 
               focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100
               hover:border-gray-300/70 hover:bg-white/90"
      >
        <span class="block truncate">{{ displayValue }}</span>
        <span class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
          <ChevronUpDownIcon class="h-5 w-5 text-gray-400" aria-hidden="true" />
        </span>
      </ListboxButton>

      <transition
        leave-active-class="transition duration-100 ease-in"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <ListboxOptions 
          class="absolute z-50 mt-1 w-full rounded-xl 
                 bg-white/95 backdrop-blur-xl border border-gray-200/50 
                 py-1 shadow-lg ring-1 ring-black ring-opacity-5 
                 focus:outline-none"
        >
          <ListboxOption
            v-for="option in options"
            :key="option.value"
            v-slot="{ active, selected }"
            :value="option.value"
            as="template"
          >
            <li
              :class="[
                active ? 'bg-blue-50/80 text-blue-900' : 'text-gray-900',
                'relative cursor-pointer select-none py-3 px-4 transition-colors duration-150'
              ]"
            >
              <div class="flex items-center">
                <span
                  :class="[
                    selected ? 'font-semibold' : 'font-normal',
                    'block truncate'
                  ]"
                >
                  {{ option.label }}
                </span>
              </div>

              <span
                v-if="selected"
                class="absolute inset-y-0 right-0 flex items-center pr-4 text-blue-600"
              >
                <CheckIcon class="h-5 w-5" aria-hidden="true" />
              </span>
            </li>
          </ListboxOption>
        </ListboxOptions>
      </transition>
    </div>
  </Listbox>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  Listbox,
  ListboxButton,
  ListboxOption,
  ListboxOptions,
} from '@headlessui/vue'
import { CheckIcon, ChevronUpDownIcon } from '@heroicons/vue/20/solid'

interface Option {
  value: string | number
  label: string
}

interface Props {
  modelValue: string | number
  options: Option[]
  placeholder?: string
}

interface Emits {
  (e: 'update:modelValue', value: string | number): void
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: '请选择...'
})

const emit = defineEmits<Emits>()

const selectedValue = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const displayValue = computed(() => {
  const option = props.options.find(opt => opt.value === props.modelValue)
  return option?.label || props.placeholder
})
</script> 