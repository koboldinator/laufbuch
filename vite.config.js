import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base './' – funktioniert auf GitHub Pages (Unterordner) und Firebase Hosting
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 1200,
  },
});
