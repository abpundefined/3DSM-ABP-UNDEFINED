import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mapaDemo } from '../../src/mocks/mapa';
import { rankingDemo } from '../../src/mocks/ranking';

const servicosMock = [
  {
    id: 1,
    idExterno: 'auth-api',
    nome: 'Auth API',
    estadoAtual: 'DISPONIVEL',
    regiaoCodigo: 'br-sudeste',
    localizacao: { pais: 'Brasil', regiao: 'Sudeste', cidade: 'São Paulo' },
    energiaKwh: 0.04,
    emissaoGCo2e: 4.1,
  },
  {
    id: 2,
    idExterno: 'search-worker',
    nome: 'Search Worker',
    estadoAtual: 'DISPONIVEL',
    regiaoCodigo: 'us-east',
    localizacao: {
      pais: 'Estados Unidos',
      regiao: 'Virgínia',
      cidade: 'Ashburn',
    },
    energiaKwh: 0.12,
    emissaoGCo2e: 42.3,
  },
  {
    id: 3,
    idExterno: 'video-encoder',
    nome: 'Video Encoder',
    estadoAtual: 'DISPONIVEL',
    regiaoCodigo: 'jp-east',
    localizacao: { pais: 'Japão', regiao: 'Tóquio', cidade: 'Tóquio' },
    energiaKwh: 0.25,
    emissaoGCo2e: 118.4,
  },
  {
    id: 4,
    idExterno: 'legacy-cron',
    nome: 'Legacy Cron',
    estadoAtual: 'SEM_METRICAS',
    regiaoCodigo: 'eu-west',
    localizacao: { pais: 'Irlanda', regiao: 'Leinster', cidade: 'Dublin' },
    energiaKwh: null,
    emissaoGCo2e: null,
  },
];

const ultimasColetas: Record<number, Record<string, unknown> | null> = {
  1: {
    iniciadaEm: '2026-11-20T12:00:00Z',
    cpuPercent: 24.5,
    memoryGb: 1.5,
    diskGb: 12.0,
    networkGb: 0.8,
    energiaKwh: 0.04,
    emissaoGCo2e: 4.1,
  },
  2: {
    iniciadaEm: '2026-11-20T12:00:00Z',
    cpuPercent: 64.0,
    memoryGb: 4.2,
    diskGb: 25.0,
    networkGb: 2.1,
    energiaKwh: 0.12,
    emissaoGCo2e: 42.3,
  },
  3: {
    iniciadaEm: '2026-11-20T12:00:00Z',
    cpuPercent: 88.2,
    memoryGb: 8.0,
    diskGb: 64.0,
    networkGb: 5.5,
    energiaKwh: 0.25,
    emissaoGCo2e: 118.4,
  },
  4: null,
};

async function mockDashboardAnelCpu(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem('greener-tour-visto', '1');
  });

  await page.route('**/api/servicos', (route) =>
    route.fulfill({ json: servicosMock }),
  );
  await page.route('**/api/coletas/servico/*/ultima-valida', (route) => {
    const match = /\/servico\/(\d+)\//.exec(route.request().url());
    const id = match ? Number(match[1]) : 0;
    const dados = ultimasColetas[id] ?? null;
    if (!dados) {
      return route.fulfill({ status: 404, json: { erro: 'Sem coleta' } });
    }
    return route.fulfill({ json: { dados } });
  });
  await page.route('**/api/configuracao', (route) =>
    route.fulfill({ json: { intervaloColetaSegundos: 60 } }),
  );
  await page.route('**/api/indicadores**', (route) =>
    route.fulfill({
      json: {
        energiaTotalKwh: 0.41,
        emissaoTotalGCo2e: 164.8,
        servicos: {
          disponiveis: 3,
          indisponiveis: 0,
          semMetricas: 1,
          removidos: 0,
        },
      },
    }),
  );
  await page.route('**/api/indicadores/serie**', (route) =>
    route.fulfill({
      json: {
        periodo: mapaDemo.periodo,
        granularidade: 'hora',
        intervalos: [],
        global: [],
        servicos: [],
      },
    }),
  );
  await page.route('**/api/indicadores/meta', (route) =>
    route.fulfill({
      json: {
        metaMensal: null,
        acumuladoMes: 5,
        diasDecorridos: 15,
        diasNoMes: 30,
        projecaoMes: 10,
      },
    }),
  );
  await page.route('**/api/mapa**', (route) =>
    route.fulfill({ json: mapaDemo }),
  );
  await page.route('**/api/ranking**', (route) =>
    route.fulfill({ json: rankingDemo('energia') }),
  );
}

test('cards de serviço exibem anel de CPU com role="meter", número central e rótulo textual em todas as faixas', async ({
  page,
}) => {
  await mockDashboardAnelCpu(page);
  await page.goto('/');

  const cardBaixo = page.getByRole('article', { name: 'Auth API' });
  const meterBaixo = cardBaixo.getByRole('meter', { name: 'Uso de CPU' });
  await expect(meterBaixo).toBeVisible();
  await expect(meterBaixo).toHaveAttribute('aria-valuemin', '0');
  await expect(meterBaixo).toHaveAttribute('aria-valuemax', '100');
  await expect(meterBaixo).toHaveAttribute('aria-valuenow', '24.5');
  await expect(meterBaixo).toContainText('24,5 %');
  await expect(meterBaixo).toContainText('Baixo');

  const cardModerado = page.getByRole('article', { name: 'Search Worker' });
  const meterModerado = cardModerado.getByRole('meter', { name: 'Uso de CPU' });
  await expect(meterModerado).toHaveAttribute('aria-valuenow', '64');
  await expect(meterModerado).toContainText('64,0 %');
  await expect(meterModerado).toContainText('Moderado');

  const cardAlto = page.getByRole('article', { name: 'Video Encoder' });
  const meterAlto = cardAlto.getByRole('meter', { name: 'Uso de CPU' });
  await expect(meterAlto).toHaveAttribute('aria-valuenow', '88.2');
  await expect(meterAlto).toContainText('88,2 %');
  await expect(meterAlto).toContainText('Alto');

  const cardSemDados = page.getByRole('article', { name: 'Legacy Cron' });
  const meterSemDados = cardSemDados.getByRole('meter', { name: 'Uso de CPU' });
  await expect(meterSemDados).toHaveAttribute('aria-valuenow', '0');
  await expect(meterSemDados).toContainText('—');
  await expect(meterSemDados).toContainText('Sem dados');
});

test('anel de CPU passa no Axe em tema claro e escuro e sem rolagem horizontal em 375 px', async ({
  page,
}) => {
  await mockDashboardAnelCpu(page);
  await page.goto('/');

  await expect(
    page.getByRole('article', { name: 'Video Encoder' }).getByRole('meter'),
  ).toBeVisible();

  const axeClaro = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(axeClaro.violations).toEqual([]);

  await page.evaluate(() => {
    document.documentElement.setAttribute('data-theme', 'dark');
  });
  const axeEscuro = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(axeEscuro.violations).toEqual([]);

  await page.setViewportSize({ width: 375, height: 800 });
  const larguras = await page.evaluate(() => ({
    pagina: document.documentElement.scrollWidth,
    tela: document.documentElement.clientWidth,
  }));
  expect(larguras.pagina).toBe(larguras.tela);
});
