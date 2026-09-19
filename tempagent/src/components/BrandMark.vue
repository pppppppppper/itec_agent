<script setup>
defineProps({
  size: { type: [Number, String], default: 27 },
})
</script>

<template>
  <svg
    class="brand-mark"
    :width="size"
    :height="size"
    viewBox="0 0 28 28"
    fill="none"
    aria-hidden="true"
  >
    <path
      d="M8.6 8.4 18.8 12.3M18.8 12.3 11.8 20.4M11.8 20.4 8.6 8.4"
      stroke="#3f6fdd"
      stroke-width="1.7"
      stroke-linecap="round"
      opacity="0.65"
    />
    <circle cx="8.6" cy="8.4" r="3.5" fill="#2f6bf0" />
    <circle cx="18.8" cy="12.3" r="2.9" fill="#7aa7f8" />
    <circle cx="11.8" cy="20.4" r="2.9" fill="#7aa7f8" />
  </svg>
</template>

<style scoped>
.brand-mark {
  flex: none;
}
</style>
