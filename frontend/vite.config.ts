import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv, type Plugin } from 'vite';

function normalizarBasePath(valor: string | undefined): string {
  const limpo = (valor ?? '').trim();
  if (!limpo || limpo === '/') {
    return '/';
  }
  const semBarras = limpo.replace(/^\/+|\/+$/g, '');
  return semBarras ? `/${semBarras}/` : '/';
}

function gerarHtml404Spa(basePath: string): string {
  const baseSerializada = JSON.stringify(basePath);
  return `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Redirecionando · GreenER</title>
    <script>
      (function () {
        var destino =
          window.location.pathname +
          window.location.search +
          window.location.hash;
        try {
          window.sessionStorage.setItem('greener-spa-redirect', destino);
        } catch (erro) {
          // Ignora indisponibilidade de sessionStorage
        }
        window.location.replace(${baseSerializada});
      })();
    </script>
  </head>
  <body></body>
</html>
`;
}

function pluginFallbackGitHubPages(basePath: string): Plugin {
  return {
    name: 'greener-github-pages-spa',
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: '404.html',
        source: gerarHtml404Spa(basePath),
      });
      this.emitFile({
        type: 'asset',
        fileName: '.nojekyll',
        source: '',
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const removeApiPrefix = env.API_PROXY_REWRITE !== 'false';
  const basePath = normalizarBasePath(
    process.env.VITE_BASE_PATH ?? env.VITE_BASE_PATH,
  );
  const demoStatic =
    (process.env.VITE_DEMO_MODE ?? env.VITE_DEMO_MODE) === 'true';
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
    base: basePath,
    plugins: [
      react(),
      ...(demoStatic ? [pluginFallbackGitHubPages(basePath)] : []),
    ],
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
