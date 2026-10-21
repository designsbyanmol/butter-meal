// vite.config.ts
import { defineConfig, type UserConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';
import path from 'path';
import { manifestPlugin } from './scripts/manifest-plugin.ts';

export const PAGES = [
  { html: 'home.html', title: 'Dozzelo — Launch your online store' },
  { html: 'signup.html', title: 'Create your store — Dozzelo' },
  { html: 'customer.html', title: 'Order — Dozzelo' },
  { html: 'admin.html', title: 'Store Admin — Dozzelo' },
  { html: 'admin-menu.html', title: 'Menu — Dozzelo' },
  { html: 'admin-store.html', title: 'Store — Dozzelo' },
  { html: 'admin-users.html', title: 'Users — Dozzelo' },
  { html: 'admin-orders.html', title: 'Orders — Dozzelo' },
  { html: 'admin-reviews.html', title: 'Reviews — Dozzelo' },
  { html: 'admin-info.html', title: 'Store Info — Dozzelo' },
  { html: 'superadmin.html', title: 'Super Admin — Dozzelo' },
  { html: 'superadmin-stores.html', title: 'Stores — Dozzelo' },
  { html: 'superadmin-reviews.html', title: 'Reviews — Dozzelo' },
  { html: 'plans.html', title: 'Plans — Dozzelo' },
  { html: 'superadmin-revenue.html', title: 'Revenue — Dozzelo' },
  { html: 'superadmin-settings.html', title: 'Settings — Dozzelo' },
  { html: 'contact.html', title: 'Contact — Dozzelo' },
  { html: 'cookies.html', title: 'Cookies and Policies — Dozzelo' },
  { html: 'terms.html', title: 'Terms of use — Dozzelo' },
  { html: 'security.html', title: 'Security — Dozzelo' },
  { html: 'privacy.html', title: 'Privacy Policy — Dozzelo' },
] as const;

export type Page = (typeof PAGES)[number];

export const buildConfigForPage = (page: Page): UserConfig => ({
  plugins: [
    react(),
    viteSingleFile(),
    manifestPlugin(page.html.replace('.html', '').toLowerCase(), page.html),
  ],
  css: {
    preprocessorOptions: {
      scss: { quietDeps: true },
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    sourcemap: false,
    minify: 'esbuild',
    assetsInlineLimit: 100_000_000,
    cssCodeSplit: false,
    modulePreload: { polyfill: false },
    rolldownOptions: {
      input: {
        [path.basename(page.html, '.html').toLowerCase()]: path.resolve(
          import.meta.dirname,
          page.html,
        ),
      },
      output: {
        inlineDynamicImports: true,
        manualChunks: undefined,
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        assetFileNames: '[name].[ext]',
      },
    },
  },
  server: {
    watch: { usePolling: true },
    open: '/home.html',
  },
  base: './',
});

export default defineConfig({
  plugins: [react()],
  css: {
    preprocessorOptions: {
      scss: { quietDeps: true },
    },
  },
  server: {
    watch: { usePolling: true },
    open: '/home.html',
  },
  base: './',
});