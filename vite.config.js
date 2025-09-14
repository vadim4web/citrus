import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// dynamic base depending on environment
export default defineConfig(({ command }) => ({
  plugins: [vue()],
  base: command === 'build'
    ? '/cssscope/'  // repo name for GitHub Pages
    : '/',          // local dev
}))