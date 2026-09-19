<script setup>
/**
 * 404 页。
 *
 * 为什么需要它：路由里原本没有 catch-all，访问任何不存在的地址时 <RouterView>
 * 什么都渲染不出来——**整个页面是空白的**（实测 /nonexistent 的 body 文字量为 0）。
 * 规划在 §2.3、§10 风险表、§14.7 反复强调「任何情况下不出现空白页」，
 * 一条打错的 URL 就破功了。
 */
import { RouterLink, useRoute } from 'vue-router'
import AppHeader from '../components/AppHeader.vue'
import AppIcon from '../components/AppIcon.vue'
import HeroBackdrop from '../components/HeroBackdrop.vue'
import StudyAvatar from '../components/study/StudyAvatar.vue'
import { loadState } from '../state/store'

const route = useRoute()

// 只读一次本地进度。这里刻意不用 useStudy()：那个 composable 的状态是模块级
// 共享的（INITIAL_STATE），在 404 页里再实例化一份没必要，也容易踩到共享引用。
const saved = loadState()
const hasProgress = Boolean(saved.map && saved.topic)
</script>

<template>
  <div class="notfound">
    <AppHeader />

    <main class="notfound__main">
      <HeroBackdrop />

      <div class="shell notfound__inner">
        <StudyAvatar state="probing" :size="76" />

        <p class="notfound__code">404</p>
        <h1 class="notfound__title">这条路径不在学习地图上</h1>
        <p class="notfound__desc">
          你访问的地址
          <code>{{ route.fullPath }}</code>
          不存在。可能是链接抄错了，或者这个页面还没做。
        </p>

        <div class="notfound__actions">
          <RouterLink class="notfound__button notfound__button--primary" to="/">
            <AppIcon name="arrow-right" :size="16" />
            <span>回首页</span>
          </RouterLink>

          <RouterLink v-if="hasProgress" class="notfound__button" to="/study">
            <AppIcon name="mind-map" :size="16" />
            <span>继续学「{{ saved.topic }}」</span>
          </RouterLink>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
.notfound {
  position: relative;
  min-height: 100vh;
  overflow-x: clip;
}

.notfound__main {
  position: relative;
  padding: 72px 0 88px;
}

.notfound__inner {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  text-align: center;
}

.notfound__code {
  margin: 14px 0 0;
  color: var(--brand-300);
  font-size: 44px;
  font-weight: 800;
  letter-spacing: 0.06em;
  line-height: 1;
}

.notfound__title {
  margin: 0;
  font-size: 22px;
  font-weight: 700;
  color: var(--ink-900);
}

.notfound__desc {
  margin: 0;
  max-width: 460px;
  color: var(--ink-500);
  font-size: 14.5px;
  line-height: 1.8;
}

.notfound__desc code {
  padding: 2px 7px;
  border-radius: 6px;
  background: var(--surface);
  border: 1px solid var(--border);
  color: var(--ink-700);
  font-size: 13px;
  word-break: break-all;
}

.notfound__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 10px;
  margin-top: 12px;
}

.notfound__button {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 10px 18px;
  border-radius: 11px;
  border: 1px solid var(--border-strong);
  background: var(--surface);
  color: var(--ink-700);
  font-size: 14.5px;
  font-weight: 500;
  transition:
    border-color 0.18s ease,
    background-color 0.18s ease,
    transform 0.18s ease;
}

.notfound__button:hover {
  border-color: var(--brand-400);
  background: var(--brand-50);
  transform: translateY(-1px);
}

.notfound__button--primary {
  background: var(--brand-600);
  border-color: var(--brand-600);
  color: #fff;
  font-weight: 600;
  box-shadow: var(--shadow-brand);
}

.notfound__button--primary:hover {
  background: var(--brand-700);
  border-color: var(--brand-700);
}
</style>
