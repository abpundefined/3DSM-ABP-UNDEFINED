import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'API_');
  const removeApiPrefix = env.API_PROXY_REWRITE !== 'false';
  const proxy = {
    '/api': {
      target: env.API_PROXY_TARGET || 'http://localhost:3000',
      changeOrigin: true,
      rewrite: removeApiPrefix
        ? (path: string) => path.replace(/^\/api(?=\/|$|\?)/, '')
        : undefined,
    },
  };

  return {
    plugins: [react()],
    server: {
      host: 'localhost',
      port: 5173,
      strictPort: true,
      proxy,
    },
    preview: {
      host: 'localhost',
      port: 4173,
      strictPort: true,
      proxy,
    },
  };
});
