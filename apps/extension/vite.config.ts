import { defineConfig } from 'vite';
import { crx } from '@crxjs/vite-plugin';
import { resolve } from 'path';
import manifest from './public/manifest.json';

export default defineConfig({
  plugins: [
    crx({ manifest: manifest as any }),
  ],
  server: {
    fs: {
      // Allow loading shared engine code from the monorepo root.
      allow: [resolve(__dirname, '..', '..', '..')]
    }
  },
  build: {
    rollupOptions: {
      input: {
        // Build offscreen.ts to offscreen.js
        offscreen: resolve(__dirname, 'src/offscreen.ts'),
      },
      output: {
        entryFileNames: (chunkInfo) => {
          if (chunkInfo.name === 'offscreen') {
            return '[name].js';
          }
          return 'assets/[name]-[hash].js';
        },
      },
    },
  },
});
