import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // 可以在这里添加路径别名，比如：
      // '@': new URL('./src', import.meta.url).pathname,
    },
  },
  server: {
    port: 5173,
    // 如果需要本地反向代理后端，可以在这里配置：
    // proxy: {
    //   '/api': {
    //     target: 'http://localhost:3000',
    //     changeOrigin: true,
    //   },
    // },
  },
  // 这里不用特别配置环境变量，Vite 默认会加载 .env 文件里的 VITE_* 变量
})

