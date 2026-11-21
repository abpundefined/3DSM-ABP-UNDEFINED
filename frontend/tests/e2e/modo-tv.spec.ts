import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mapaDemo } from '../../src/mocks/mapa';
import { rankingDemo } from '../../src/mocks/ranking';

async function mockApiParaModoTv(page: Page) {
  await page.route('**/api/servicos', (route) => route.fulfill({ json: [] }));
  await page.route('**/api/configuracao', (route) =>
    route.fulfill({ json: { intervaloColetaSegundos: 60 } }),
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
  await page.route('**/api/indicadores**', (route) =>
    route.fulfill({
      json: {
        energiaTotalKwh: 2,
        emissaoTotalGCo2e: 800,
        servicos: {
          disponiveis: 2,
          indisponiveis: 0,
          semMetricas: 0,
          removidos: 0,
        },
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

test('modo TV esconde menu, exibe barra na parte de baixo, alterna telas a cada 10 s preservando período e sai com Esc ou clique', async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, 'Modo TV disponível apenas em telas desktop.');
  await page.clock.install();
  await mockApiParaModoTv(page);

  await page.goto('/?periodo=7d&tv=1');

  // Menu principal e rodapé ficam ocultos no modo TV
  await expect(
    page.getByRole('navigation', { name: 'Navegação principal' }),
  ).toHaveCount(0);
  await expect(page.getByRole('contentinfo')).toHaveCount(0);
  const barraTv = page.getByLabel('Status do modo TV');
  await expect(barraTv).toContainText(/Próxima tela:\s*Mapa/i);

  // Barra do contador fica na parte de baixo da tela
  const caixaBarra = await barraTv.boundingBox();
  const alturaViewport = page.viewportSize()?.height ?? 720;
  expect(caixaBarra).not.toBeNull();
  expect(caixaBarra!.y).toBeGreaterThan(alturaViewport / 2);

  // Avança 10 s -> Mapa preservando periodo=7d e tv=1, com globo em destaque e controles ocultos
  await page.clock.fastForward(10_000);
  await expect(page).toHaveURL(/\/mapa\?periodo=7d&tv=1$/);
  await expect(barraTv).toContainText(/Próxima tela:\s*Ranking/i);
  await expect(page.locator('.globo')).toBeVisible();
  await expect(page.locator('.mapa-barra')).toBeHidden();
  await expect(page.locator('.linha-do-tempo')).toBeHidden();

  // Avança mais 10 s -> Ranking preservando periodo=7d e tv=1
  await page.clock.fastForward(10_000);
  await expect(page).toHaveURL(/\/ranking\?periodo=7d&tv=1$/);
  await expect(barraTv).toContainText(/Próxima tela:\s*Dashboard/i);

  // Avança mais 10 s -> retorna ao Dashboard
  await page.clock.fastForward(10_000);
  await expect(page).toHaveURL(/\/\?periodo=7d&tv=1$/);

  // Esc sai do modo TV preservando periodo=7d e restaurando o menu
  await page.keyboard.press('Escape');
  await expect(page).toHaveURL(/\/\?periodo=7d$/);
  await expect(
    page.getByRole('navigation', { name: 'Navegação principal' }),
  ).toBeVisible();

  // Botão "Modo TV" no rodapé ativa o modo TV preservando o período
  await page.getByRole('button', { name: 'Modo TV' }).click();
  await expect(page).toHaveURL(/\/\?periodo=7d&tv=1$/);
  await expect(barraTv).toBeVisible();

  // Clique também sai do modo TV
  await page.locator('.main-content').click({ position: { x: 20, y: 20 } });
  await expect(page).toHaveURL(/\/\?periodo=7d$/);
  await expect(
    page.getByRole('navigation', { name: 'Navegação principal' }),
  ).toBeVisible();
});

test('versão mobile não exibe botão de modo TV nem ativa layout de TV', async ({
  page,
  isMobile,
}) => {
  test.skip(!isMobile, 'Validação específica da versão mobile.');
  await mockApiParaModoTv(page);

  await page.goto('/?periodo=7d');
  await expect(page.getByRole('button', { name: 'Modo TV' })).toHaveCount(0);

  await page.goto('/?periodo=7d&tv=1');
  await expect(page.getByLabel('Status do modo TV')).toHaveCount(0);
  await expect(
    page.getByRole('navigation', { name: 'Navegação inferior' }),
  ).toBeVisible();
});

for (const theme of ['light', 'dark']) {
  test(`modo TV sem violações do Axe no tema ${theme}`, async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, 'Modo TV disponível apenas em telas desktop.');
    await page.addInitScript((value) => {
      localStorage.setItem('greener-theme', value);
    }, theme);
    await page.goto('/?demo=1&tv=1');
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
    await expect(page.getByLabel('Status do modo TV')).toBeVisible();

    const result = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    expect(result.violations).toEqual([]);
  });
}
