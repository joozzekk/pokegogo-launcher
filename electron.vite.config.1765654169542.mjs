// electron.vite.config.ts
import { resolve } from "path";
import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import vue from "@vitejs/plugin-vue";
import tailwindcss from "@tailwindcss/vite";
var __electron_vite_injected_dirname = "/project";
var electron_vite_config_default = defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()]
  },
  preload: {
    plugins: [externalizeDepsPlugin()]
  },
  renderer: {
    resolve: {
      alias: {
        "@renderer": resolve("src/renderer/src")
      }
    },
    build: {
      rollupOptions: {
        input: {
          main: resolve(__electron_vite_injected_dirname, "src/renderer/index.html"),
          loading: resolve(__electron_vite_injected_dirname, "src/renderer/loading.html")
        }
      }
    },
    plugins: [vue(), tailwindcss()]
  }
});
export {
  electron_vite_config_default as default
};
