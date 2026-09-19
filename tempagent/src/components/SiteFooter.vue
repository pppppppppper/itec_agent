<script setup>
import AppIcon from './AppIcon.vue'

const notes = ['无需登录', '自动保存学习进度', '支持随时重新生成']
</script>

<template>
  <footer class="site-footer">
    <ul class="site-footer__list">
      <li v-for="note in notes" :key="note" class="site-footer__item">
        <AppIcon name="check-circle" :size="15" class="site-footer__icon" />
        <span>{{ note }}</span>
      </li>
    </ul>
  </footer>
</template>

<style scoped>
.site-footer {
  position: relative;
  z-index: 1;
  padding: 28px 0 36px;
}

.site-footer__list {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 12px 32px;
}

.site-footer__item {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-size: 13px;
  color: var(--ink-500);
}

.site-footer__icon {
  color: #b9c9e2;
}
</style>
