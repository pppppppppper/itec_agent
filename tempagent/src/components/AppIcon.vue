<script setup>
/**
 * 统一图标组件：所有图标共用一个 24x24 的 viewBox。
 * 默认使用 currentColor 描边，填充型图标在内部单独覆盖。
 */
defineProps({
  name: { type: String, required: true },
  size: { type: [Number, String], default: 20 },
})
</script>

<template>
  <svg
    class="app-icon"
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <template v-if="name === 'sparkle'">
      <path
        d="M11.2 3.1l1.6 4.3 4.3 1.6-4.3 1.6-1.6 4.3-1.6-4.3L5.3 9l4.3-1.6z"
        fill="currentColor"
        stroke="none"
      />
      <path
        d="M17.9 14.4l.7 1.9 1.9.7-1.9.7-.7 1.9-.7-1.9-1.9-.7 1.9-.7z"
        fill="currentColor"
        stroke="none"
        opacity="0.6"
      />
    </template>

    <template v-else-if="name === 'check-circle'">
      <circle cx="12" cy="12" r="9" fill="currentColor" stroke="none" />
      <path d="M8.3 12.4l2.4 2.3 4.9-5" stroke="#fff" stroke-width="2.1" />
    </template>

    <template v-else-if="name === 'info-circle'">
      <circle cx="12" cy="12" r="9" fill="currentColor" stroke="none" />
      <path d="M12 7.4v5.4" stroke="#fff" stroke-width="2.1" />
      <circle cx="12" cy="16.2" r="1.15" fill="#fff" stroke="none" />
    </template>

    <template v-else-if="name === 'arrow-right'">
      <path d="M4.6 12h14.2" />
      <path d="M13.4 6.4 19 12l-5.6 5.6" />
    </template>

    <template v-else-if="name === 'chevron-down'">
      <path d="M6.6 9.6 12 15l5.4-5.4" />
    </template>

    <template v-else-if="name === 'graduation'">
      <path d="M12 4.2 2.4 8.8 12 13.4l9.6-4.6z" fill="currentColor" stroke="none" />
      <path d="M7 11.6v3.7c0 1 2.2 1.9 5 1.9s5-.9 5-1.9v-3.7" />
      <path d="M21.6 9.6v4.6" />
    </template>

    <template v-else-if="name === 'level'">
      <path d="M5.4 19v-5.4" stroke-width="2.4" />
      <path d="M12 19V9.4" stroke-width="2.4" />
      <path d="M18.6 19V5.6" stroke-width="2.4" />
    </template>

    <template v-else-if="name === 'mind-map'">
      <circle cx="12" cy="5.8" r="2.6" />
      <circle cx="5.6" cy="17.8" r="2.6" />
      <circle cx="18.4" cy="17.8" r="2.6" />
      <path d="M10.5 8 7 15.4" />
      <path d="M13.5 8l3.5 7.4" />
      <path d="M8.2 17.8h7.6" />
    </template>

    <template v-else-if="name === 'study-board'">
      <rect x="3.4" y="4.4" width="13" height="14" rx="3.4" />
      <path d="M7 11.6l2.2 2.2 4.2-4.6" stroke-width="2" />
      <circle cx="17.6" cy="17.6" r="4.4" fill="#eef4ff" />
      <path d="M17.6 15.4v2.4l1.7 1" />
    </template>

    <template v-else-if="name === 'chat-sparkle'">
      <path
        d="M4 6.8A2.8 2.8 0 0 1 6.8 4h10.4A2.8 2.8 0 0 1 20 6.8v6a2.8 2.8 0 0 1-2.8 2.8H10l-4.4 3.1.8-3.1H6.8A2.8 2.8 0 0 1 4 12.8z"
      />
      <path
        d="M12 6.2l.95 2.3 2.3.95-2.3.95-.95 2.3-.95-2.3-2.3-.95 2.3-.95z"
        fill="currentColor"
        stroke="none"
      />
    </template>

    <template v-else-if="name === 'spinner'">
      <path d="M20.4 12a8.4 8.4 0 1 0-8.4 8.4" stroke-width="2.2" />
    </template>
  </svg>
</template>

<style scoped>
.app-icon {
  flex: none;
}
</style>
