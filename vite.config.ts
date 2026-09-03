// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";

export default defineConfig({
  plugins: [
    react(),
    viteSingleFile(), // This will bundle everything into a single HTML file
  ],
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
    // Disable code splitting to keep everything in one file
    rollupOptions: {
      output: {
        manualChunks: undefined,
        inlineDynamicImports: true,
      }
    },
    assetsInlineLimit: 100000000, // Inline all assets as base64
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