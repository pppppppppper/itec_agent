import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import { isAuthenticated } from '../composables/useAuth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
    },
    {
      path: '/auth',
      name: 'auth',
      // 登录 / 注册页，独立分包按需加载
      component: () => import('../views/AuthView.vue'),
      beforeEnter: () => (isAuthenticated() ? { name: 'home' } : true),
    },
    {
      path: '/profile',
      name: 'profile',
      // 个人中心暂未实现，先保留路由占位，避免点击头像后出现空白页
      component: () => import('../views/ProfileView.vue'),
      // 与 /auth 的守卫对称：未登录不该停在个人中心。
      // 补这个之前，在 /profile 点「退出」会留在原地，而页面文案里的
      // `user?.account` 已经变空，渲染成「这里之后会展示 的学习地图…」。
      beforeEnter: () =>
        isAuthenticated() ? true : { name: 'auth', query: { redirect: '/profile' } },
    },
    {
      path: '/study',
      name: 'study',
      // 学习空间比较重（契约层 + zod + SDK），单独切一个 chunk
      component: () => import('../views/StudyView.vue'),
    },
    {
      path: '/about',
      name: 'about',
      // route level code-splitting
      // this generates a separate chunk (About.[hash].js) for this route
      // which is lazy-loaded when the route is visited.
      component: () => import('../views/AboutView.vue'),
    },
  ],
  scrollBehavior(_to, _from, savedPosition) {
    return savedPosition ?? { top: 0 }
  },
})

export default router
