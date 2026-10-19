import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// GitHub Pages 项目站点挂在 /campus-errand/ 子路径下
export default defineConfig({
  base: '/campus-errand/',
  plugins: [react(), tailwindcss()],
})
