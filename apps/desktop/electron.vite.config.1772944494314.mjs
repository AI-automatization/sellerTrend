// electron.vite.config.ts
import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { resolve } from "path";
var __electron_vite_injected_dirname = "C:\\Users\\User\\uzum\\sellerTrend\\apps\\desktop";
var electron_vite_config_default = defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      outDir: "out/main",
      rollupOptions: {
        input: resolve(__electron_vite_injected_dirname, "src/main/index.ts")
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      outDir: "out/preload",
      rollupOptions: {
        input: resolve(__electron_vite_injected_dirname, "src/preload/index.ts")
      }
    }
  },
  renderer: {
    root: resolve(__electron_vite_injected_dirname, "../web"),
    envDir: resolve(__electron_vite_injected_dirname, "."),
    plugins: [react(), tailwindcss()],
    resolve: {
      dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime"]
    },
    optimizeDeps: {
      include: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "recharts"]
    },
    build: {
      outDir: resolve(__electron_vite_injected_dirname, "out/renderer"),
      rollupOptions: {
        input: resolve(__electron_vite_injected_dirname, "../web/index.html")
      }
    },
    server: {
      port: 5173,
      proxy: {
        "/api/v1": {
          target: "http://localhost:3000",
          changeOrigin: true
        }
      }
    }
  }
});
export {
  electron_vite_config_default as default
};
