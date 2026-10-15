import { defineConfig } from 'vite';
import { copyFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    target: 'es2022',
    chunkSizeWarningLimit: 1200
  },
  plugins: [
    {
      name: 'copy-root-mp3-asset',
      closeBundle() {
        const srcMp3 = resolve(__dirname, 'Of_Us_Master_Game.mp3');
        const destMp3 = resolve(__dirname, 'dist', 'Of_Us_Master_Game.mp3');
        if (existsSync(srcMp3)) {
          copyFileSync(srcMp3, destMp3);
        }
      }
    }
  ]
});