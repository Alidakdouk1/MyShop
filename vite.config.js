import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
    babel({ presets: [reactCompilerPreset()] }),
  ],
  server: {
    proxy: {
      '/MyShop/backend': {
        target: 'http://localhost',
        changeOrigin: true,
      },
    },
  },
  // Pre-bundle the PDF libs at dev startup. They're only reached via a dynamic
  // import() (in OrderDetail), so without this Vite optimizes them on first use
  // and the dynamic chunk can fail to load until a restart.
  optimizeDeps: {
    include: ['jspdf', 'jspdf-autotable'],
  },
})
