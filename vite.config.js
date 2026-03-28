import { defineConfig } from 'vite';
import react, { reactCompilerPreset } from '@vitejs/plugin-react';
import babel from '@rolldown/plugin-babel';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] })
  ],
  server: {
    proxy: {
      // Routes requests from localhost:5173/api to the Vercel local dev server
      '/api': {
        target: 'http://localhost:3000', // Default port for `vercel dev`
        changeOrigin: true,
        secure: false,
      }
    }
  }
});