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
      // catch-all：原来的路由表没有兜底，访问不存在的地址时 <RouterView>
      // 什么都渲染不出来，整个页面是空白的（实测 body 文字量为 0）。
      // 规划在 §2.3 / §10 / §14.7 反复强调「任何情况下不出现空白页」。
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: () => import('../views/NotFoundView.vue'),
    },
  ],
  scrollBehavior(_to, _from, savedPosition) {
    return savedPosition ?? { top: 0 }
  },
})

export default router
