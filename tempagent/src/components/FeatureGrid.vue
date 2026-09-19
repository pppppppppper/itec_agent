<script setup>
import AppIcon from './AppIcon.vue'

const features = [
  {
    index: '01',
    icon: 'mind-map',
    title: '构建知识地图',
    desc: '拆解概念与前置关系',
  },
  {
    index: '02',
    icon: 'study-board',
    title: '333 高效学习',
    desc: '3 分钟理解 · 3 个关键点 · 3 道自测',
  },
  {
    index: '03',
    icon: 'chat-sparkle',
    title: 'AI 随时答疑',
    desc: '围绕当前知识点深入追问',
  },
]
</script>

<template>
  <section id="features" class="features">
    <ul class="features__grid">
      <li v-for="feature in features" :key="feature.index" class="feature-card">
        <span class="feature-card__index">{{ feature.index }}</span>
        <span class="feature-card__icon">
          <AppIcon :name="feature.icon" :size="26" />
        </span>
        <div class="feature-card__body">
          <h3 class="feature-card__title">{{ feature.title }}</h3>
          <p class="feature-card__desc">{{ feature.desc }}</p>
        </div>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.features {
  position: relative;
  z-index: 1;
  padding-top: 30px;
  scroll-margin-top: 90px;
}

.features__grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 20px;
}

.feature-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 22px 24px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 18px;
  box-shadow:
    0 1px 2px rgba(28, 60, 120, 0.04),
    0 10px 26px rgba(28, 60, 120, 0.05);
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease,
    border-color 0.2s ease;
}

.feature-card:hover {
  transform: translateY(-3px);
  border-color: var(--brand-200);
  box-shadow: 0 18px 36px rgba(28, 60, 120, 0.1);
}

.feature-card__index {
  font-size: 26px;
  font-weight: 800;
  line-height: 1;
  letter-spacing: 0.02em;
  color: #d9e6fb;
}

.feature-card__icon {
  display: grid;
  place-items: center;
  width: 54px;
  height: 54px;
  border-radius: 15px;
  background: var(--tile);
  color: var(--brand-600);
  flex: none;
}

.feature-card__title {
  font-size: 17px;
  font-weight: 700;
  color: var(--ink-900);
  line-height: 1.4;
}

.feature-card__desc {
  margin-top: 2px;
  font-size: 13.5px;
  color: var(--ink-500);
}

@media (max-width: 980px) {
  .features__grid {
    grid-template-columns: 1fr;
  }
}
</style>
