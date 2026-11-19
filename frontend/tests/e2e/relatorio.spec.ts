import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

function mockApiRelatorio(page: Page) {
  const consultas: string[] = [];

  return Promise.all([
    page.route('**/api/servicos', (route) => route.fulfill({ json: [] })),
    page.route('**/api/configuracao', (route) =>
      route.fulfill({ json: { intervaloColetaSegundos: 30 } }),
    ),
    page.route('**/api/indicadores/serie**', (route) => {
      consultas.push(route.request().url());
      return route.fulfill({
        json: {
          periodo: {
            inicio: '2026-11-12T03:00:00.000Z',
            fim: '2026-11-19T03:00:00.000Z',
          },
          granularidade: 'dia',
          intervalos: [
            '2026-11-12T03:00:00.000Z',
            '2026-11-13T03:00:00.000Z',
            '2026-11-14T03:00:00.000Z',
          ],
          global: [
            {
              inicio: '2026-11-12T03:00:00.000Z',
              energiaKwh: 3.1,
              emissaoGCo2e: 1200,
            },
            {
              inicio: '2026-11-13T03:00:00.000Z',
              energiaKwh: 4.5,
              emissaoGCo2e: 1840,
            },
            {
              inicio: '2026-11-14T03:00:00.000Z',
              energiaKwh: 4.8,
              emissaoGCo2e: 1844,
            },
          ],
          servicos: [],
        },
      });
    }),
    page.route('**/api/indicadores**', (route) => {
      if (route.request().url().includes('/indicadores/serie')) {
        return route.fallback();
      }
      consultas.push(route.request().url());
      return route.fulfill({
        json: {
          periodo: {
            inicio: '2026-11-12T03:00:00.000Z',
            fim: '2026-11-19T03:00:00.000Z',
          },
          energiaTotalKwh: 12.4,
          emissaoTotalGCo2e: 4884,
          coletasCalculadas: 120,
          servicos: {
            monitorados: 6,
            disponiveis: 5,
            indisponiveis: 1,
            semMetricas: 0,
            desconhecidos: 0,
            removidos: 0,
          },
          ultimaColetaEm: '2026-11-19T13:55:00.000Z',
          geradoEm: '2026-11-19T14:00:00.000Z',
        },
      });
    }),
    page.route('**/api/ranking**', (route) => {
      consultas.push(route.request().url());
      return route.fulfill({
        json: {
          periodo: {
            inicio: '2026-11-12T03:00:00.000Z',
            fim: '2026-11-19T03:00:00.000Z',
          },
          metrica: 'emissao',
          itens: [
            {
              posicao: 1,
              servicoId: 5,
              nome: 'Video Processor',
              energiaKwh: 6.1,
              emissaoGCo2e: 2500,
              coletasValidas: 40,
            },
            {
              posicao: 2,
              servicoId: 8,
              nome: 'Media CDN',
              energiaKwh: 3.1,
              emissaoGCo2e: 1300,
              coletasValidas: 35,
            },
            {
              posicao: 3,
              servicoId: 4,
              nome: 'Search API',
              energiaKwh: 1.8,
              emissaoGCo2e: 640,
              coletasValidas: 25,
            },
            {
              posicao: 4,
              servicoId: 1,
              nome: 'Auth Service',
              energiaKwh: 0.9,
              emissaoGCo2e: 280,
              coletasValidas: 12,
            },
            {
              posicao: 5,
              servicoId: 7,
              nome: 'Reports Engine',
              energiaKwh: 0.5,
              emissaoGCo2e: 164,
              coletasValidas: 8,
            },
          ],
          semDados: [],
        },
      });
    }),
  ]).then(() => consultas);
}

test('renderiza relatório completo, aciona impressão, oculta navegação em @media print e passa no Axe', async ({
  page,
}) => {
  await page.addInitScript(() => {
    (window as Window & { __printCalls?: number }).__printCalls = 0;
    window.print = () => {
      (window as Window & { __printCalls?: number }).__printCalls =
        ((window as Window & { __printCalls?: number }).__printCalls ?? 0) + 1;
    };
  });

  const consultas = await mockApiRelatorio(page);
  await page.goto('/?periodo=7d');

  await page.getByRole('link', { name: 'Relatório do período' }).click();
  await expect(page).toHaveURL(/\/relatorio\?periodo=7d$/);
  await expect(page).toHaveTitle('Relatório do período | GreenER');

  await expect(
    page.getByRole('heading', { level: 1, name: 'Relatório do período' }),
  ).toBeVisible();
  await expect(
    page.getByRole('region', { name: 'Identificação do período' }),
  ).toContainText('12/11/2026');

  const resumo = page.getByRole('region', { name: 'Resumo do período' });
  await expect(resumo).toContainText('12,40 kWh');
  await expect(resumo).toContainText('4,88 kgCO₂e');
  await expect(resumo).toContainText('km rodados de carro');
  await expect(resumo).toContainText('cargas de celular');
  await expect(resumo).toContainText('5 ativos · 1 indisponível');

  await expect(
    page.getByRole('region', { name: 'Tendência no período' }),
  ).toBeVisible();

  const tabela = page.getByRole('table', {
    name: 'Os 5 serviços que mais emitiram no período',
  });
  await expect(tabela.locator('tbody tr')).toHaveCount(5);
  await expect(tabela).toContainText('Video Processor');
  await expect(tabela).toContainText('Reports Engine');

  await expect(
    page.getByRole('region', { name: 'Nota de metodologia' }),
  ).toContainText('estimativas operacionais');

  const rodape = page.locator('footer[aria-label="Metadados do relatório"]');
  await expect(rodape).toContainText('19/11/2026, 11:00');
  await expect(rodape).toContainText(
    'Cálculo conforme a página Como calculamos',
  );

  expect(
    consultas.some((url) =>
      url.includes('/api/ranking?periodo=7d&metrica=emissao&limite=5'),
    ),
  ).toBe(true);
  expect(consultas.some((url) => url.includes('/api/oportunidades'))).toBe(
    false,
  );

  const axeResult = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(axeResult.violations).toEqual([]);

  await page.getByRole('button', { name: 'Imprimir / salvar PDF' }).click();
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as Window & { __printCalls?: number }).__printCalls ?? 0,
      ),
    )
    .toBe(1);

  await page.emulateMedia({ media: 'print' });
  await expect(page.locator('.site-header')).not.toBeVisible();
  await expect(page.locator('.bottom-nav')).not.toBeVisible();
  await expect(page.locator('.site-footer')).not.toBeVisible();
  await expect(page.locator('.period-selector')).not.toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Imprimir / salvar PDF' }),
  ).not.toBeVisible();

  await expect(
    page.getByRole('heading', { level: 1, name: 'Relatório do período' }),
  ).toBeVisible();
  await expect(rodape).toBeVisible();
});

test('funciona no modo ?demo=1 sem chamar a API e sem rolagem horizontal', async ({
  page,
}) => {
  const apiRequests: string[] = [];
  page.on('request', (request) => {
    if (request.url().includes('/api/')) {
      apiRequests.push(request.url());
    }
  });

  await page.goto('/relatorio?demo=1');
  await expect(page).toHaveTitle(
    'Relatório do período · demonstração | GreenER',
  );
  await expect(
    page.getByRole('region', { name: 'Identificação do período' }),
  ).toContainText('Modo demonstração');
  await expect(
    page
      .getByRole('table', {
        name: 'Os 5 serviços que mais emitiram no período',
      })
      .locator('tbody tr'),
  ).toHaveCount(5);
  expect(apiRequests).toEqual([]);

  const axeDemo = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(axeDemo.violations).toEqual([]);

  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
