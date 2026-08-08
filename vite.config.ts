import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages project site: https://caronkwon-dotcom.github.io/baseKit/
export default defineConfig({
  base: '/baseKit/',
  plugins: [react()],
})
