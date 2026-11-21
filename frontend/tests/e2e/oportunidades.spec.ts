import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mapaDemo } from '../../src/mocks/mapa';
import { oportunidadesDemo } from '../../src/mocks/oportunidades';
import { rankingDemo } from '../../src/mocks/ranking';

async function mockApiOportunidades(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem('greener-tour-visto', '1');
  });

  await page.route('**/api/servicos', (route) => route.fulfill({ json: [] }));
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
          semMetricas: 0,
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
  await page.route('**/api/oportunidades**', (route) =>
    route.fulfill({ json: oportunidadesDemo }),
  );
  await page.route('**/api/mapa**', (route) =>
    route.fulfill({ json: mapaDemo }),
  );
  await page.route('**/api/ranking**', (route) =>
    route.fulfill({ json: rankingDemo('energia') }),
  );
}

test('dashboard mostra Redução potencial no período, 4 maiores oportunidades e leva para /oportunidades', async ({
  page,
}) => {
  await mockApiOportunidades(page);
  await page.goto('/?periodo=7d');

  const painel = page.getByRole('region', {
    name: 'Oportunidades de redução de emissão',
  });
  await expect(painel).toBeVisible();
  await expect(painel).toContainText('Redução potencial no período');
  await expect(painel).toContainText('28,45 gCO₂e');
  await expect(painel).toContainText('não representam garantia de economia');
  await expect(painel.getByRole('article')).toHaveCount(4);

  await painel.getByRole('link', { name: /Ver todas/i }).click();
  await expect(page).toHaveURL(/\/oportunidades\?periodo=7d$/);
  await expect(
    page.getByRole('heading', { name: 'Oportunidades de redução' }),
  ).toBeVisible();
  await expect(page.getByRole('article')).toHaveCount(5);

  // Filtra por tipo
  await page.getByRole('button', { name: /Migrar de região \(2\)/i }).click();
  await expect(page.getByRole('article')).toHaveCount(2);

  await page
    .getByRole('button', { name: /Superdimensionamento \(1\)/i })
    .click();
  await expect(page.getByRole('article')).toHaveCount(1);
  await expect(
    page.getByRole('link', { name: /Ver detalhe de Search API/i }),
  ).toHaveAttribute('href', '/servicos/4?periodo=7d');
});

test('falha das oportunidades no dashboard fica só no painel, sem novo alerta e com recarga própria', async ({
  page,
}) => {
  await mockApiOportunidades(page);
  let falhar = true;
  await page.route('**/api/oportunidades**', (route) =>
    falhar
      ? route.fulfill({
          status: 500,
          json: { statusCode: 500, message: 'Erro interno' },
        })
      : route.fulfill({ json: oportunidadesDemo }),
  );
  await page.goto('/?periodo=7d');

  const painel = page.getByRole('region', {
    name: 'Oportunidades de redução de emissão',
  });
  await expect(painel).toContainText(
    'Não foi possível carregar as oportunidades.',
  );
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: 'Tentar novamente' }),
  ).toHaveCount(0);

  falhar = false;
  await painel
    .getByRole('button', { name: 'Recarregar as oportunidades' })
    .click();
  await expect(painel.getByRole('article')).toHaveCount(4);
});

test('página /oportunidades e seção em /metodologia passam no Axe em claro/escuro e sem rolagem em 375 px', async ({
  page,
}) => {
  await page.goto('/oportunidades?demo=1');
  await expect(
    page.getByRole('heading', { name: 'Oportunidades de redução' }),
  ).toBeVisible();
  await expect(page.getByRole('article')).toHaveCount(5);

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

  await page.goto('/metodologia?demo=1');
  await expect(
    page.getByRole('heading', {
      name: /Oportunidades de redução de emissão/i,
    }),
  ).toBeVisible();
  await expect(page.getByText(/abaixo de 15%/i)).toBeVisible();
});
