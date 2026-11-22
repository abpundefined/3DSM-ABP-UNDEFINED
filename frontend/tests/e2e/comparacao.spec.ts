import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const services = [
  { id: 1, nome: 'Billing API' },
  { id: 2, nome: 'Reports Engine' },
  { id: 3, nome: 'Search Worker' },
  { id: 4, nome: 'Notifications API' },
  { id: 5, nome: 'Metrics Collector' },
  { id: 6, nome: 'Audit Service' },
].map(({ id, nome }) => ({
  id,
  nome,
  idExterno: nome.toLocaleLowerCase('en-US').replaceAll(' ', '-'),
  regiaoCodigo: 'br-sudeste',
  localizacao: {
    pais: 'Brasil',
    regiao: 'São Paulo',
    cidade: 'São Paulo',
  },
  selo: 'A',
  estadoAtual: 'DISPONIVEL',
}));

function comparisonResponse(ids: number[]) {
  return {
    periodo: {
      inicio: '2026-11-10T00:00:00.000Z',
      fim: '2026-11-17T23:59:59.999Z',
    },
    granularidade: 'hora',
    servicos: ids.map((id) => ({
      servicoId: id,
      nome:
        services.find((service) => service.id === id)?.nome ?? `Serviço ${id}`,
      totais: {
        energiaKwh: id === 1 ? 0.002 : 0.001,
        emissaoGCo2e: id === 1 ? 0.4 : 0.9,
        cpuMedia: 20 + id,
        memoriaMediaMb: 512 * id,
        coletasValidas: 2,
      },
      serie: [
        {
          inicio: '2026-11-10T00:00:00.000Z',
          energiaKwh: 0.001,
          emissaoGCo2e: 0.2,
        },
        {
          inicio: '2026-11-10T01:00:00.000Z',
          energiaKwh: 0.001,
          emissaoGCo2e: 0.3,
        },
      ],
    })),
  };
}

async function mockComparisonRoutes(page: Page) {
  await page.route('**/api/servicos', (route) =>
    route.fulfill({ json: services }),
  );
  await page.route('**/api/comparacao**', (route) => {
    const url = new URL(route.request().url());
    const ids = (url.searchParams.get('servicos') ?? '')
      .split(',')
      .filter(Boolean)
      .map(Number);
    return route.fulfill({ json: comparisonResponse(ids) });
  });
}

async function mockDashboardRoutes(page: Page) {
  await page.route('**/api/coletas/servico/*/ultima-valida', (route) =>
    route.fulfill({
      json: {
        fonte: 'BANCO',
        dados: {
          iniciadaEm: '2026-11-17T12:00:00.000Z',
          intervaloColetaSegundos: 30,
          cpuPercent: 35,
          memoryGb: 1,
          diskGb: 10,
          networkGb: 0.5,
          energiaKwh: 0.002,
          emissaoGCo2e: 0.4,
        },
      },
    }),
  );
  await page.route('**/api/configuracao', (route) =>
    route.fulfill({ json: { intervaloColetaSegundos: 30 } }),
  );
  await page.route('**/api/indicadores**', (route) =>
    route.fulfill({
      json: {
        energiaTotalKwh: 0.01,
        emissaoTotalGCo2e: 1.5,
        servicos: {
          disponiveis: 6,
          indisponiveis: 0,
          semMetricas: 0,
          removidos: 0,
        },
      },
    }),
  );
}

test('compara serviços escolhidos pela busca, preserva o período e atende Axe e responsividade', async ({
  page,
}) => {
  await mockComparisonRoutes(page);
  await page.goto('/comparar?servicos=1&periodo=7d');

  const secondService = page.getByRole('checkbox', {
    name: 'Selecionar Reports Engine para comparação',
  });
  await expect(secondService).toBeVisible();
  await page.getByRole('searchbox', { name: 'Buscar serviço' }).fill('Reports');
  await secondService.click();
  await expect(secondService).toBeChecked();

  await expect
    .poll(() => new URL(page.url()).searchParams.get('servicos'))
    .toBe('1,2');
  expect(new URL(page.url()).searchParams.get('periodo')).toBe('7d');
  await expect(
    page.getByRole('heading', { name: 'Indicadores por serviço' }),
  ).toBeVisible();
  await expect(page.getByText('Maior emissão no período')).toBeVisible();
  await expect(
    page
      .getByRole('region', { name: 'Totais dos serviços comparados' })
      .getByText('2,00 Wh'),
  ).toBeVisible();
  await expect(
    page
      .getByRole('region', { name: 'Totais dos serviços comparados' })
      .getByText('0,90 gCO₂e'),
  ).toBeVisible();
  await expect(page.getByText('900,0 gCO₂e/kWh')).toBeVisible();
  await expect(
    page.getByRole('img', {
      name: 'Gráfico de barras dos totais de energia em kWh',
    }),
  ).toBeVisible();
  await expect(
    page.getByRole('img', {
      name: 'Gráfico de linhas da evolução de energia em kWh',
    }),
  ).toBeVisible();

  const axe = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(axe.violations).toEqual([]);

  for (const width of [375, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    const dimensions = await page.evaluate(() => ({
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
    }));
    expect(dimensions.documentWidth).toBeLessThanOrEqual(
      dimensions.viewportWidth,
    );
  }
});

test('acumula seleções do ranking no dashboard e abre a comparação', async ({
  page,
}, testInfo) => {
  await mockComparisonRoutes(page);
  await mockDashboardRoutes(page);
  await page.route('**/api/ranking**', (route) =>
    route.fulfill({
      json: {
        periodo: {
          inicio: '2026-11-10T00:00:00.000Z',
          fim: '2026-11-17T23:59:59.999Z',
        },
        metrica: 'energia',
        itens: services.slice(0, 2).map((service, index) => ({
          posicao: index + 1,
          servicoId: service.id,
          nome: service.nome,
          energiaKwh: 0.002,
          emissaoGCo2e: 0.4,
          coletasValidas: 2,
          selo: service.selo,
        })),
        semDados: [],
      },
    }),
  );

  await page.goto('/ranking?periodo=7d');
  const billingRow = page.getByRole('row', { name: /Billing API/ });
  const reportsRow = page.getByRole('row', { name: /Reports Engine/ });
  await billingRow.getByRole('button', { name: 'Comparar' }).click();
  await reportsRow.getByRole('button', { name: 'Comparar' }).click();
  await expect(page.getByText('2 selecionados')).toBeVisible();
  await expect
    .poll(() => new URL(page.url()).searchParams.get('servicos'))
    .toBe('1,2');

  const dashboardLink = page.getByRole('link', {
    name: 'Dashboard',
    exact: true,
  });
  await dashboardLink.click();
  await expect(page).toHaveURL(/\/\?periodo=7d&servicos=1%2C2$/);
  await expect(
    page
      .getByRole('article', { name: 'Billing API' })
      .getByRole('button', { name: 'Remover da comparação' }),
  ).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('link', { name: 'Ver comparação' }).click();
  await expect(page).toHaveURL(/\/comparar\?periodo=7d&servicos=1%2C2$/);
  await expect(
    page.getByRole('heading', { name: 'Indicadores por serviço' }),
  ).toBeVisible();

  if (testInfo.project.name === 'mobile') {
    await expect(
      page.getByRole('navigation', { name: 'Navegação inferior' }),
    ).toBeVisible();
  }
});

test('limita a seleção a cinco serviços', async ({ page }) => {
  await mockComparisonRoutes(page);
  await page.goto('/comparar');
  await expect(
    page.getByRole('heading', { name: 'Selecione ao menos dois serviços' }),
  ).toBeVisible();
  for (const service of services.slice(0, 5)) {
    const checkbox = page.getByRole('checkbox', {
      name: `Selecionar ${service.nome} para comparação`,
    });
    await checkbox.click();
    await expect(checkbox).toBeChecked();
  }
  const sixthService = page.getByRole('checkbox', {
    name: 'Selecionar Audit Service para comparação',
  });
  await sixthService.click();
  await expect(page.getByRole('alert')).toHaveText(
    'É possível comparar no máximo cinco serviços.',
  );
  await expect(sixthService).not.toBeChecked();
  expect(
    new URL(page.url()).searchParams.get('servicos')?.split(','),
  ).toHaveLength(5);
});

test('exibe serviços vazios e estados de carregamento e erro da API', async ({
  page,
}) => {
  let emptyServices = true;
  await page.route('**/api/servicos', (route) =>
    route.fulfill({ json: emptyServices ? [] : services.slice(0, 2) }),
  );
  await page.goto('/comparar');
  await expect(
    page.getByRole('heading', { name: 'Nenhum serviço disponível' }),
  ).toBeVisible();

  emptyServices = false;
  let releaseFirstResponse: (() => void) | undefined;
  const firstResponse = new Promise<void>((resolve) => {
    releaseFirstResponse = resolve;
  });
  let failFirstComparison = true;
  await page.route('**/api/comparacao**', async (route) => {
    if (failFirstComparison) {
      failFirstComparison = false;
      await firstResponse;
      await route.fulfill({
        status: 500,
        json: { message: 'Falha simulada na comparação.' },
      });
      return;
    }

    await route.fulfill({ json: comparisonResponse([1, 2]) });
  });

  await page.goto('/comparar?servicos=1,2');
  await expect(
    page.getByRole('heading', { name: 'Carregando comparação' }),
  ).toBeVisible();
  releaseFirstResponse?.();
  await expect(page.getByRole('alert')).toContainText(
    'Não foi possível consultar o backend (HTTP 500).',
  );
  await page.getByRole('button', { name: 'Tentar novamente' }).click();
  await expect(
    page.getByRole('heading', { name: 'Indicadores por serviço' }),
  ).toBeVisible();
});
