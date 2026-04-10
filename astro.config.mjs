// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  site: 'https://kaanyaren.github.io',
  base: '/betterpota',
  build: {
    assets: 'assets'
  }
});
