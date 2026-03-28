import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes('src/data/phrases')) return 'data-phrases'
          if (id.includes('src/data/dict') || id.includes('src/data/level2Groups')) return 'data-dict'
          if (id.includes('node_modules/@reduxjs') || id.includes('node_modules/react-redux') || id.includes('node_modules/redux')) return 'vendor-redux'
          if (id.includes('node_modules/react-dom')) return 'vendor-react'
        },
      },
    },
  },
})
