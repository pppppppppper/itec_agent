<script setup>
import { RouterLink } from 'vue-router'
import AppHeader from '../components/AppHeader.vue'
import AppIcon from '../components/AppIcon.vue'
import HeroBackdrop from '../components/HeroBackdrop.vue'
import { useAuth } from '../composables/useAuth'

const { user } = useAuth()
</script>

<template>
  <div class="profile-page">
    <AppHeader />

    <main class="profile-page__main">
      <HeroBackdrop />

      <div class="shell profile-page__inner">
        <section class="placeholder">
          <span class="placeholder__icon"><AppIcon name="mind-map" :size="28" /></span>
          <h1 class="placeholder__title">个人中心还未开始搭建</h1>
          <p class="placeholder__desc">
            这里之后会展示
            <strong>{{ user?.account }}</strong>
            的学习地图、学习进度与账号设置。
          </p>
          <RouterLink class="placeholder__button" to="/">
            <span>返回首页继续学习</span>
            <AppIcon name="arrow-right" :size="16" />
          </RouterLink>
        </section>
      </div>
    </main>
  </div>
</template>

<style scoped>
.profile-page {
  position: relative;
  min-height: 100vh;
  overflow-x: clip;
}

.profile-page__main {
  position: relative;
  padding: 64px 0 72px;
}

.profile-page__inner {
  position: relative;
  display: grid;
  justify-items: center;
}

.placeholder {
  width: min(520px, 100%);
  padding: 32px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 22px;
  box-shadow:
    0 2px 4px rgba(28, 60, 120, 0.04),
    0 22px 48px rgba(28, 60, 120, 0.09);
  text-align: center;
}

.placeholder__icon {
  display: grid;
  place-items: center;
  width: 58px;
  height: 58px;
  margin: 0 auto;
  border-radius: 16px;
  background: var(--tile);
  color: var(--brand-600);
}

.placeholder__title {
  margin-top: 18px;
  font-size: 21px;
  font-weight: 800;
  color: var(--ink-900);
}

.placeholder__desc {
  margin-top: 10px;
  font-size: 13.5px;
  line-height: 1.7;
  color: var(--ink-500);
}

.placeholder__desc strong {
  font-weight: 600;
  color: var(--ink-800);
}

.placeholder__button {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-top: 22px;
  padding: 11px 20px;
  border-radius: 11px;
  background: var(--brand-600);
  color: #fff;
  font-size: 14.5px;
  font-weight: 600;
  box-shadow: var(--shadow-brand);
  transition:
    background-color 0.18s ease,
    transform 0.18s ease;
}

.placeholder__button:hover {
  background: var(--brand-700);
  transform: translateY(-1px);
}
</style>
