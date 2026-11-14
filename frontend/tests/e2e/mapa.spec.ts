import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mapaDemo } from '../../src/mocks/mapa';

async function bloquearTiles(page: Page) {
  await page.route('https://tile.openstreetmap.org/**', (route) =>
    route.abort(),
  );
}

async function simularMapa(page: Page) {
  const chamadas: string[] = [];
  await page.route('**/api/mapa**', (route) => {
    chamadas.push(route.request().url());
    return route.fulfill({ json: mapaDemo });
  });
  return chamadas;
}

test.beforeEach(async ({ page }) => {
  await bloquearTiles(page);
});

test('mostra os serviços com marcadores e agrupa os que estão próximos', async ({
  page,
}) => {
  await simularMapa(page);
  await page.goto('/mapa');

  await expect(
    page.getByText('8 de 10 serviços com localização no mapa'),
  ).toBeVisible();
  await expect(page.locator('.mapa-grupo').first()).toBeVisible();

  await expect
    .poll(async () => {
      const grupos = await page.locator('.mapa-grupo').allInnerTexts();
      const soltos = await page.locator('path.mapa-marcador').count();
      return grupos.reduce((soma, texto) => soma + Number(texto), soltos);
    })
    .toBe(8);
  await expect(page.getByText('© OpenStreetMap')).toBeVisible();
});

test('popup mostra os dados do serviço e leva ao detalhe', async ({ page }) => {
  await simularMapa(page);
  await page.goto('/mapa?periodo=7d');

  await page
    .locator('path.mapa-marcador:not(.mapa-marcador--sem-dados)')
    .click({ force: true });
  const popup = page.locator('.leaflet-popup-content');
  await expect(popup).toContainText('Media CDN');
  await expect(popup).toContainText('Japão · Tóquio');
  await expect(popup).toContainText('Disponível');
  await expect(popup).toContainText('kWh');
  await expect(popup).toContainText('gCO₂e');

  await popup.getByRole('link', { name: 'Ver detalhes' }).press('Enter');
  await expect(page).toHaveURL(/\/servicos\/8\?periodo=7d$/);
});

test('consulta a API com o período selecionado', async ({ page }) => {
  const chamadas = await simularMapa(page);
  await page.goto('/mapa?periodo=30d');

  await expect(page.locator('.mapa-grupo').first()).toBeVisible();
  expect(chamadas.at(-1)).toMatch(/\/api\/mapa\?periodo=30d$/);
});

test('mostra o erro e permite tentar de novo', async ({ page }) => {
  let falhar = true;
  await page.route('**/api/mapa**', (route) =>
    falhar
      ? route.fulfill({ status: 502, body: '' })
      : route.fulfill({ json: mapaDemo }),
  );
  await page.goto('/mapa');

  const alerta = page.getByRole('alert');
  await expect(alerta).toContainText('Não foi possível carregar o mapa');
  await expect(alerta).toContainText('HTTP 502');

  falhar = false;
  await page.getByRole('button', { name: 'Tentar novamente' }).click();
  await expect(page.locator('.mapa-grupo').first()).toBeVisible();
});

test('recusa resposta em formato inválido', async ({ page }) => {
  await page.route('**/api/mapa**', (route) =>
    route.fulfill({ json: { servicos: 'x' } }),
  );
  await page.goto('/mapa');

  await expect(page.getByRole('alert')).toContainText('formato inválido');
});

test('mostra estado vazio quando não há serviços', async ({ page }) => {
  await page.route('**/api/mapa**', (route) =>
    route.fulfill({ json: { ...mapaDemo, servicos: [], semCoordenadas: [] } }),
  );
  await page.goto('/mapa');

  await expect(page.getByText('Nenhum serviço monitorado')).toBeVisible();
});

test('modo demonstração usa dados locais sem chamar a API', async ({
  page,
}) => {
  const chamadas = await simularMapa(page);
  await page.goto('/mapa?demo=1');

  await expect(page).toHaveTitle('Mapa de emissões · demonstração | GreenER');
  await expect(page.locator('.mapa-grupo').first()).toBeVisible();
  await expect(page.getByLabel('Período')).toHaveCount(0);
  expect(chamadas).toEqual([]);
});

test('mapa carregado não tem violações do Axe', async ({ page }) => {
  await simularMapa(page);
  await page.goto('/mapa');
  await expect(page.locator('.mapa-grupo').first()).toBeVisible();

  const resultado = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(resultado.violations).toEqual([]);
});
