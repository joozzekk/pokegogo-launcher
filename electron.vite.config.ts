import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()]
  },
  preload: {
    plugins: [externalizeDepsPlugin()]
  },
  renderer: {
    root: resolve(__dirname, 'src/ui'),
    resolve: {
      alias: {
        '@ui': resolve('src/ui/src')
      }
    },
    build: {
      outDir: resolve(__dirname, 'out/ui'),
      rollupOptions: {
        input: {
          main: resolve(__dirname, 'src/ui/index.html'),
          loading: resolve(__dirname, 'src/ui/loading.html')
        }
      }
    },
    plugins: [vue(), tailwindcss()]
  }
})
