import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { simulacaoDemo } from '../../src/mocks/simulacao';

const service = {
  id: 4,
  idExterno: 'search-api',
  nome: 'Search API',
  regiaoCodigo: 'us-east',
  localizacao: {
    pais: 'Estados Unidos',
    regiao: 'Virgínia',
    cidade: 'Ashburn',
  },
  estadoAtual: 'DISPONIVEL',
};

const history = [
  {
    inicio: '2026-11-15T13:00:00.000Z',
    energiaKwh: 1.25,
    emissaoGCo2e: 1200,
  },
  {
    inicio: '2026-11-15T14:00:00.000Z',
    energiaKwh: 0.75,
    emissaoGCo2e: 800,
  },
  {
    inicio: '2026-11-15T15:00:00.000Z',
    energiaKwh: null,
    emissaoGCo2e: null,
  },
];

async function mockServiceDetail(
  page: Page,
  options: {
    services?: unknown[];
    history?: unknown[];
    latestStatus?: number;
  } = {},
) {
  const services = options.services ?? [service];
  await page.route('**/api/servicos', (route) =>
    route.fulfill({ json: services }),
  );
  await page.route('**/api/servicos/4/historico**', (route) =>
    route.fulfill({ json: options.history ?? history }),
  );
  await page.route('**/api/coletas/servico/4/ultima-valida', (route) =>
    options.latestStatus === 404
      ? route.fulfill({
          status: 404,
          json: { statusCode: 404, message: 'Nenhuma coleta válida.' },
        })
      : route.fulfill({
          json: {
            fonte: 'BANCO',
            dados: {
              iniciadaEm: '2026-11-15T14:00:00.000Z',
              intervaloColetaSegundos: 30,
              cpuPercent: 42,
              memoryGb: 1.5,
              diskGb: 10,
              networkGb: 0.25,
              energiaKwh: 0.75,
              emissaoGCo2e: 800,
            },
          },
        }),
  );
  await page.route('**/api/servicos/4/simulacao-regiao**', (route) =>
    route.fulfill({ json: simulacaoDemo(4) }),
  );
}

test('exibe metadados, totais, histórico e preserva o período na comparação', async ({
  page,
}) => {
  const historyRequests: string[] = [];
  await mockServiceDetail(page);
  await page.route('**/api/servicos/4/historico**', async (route) => {
    historyRequests.push(route.request().url());
    await route.fulfill({ json: history });
  });
  await page.goto('/servicos/4?periodo=7d');

  await expect(
    page.getByRole('heading', { level: 1, name: 'Search API' }),
  ).toBeVisible();
  await expect(
    page.getByText('Estados Unidos · Virgínia — Ashburn'),
  ).toBeVisible();
  await expect(
    page
      .getByRole('region', { name: 'Informações do serviço' })
      .getByText('Ativo', { exact: true }),
  ).toBeVisible();
  await expect(
    page
      .getByRole('region', { name: 'Informações do serviço' })
      .getByText('15/11/2026, 11:00:00', { exact: true }),
  ).toBeVisible();
  await expect(page.getByText('2,00 kWh')).toBeVisible();
  await expect(page.getByText('2,00 kgCO₂e')).toBeVisible();
  await expect(page.getByText('Energia (kWh)')).toBeVisible();
  await expect(page.getByText('Emissão (kgCO₂e)')).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'Comparar com outro serviço' }),
  ).toHaveAttribute('href', '/comparar?servicos=4&periodo=7d');
  expect(historyRequests.some((url) => url.includes('periodo=7d'))).toBe(true);

  await page.getByText('Consultar valores do histórico em tabela').click();
  await expect(page.getByRole('table')).toContainText('1,25 kWh');
});

test('mostra o estado vazio e a ausência de coleta válida', async ({
  page,
}) => {
  await mockServiceDetail(page, { history: [], latestStatus: 404 });
  await page.goto('/servicos/4');

  await expect(
    page.getByRole('heading', { name: 'Nenhum dado no período' }),
  ).toBeVisible();
  await expect(page.getByText('Sem coleta válida registrada')).toBeVisible();
  await expect(page.getByText('—', { exact: true }).first()).toBeVisible();
});

test('informa que o serviço não existe e oferece retorno ao dashboard', async ({
  page,
}) => {
  await mockServiceDetail(page, { services: [] });
  await page.goto('/servicos/4');

  await expect(
    page.getByRole('heading', { level: 1, name: 'Serviço não encontrado' }),
  ).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'Voltar ao dashboard' }),
  ).toHaveAttribute('href', '/');
});

test('mostra carregamento e permite repetir uma consulta com erro', async ({
  page,
}) => {
  let releaseServices: (() => Promise<void>) | undefined;
  await page.route(
    '**/api/servicos',
    (route) =>
      new Promise<void>((resolve) => {
        releaseServices = async () => {
          await route.fulfill({ json: [service] });
          resolve();
        };
      }),
  );
  await page.route('**/api/servicos/4/historico**', (route) =>
    route.fulfill({ json: history }),
  );
  await page.route('**/api/coletas/servico/4/ultima-valida', (route) =>
    route.fulfill({ status: 404 }),
  );
  await page.route('**/api/servicos/4/simulacao-regiao**', (route) =>
    route.fulfill({ json: simulacaoDemo(4) }),
  );
  await page.goto('/servicos/4');
  await expect(
    page.getByRole('heading', { name: 'Carregando o serviço' }),
  ).toBeVisible();
  await releaseServices?.();
  await expect(
    page.getByRole('heading', { level: 1, name: 'Search API' }),
  ).toBeVisible();
});

test('exibe erro e tenta novamente quando a API volta a responder', async ({
  page,
}) => {
  let serviceRequests = 0;
  await page.route('**/api/servicos', (route) => {
    serviceRequests += 1;
    return serviceRequests === 1
      ? route.fulfill({
          status: 503,
          json: { statusCode: 503, message: 'API indisponível.' },
        })
      : route.fulfill({ json: [service] });
  });
  await page.route('**/api/servicos/4/historico**', (route) =>
    route.fulfill({ json: history }),
  );
  await page.route('**/api/coletas/servico/4/ultima-valida', (route) =>
    route.fulfill({ status: 404 }),
  );
  await page.route('**/api/servicos/4/simulacao-regiao**', (route) =>
    route.fulfill({ json: simulacaoDemo(4) }),
  );
  await page.goto('/servicos/4');

  await expect(page.getByRole('alert')).toContainText('HTTP 503');
  await page.getByRole('button', { name: 'Tentar novamente' }).click();
  await expect(
    page.getByRole('heading', { level: 1, name: 'Search API' }),
  ).toBeVisible();
});

test('não cria rolagem horizontal em 375 px nem em 1920 px', async ({
  page,
}) => {
  await mockServiceDetail(page);
  await page.goto('/servicos/4');
  await expect(
    page.getByRole('heading', { level: 1, name: 'Search API' }),
  ).toBeVisible();

  for (const width of [375, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    const dimensions = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      content: document.documentElement.scrollWidth,
    }));
    expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport + 1);
  }
});

for (const theme of ['light', 'dark']) {
  test(`página de detalhe sem violações do Axe no tema ${theme}`, async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.addInitScript((value) => {
      localStorage.setItem('greener-theme', value);
    }, theme);
    await mockServiceDetail(page);
    await page.goto('/servicos/4?periodo=7d');
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
    await expect(
      page.getByRole('heading', { level: 1, name: 'Search API' }),
    ).toBeVisible();

    const result = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    expect(result.violations).toEqual([]);
  });
}
