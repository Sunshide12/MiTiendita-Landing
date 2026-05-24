// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import cloudflare from '@astrojs/cloudflare';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: process.env.SITE_URL || 'https://mitienda.com',
  output: 'server',
  adapter: cloudflare(),

  integrations: [
    react(),
    sitemap({
      filter: (page) =>
        !page.includes('/register') &&
        !page.includes('/setup') &&
        !page.includes('/upload') &&
        !page.includes('/processing') &&
        !page.includes('/preview'),
    }),
  ],

  vite: {
    plugins: [tailwindcss()],
  },
});