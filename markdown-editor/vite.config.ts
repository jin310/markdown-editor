
import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  define: {
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY || "")
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    assetsInlineLimit: 0, // 确保资源不被 base64 化
    rollupOptions: {
      input: {
        main: './index.html',
      }
    }
  },
  server: {
    port: 3000
  }
});
