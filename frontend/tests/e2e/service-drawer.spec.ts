import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { simulacaoDemo } from '../../src/mocks/simulacao';

async function mockDashboardWithServices(page: Page) {
  await page.route('**/api/servicos', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: 12,
          idExterno: 'billing-api',
          nome: 'Billing API',
          regiaoCodigo: 'br-sudeste',
          localizacao: {
            codigo: 'br-sudeste',
            pais: 'Brasil',
            regiao: 'Sudeste',
            cidade: 'São Paulo',
            latitude: -23.55,
            longitude: -46.63,
          },
          selo: 'A',
          estadoAtual: 'DISPONIVEL',
        },
        {
          id: 13,
          idExterno: 'payment-api',
          nome: 'Payment API',
          regiaoCodigo: 'eu-west',
          localizacao: null,
          selo: '—',
          estadoAtual: 'INDISPONIVEL',
        },
      ]),
    }),
  );

  await page.route('**/api/indicadores*', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        energiaTotalKwh: 3.75,
        emissaoTotalGCo2e: 2345,
        coletasCalculadas: 2,
        servicos: {
          monitorados: 2,
          disponiveis: 1,
          indisponiveis: 1,
          semMetricas: 0,
          desconhecidos: 0,
          removidos: 0,
        },
      }),
    }),
  );

  await page.route('**/api/configuracao', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ intervaloColetaSegundos: 30 }),
    }),
  );

  await page.route('**/api/coletas/servico/12/ultima-valida', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        fonte: 'BANCO',
        dados: {
          iniciadaEm: '2026-11-15T14:00:00.000Z',
          intervaloColetaSegundos: 45,
          cpuPercent: 47.5,
          memoryGb: 2.75,
          diskGb: 15,
          networkGb: 0.5,
          intensidadeCarbonoGCo2ePorKwh: 125.4,
          energiaKwh: '1.234567',
          emissaoGCo2e: '1234.567',
        },
      }),
    }),
  );

  await page.route('**/api/coletas/servico/13/ultima-valida', (route) =>
    route.fulfill({ status: 404 }),
  );

  await page.route('**/api/servicos/12/historico**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          inicio: '2026-11-15T13:00:00.000Z',
          energiaKwh: 1.2,
          emissaoGCo2e: 1200,
          selo: 'F',
        },
      ]),
    }),
  );
  await page.route('**/api/servicos/12/simulacao-regiao**', (route) =>
    route.fulfill({ json: simulacaoDemo(4) }),
  );
}

test('clique no card abre painel lateral com dados atuais, foco acessível, Esc e botão Ver histórico', async ({
  page,
}) => {
  await mockDashboardWithServices(page);
  await page.goto('/');

  const billingCard = page.getByRole('article', { name: 'Billing API' });
  await expect(billingCard).toBeVisible();

  const cardTrigger = billingCard.getByRole('button', {
    name: 'Billing API',
  });
  await billingCard.click();

  const drawer = page.getByRole('dialog', { name: 'Billing API' });
  await expect(drawer).toBeVisible();
  await expect(drawer).toBeFocused();

  await expect(drawer).toContainText('Ativo');
  await expect(drawer).toContainText('Brasil · Sudeste — São Paulo');
  await expect(drawer).toContainText('47,5 %');
  await expect(drawer).toContainText('2,75 GB');
  await expect(drawer).toContainText('15,00 GB');
  await expect(drawer).toContainText('Uso de rede (tráfego acumulado)');
  await expect(drawer).toContainText('0,50 GB');
  await expect(drawer).toContainText('125,4 gCO₂e/kWh');
  await expect(drawer).toContainText('Última coleta');
  await expect(drawer).toContainText('1,23 kWh');
  await expect(drawer).toContainText('1,23 kgCO₂e');
  await expect(drawer).not.toContainText('1.234,57 gCO₂e');
  await expect(drawer).toContainText('45 s');

  const axeLight = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(axeLight.violations).toEqual([]);

  await page.keyboard.press('Escape');
  await expect(drawer).toHaveCount(0);
  await expect(cardTrigger).toBeFocused();

  await cardTrigger.press('Enter');
  await expect(drawer).toBeVisible();

  await drawer.getByRole('link', { name: 'Ver histórico' }).click();
  await expect(page).toHaveURL(/\/servicos\/12$/);
  await expect(
    page.getByRole('heading', { level: 1, name: 'Billing API' }),
  ).toBeVisible();
});

test('painel lateral funciona no tema escuro sem violações do Axe', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => {
    localStorage.setItem('greener-theme', 'dark');
  });
  await mockDashboardWithServices(page);
  await page.goto('/');

  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.getByRole('article', { name: 'Billing API' }).click();

  const drawer = page.getByRole('dialog', { name: 'Billing API' });
  await expect(drawer).toBeVisible();

  const axeDark = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(axeDark.violations).toEqual([]);
});
