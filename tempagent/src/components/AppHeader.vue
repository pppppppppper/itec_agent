<script setup>
import { computed } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { useAuth } from '../composables/useAuth'
import { loadState } from '../state/store'
import AppIcon from './AppIcon.vue'
import BrandMark from './BrandMark.vue'

const navItems = [
  { label: '首页', href: '#top' },
  { label: '学习方法', href: '#topics' },
  { label: '功能介绍', href: '#features' },
]

const route = useRoute()
const router = useRouter()
const { user, logout } = useAuth()

/**
 * 退出登录后要主动离开当前页。
 *
 * 路由守卫只在「导航时」检查，而点退出只是清了登录状态、并没有发生导航——
 * 所以在 /profile 点退出会留在原地，页面文案里的 user?.account 已经变空，
 * 渲染成「这里之后会展示 的学习地图…」。退出后回首页是标准做法，顺带堵住这个洞。
 */
function handleLogout() {
  logout()
  if (route.name !== 'home') router.replace('/')
}

const isHome = computed(() => route.name === 'home')
const isAuthPage = computed(() => route.name === 'auth')
const avatarText = computed(() => (user.value?.name || user.value?.account || '学').slice(0, 1))

/**
 * 「继续上次学习」——原来这个按钮没有任何点击处理，点了没反应。
 * 现在读一次本地进度：有学过就直接回学习空间接着学，没学过则禁用并说明原因，
 * 而不是让用户点完被静默弹回首页。
 */
const saved = loadState()
const hasProgress = computed(() => Boolean(saved.map && saved.topic))
const resumeTitle = computed(() =>
  hasProgress.value ? `继续「${saved.topic}」` : '还没有学习记录，先输入一个主题吧',
)

function resumeStudy() {
  if (!hasProgress.value) return
  router.push('/study')
}
</script>

<template>
  <header class="site-header">
    <div class="shell site-header__inner">
      <RouterLink v-if="!isHome" class="brand" to="/">
        <BrandMark :size="27" />
        <span class="brand__name">智图伙伴</span>
      </RouterLink>
      <a v-else class="brand" href="#top">
        <BrandMark :size="27" />
        <span class="brand__name">智图伙伴</span>
      </a>

      <nav v-if="isHome" class="site-nav" aria-label="主导航">
        <a
          v-for="item in navItems"
          :key="item.label"
          class="site-nav__link"
          :class="{ 'is-active': item.label === '首页' }"
          :href="item.href"
        >
          {{ item.label }}
        </a>
      </nav>

      <div class="site-header__actions">
        <RouterLink v-if="!isHome" class="resume-button resume-button--link" to="/">
          <span>返回首页</span>
        </RouterLink>

        <button
          v-else
          type="button"
          class="resume-button"
          :disabled="!hasProgress"
          :title="resumeTitle"
          @click="resumeStudy"
        >
          <span>继续上次学习</span>
          <AppIcon name="arrow-right" :size="16" />
        </button>

        <RouterLink
          v-if="!user && !isAuthPage"
          class="login-button"
          :to="{ name: 'auth', query: { redirect: route.fullPath } }"
        >
          登录
        </RouterLink>

        <template v-else-if="user">
          <RouterLink class="user-chip" to="/profile" :title="`${user.name} · ${user.account}`">
            <span class="user-chip__avatar">{{ avatarText }}</span>
            <span class="user-chip__email">{{ user.account }}</span>
          </RouterLink>
          <button type="button" class="logout-button" @click="handleLogout">退出</button>
        </template>
      </div>
    </div>
  </header>
</template>

<style scoped>
.site-header {
  position: sticky;
  top: 0;
  z-index: 20;
  background: rgba(255, 255, 255, 0.88);
  border-bottom: 1px solid var(--border);
  backdrop-filter: saturate(180%) blur(12px);
}

.site-header__inner {
  display: flex;
  align-items: center;
  gap: 28px;
  height: var(--header-height);
}

.brand {
  display: inline-flex;
  align-items: center;
  gap: 9px;
}

.brand__name {
  font-size: 18px;
  font-weight: 700;
  color: var(--ink-900);
  letter-spacing: 0.01em;
}

.site-nav {
  display: flex;
  align-items: center;
  gap: 6px;
}

.site-nav__link {
  position: relative;
  padding: 6px 14px;
  border-radius: var(--radius-sm);
  font-size: 15px;
  color: var(--ink-600);
  transition:
    color 0.18s ease,
    background-color 0.18s ease;
}

.site-nav__link:hover {
  color: var(--brand-600);
  background: var(--brand-50);
}

.site-nav__link.is-active {
  color: var(--brand-600);
  font-weight: 600;
}

.site-nav__link.is-active::after {
  content: '';
  position: absolute;
  left: 50%;
  bottom: -6px;
  width: 22px;
  height: 2px;
  border-radius: 2px;
  background: var(--brand-600);
  transform: translateX(-50%);
}

.site-header__actions {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-left: auto;
}

.resume-button {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 9px 16px;
  border-radius: 10px;
  background: var(--brand-100);
  color: var(--brand-600);
  font-size: 14px;
  font-weight: 600;
  transition:
    background-color 0.18s ease,
    transform 0.18s ease;
}

.resume-button:hover:not(:disabled) {
  background: #d7e5ff;
  transform: translateY(-1px);
}

.resume-button:active:not(:disabled) {
  transform: translateY(0);
}

/* 没有学习记录时禁用：按钮还在原位，用户看得到这个功能，但不会点了被静默弹回 */
.resume-button:disabled {
  background: var(--surface-muted);
  color: var(--ink-400);
  cursor: not-allowed;
}

.login-button {
  display: inline-flex;
  align-items: center;
  padding: 9px 20px;
  border-radius: 10px;
  background: var(--brand-600);
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  box-shadow: var(--shadow-brand);
  transition:
    background-color 0.18s ease,
    box-shadow 0.18s ease,
    transform 0.18s ease;
}

.login-button:hover {
  background: var(--brand-700);
  transform: translateY(-1px);
  box-shadow: 0 12px 24px rgba(37, 99, 235, 0.32);
}

.login-button:active {
  transform: translateY(0);
}

.user-chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 5px 12px 5px 5px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 11px;
  transition:
    border-color 0.18s ease,
    background-color 0.18s ease,
    transform 0.18s ease;
}

.user-chip:hover {
  border-color: var(--brand-200);
  background: var(--brand-50);
  transform: translateY(-1px);
}

.user-chip__avatar {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: var(--brand-600);
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  flex: none;
}

.user-chip__email {
  max-width: 190px;
  overflow: hidden;
  font-size: 13.5px;
  font-weight: 600;
  color: var(--ink-800);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.logout-button {
  padding: 6px 10px;
  border-radius: 8px;
  font-size: 12.5px;
  color: var(--ink-500);
  transition:
    color 0.18s ease,
    background-color 0.18s ease;
}

.logout-button:hover {
  color: var(--danger-600);
  background: var(--danger-50);
}

@media (max-width: 860px) {
  .site-header__inner {
    gap: 14px;
  }

  .site-nav {
    display: none;
  }
}

@media (max-width: 480px) {
  .site-header__actions {
    gap: 8px;
  }

  .resume-button {
    padding: 9px 12px;
  }

  .resume-button span {
    display: none;
  }

  .resume-button--link {
    padding: 9px 14px;
  }

  .resume-button--link span {
    display: inline;
  }

  .login-button {
    padding: 9px 16px;
  }

  .user-chip__email {
    max-width: 92px;
  }
}
</style>
