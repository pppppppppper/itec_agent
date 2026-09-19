<script setup>
defineProps({
  topics: { type: Array, required: true },
  active: { type: String, default: '' },
})

defineEmits(['select'])
</script>

<template>
  <section id="topics" class="topics">
    <p class="topics__title">不知道学什么？试试这些主题</p>
    <ul class="topics__list">
      <li v-for="topic in topics" :key="topic">
        <button
          type="button"
          class="chip"
          :class="{ 'is-active': topic === active }"
          @click="$emit('select', topic)"
        >
          {{ topic }}
        </button>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.topics {
  position: relative;
  z-index: 1;
  padding-top: 30px;
  text-align: center;
  scroll-margin-top: 90px;
}

.topics__title {
  font-size: 14.5px;
  font-weight: 500;
  color: var(--ink-700);
}

.topics__list {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 12px;
  margin-top: 14px;
}

.chip {
  padding: 8px 18px;
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-pill);
  background: var(--surface);
  color: var(--ink-600);
  font-size: 13.5px;
  transition:
    color 0.18s ease,
    border-color 0.18s ease,
    background-color 0.18s ease,
    transform 0.18s ease;
}

.chip:hover {
  color: var(--brand-600);
  border-color: var(--brand-200);
  background: var(--brand-50);
  transform: translateY(-1px);
}

.chip.is-active {
  color: #fff;
  background: var(--brand-600);
  border-color: var(--brand-600);
  box-shadow: 0 8px 16px rgba(37, 99, 235, 0.24);
}
</style>
