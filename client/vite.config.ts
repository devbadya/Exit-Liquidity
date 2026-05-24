import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],

  build: {
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) return 'react-vendor';
            if (id.includes('@heroui') || id.includes('tailwind-variants') || id.includes('tw-animate')) return 'heroui-vendor';
            if (id.includes('recharts') || id.includes('d3-') || id.includes('victory')) return 'chart-vendor';
            if (id.includes('lucide-react')) return 'icons-vendor';
          }
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },

  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:3001', changeOrigin: true },
    },
  },
});
