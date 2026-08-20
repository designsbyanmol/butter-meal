import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  css: {
    preprocessorOptions: {
      scss: {
        quietDeps: true,
      }
    }
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: false,
    minify: "esbuild",
    rollupOptions: {
      output: {
        manualChunks: undefined,
        inlineDynamicImports: true,
      }
    },
    assetsInlineLimit: 0,
    cssCodeSplit: false,
    modulePreload: {
      polyfill: false,
    },
  },
  server: {
    watch: { usePolling: true },
    open: true,
  },
  base: "./",
});
