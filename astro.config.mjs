// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import vercel from '@astrojs/vercel';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: process.env.SITE_URL || 'https://mitienda.com',
  output: 'server',
  adapter: vercel(),

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