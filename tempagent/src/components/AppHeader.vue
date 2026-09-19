<script setup>
const navItems = [
  { label: '首页', href: '#top' },
  { label: '学习方法', href: '#topics' },
  { label: '功能介绍', href: '#features' },
]
</script>

<template>
  <header class="site-header">
    <div class="shell site-header__inner">
      <a class="brand" href="#top">
        <svg class="brand__mark" viewBox="0 0 28 28" fill="none" aria-hidden="true">
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
        <span class="brand__name">智图伙伴</span>
      </a>

      <nav class="site-nav" aria-label="主导航">
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

      <button type="button" class="resume-button" title="继续上次的学习地图">
        <span>继续上次学习</span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M4.6 12h14.2M13.4 6.4 19 12l-5.6 5.6"
            stroke="currentColor"
            stroke-width="1.9"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </button>
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

.brand__mark {
  width: 27px;
  height: 27px;
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

.resume-button {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-left: auto;
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

.resume-button:hover {
  background: #d7e5ff;
  transform: translateY(-1px);
}

.resume-button:active {
  transform: translateY(0);
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
  .resume-button span {
    display: none;
  }
}
</style>
