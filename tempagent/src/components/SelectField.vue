<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import AppIcon from './AppIcon.vue'

const props = defineProps({
  modelValue: { type: String, required: true },
  options: { type: Array, required: true },
  icon: { type: String, default: '' },
  label: { type: String, required: true },
})

const emit = defineEmits(['update:modelValue'])

const open = ref(false)
const highlighted = ref(0)
const root = ref(null)

const currentIndex = computed(() => Math.max(0, props.options.indexOf(props.modelValue)))

function openList(index) {
  highlighted.value = index
  open.value = true
}

function close() {
  open.value = false
}

function toggle() {
  if (open.value) {
    close()
  } else {
    openList(currentIndex.value)
  }
}

function select(option) {
  emit('update:modelValue', option)
  close()
}

function move(step) {
  if (!open.value) {
    openList(currentIndex.value)
    return
  }
  const total = props.options.length
  highlighted.value = (highlighted.value + step + total) % total
}

function onKeydown(event) {
  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault()
      move(1)
      break
    case 'ArrowUp':
      event.preventDefault()
      move(-1)
      break
    case 'Enter':
    case ' ':
      event.preventDefault()
      if (open.value) {
        select(props.options[highlighted.value])
      } else {
        openList(currentIndex.value)
      }
      break
    case 'Escape':
      if (open.value) {
        event.preventDefault()
        close()
      }
      break
    case 'Tab':
      close()
      break
  }
}

function onPointerDown(event) {
  if (root.value && !root.value.contains(event.target)) {
    close()
  }
}

onMounted(() => document.addEventListener('pointerdown', onPointerDown))
onBeforeUnmount(() => document.removeEventListener('pointerdown', onPointerDown))
</script>

<template>
  <div ref="root" class="select" :class="{ 'is-open': open }">
    <button
      type="button"
      class="select__button"
      aria-haspopup="listbox"
      :aria-expanded="open"
      :aria-label="`${label}：${modelValue}`"
      @click="toggle"
      @keydown="onKeydown"
    >
      <AppIcon v-if="icon" :name="icon" :size="17" class="select__icon" />
      <span class="select__value">{{ modelValue }}</span>
      <AppIcon name="chevron-down" :size="16" class="select__chevron" />
    </button>

    <ul v-show="open" class="select__list" role="listbox" :aria-label="label">
      <li
        v-for="(option, index) in options"
        :key="option"
        class="select__option"
        :class="{ 'is-active': index === highlighted, 'is-selected': option === modelValue }"
        role="option"
        :aria-selected="option === modelValue"
        @mouseenter="highlighted = index"
        @click="select(option)"
      >
        {{ option }}
      </li>
    </ul>
  </div>
</template>

<style scoped>
.select {
  position: relative;
}

.select__button {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 44px;
  padding: 0 12px;
  border: 1px solid var(--border-strong);
  border-radius: 11px;
  background: var(--surface);
  color: var(--ink-800);
  font-size: 15px;
  transition:
    border-color 0.18s ease,
    background-color 0.18s ease;
}

.select__button:hover {
  background: var(--brand-50);
  border-color: var(--brand-200);
}

.select__icon {
  color: var(--ink-700);
}

.select__chevron {
  color: var(--ink-400);
  transition: transform 0.2s ease;
}

.select.is-open .select__chevron {
  transform: rotate(180deg);
}

.select__list {
  position: absolute;
  z-index: 30;
  top: calc(100% + 6px);
  left: 0;
  min-width: 100%;
  padding: 6px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-float);
}

.select__option {
  padding: 9px 12px;
  border-radius: var(--radius-sm);
  font-size: 14px;
  color: var(--ink-700);
  white-space: nowrap;
  cursor: pointer;
}

.select__option.is-active {
  background: var(--brand-50);
  color: var(--brand-700);
}

.select__option.is-selected {
  font-weight: 600;
}
</style>
