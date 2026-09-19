import { fileURLToPath, URL } from 'node:url'

import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const target = env.OPENHEX_API_BASE || 'https://api.openhex.tech'
  const key = env.OPENHEX_API_KEY || ''

  return {
    plugins: [
      vue(),
      // devtools 只在 dev 下挂载；不带 apply 的话生产构建也会把它打进去
      ...(mode === 'development' ? [vueDevTools()] : []),
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      port: 5173,
      /**
       * 开发期把 /openhex-proxy/* 转发到 OpenHex 平台，在这里注入真实凭据。
       * 浏览器侧永远只看到一个明显是假的占位符（见 src/agent/client.ts），
       * 真实的 mysta_… 只存在于这个进程的环境变量里。
       * 对应官方文档「浏览器里的正确做法」的反向代理方案。
       */
      proxy: {
        '/openhex-proxy': {
          target,
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/openhex-proxy/, ''),
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              // 必须覆盖而不是追加：SDK 会带上占位符 key
              proxyReq.setHeader('authorization', key ? `Bearer ${key}` : 'Bearer missing-key')
            })
          },
        },
      },
    },
    build: {
      // 部署在根路径就用默认值；要挂到子路径时改这里（同时改 router 的 base）
      sourcemap: true,
    },
  }
})
