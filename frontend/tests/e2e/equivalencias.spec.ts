import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('exibe equivalências de CO₂e no dashboard e na página de detalhe sem violações Axe', async ({
  page,
}) => {
  await page.route('**/api/servicos', (route) =>
    route.fulfill({
      json: [
        {
          id: 4,
          idExterno: 'search-api',
          nome: 'Search API',
          regiaoCodigo: 'us-east',
          localizacao: null,
          estadoAtual: 'DISPONIVEL',
        },
      ],
    }),
  );
  await page.route('**/api/indicadores*', (route) =>
    route.fulfill({
      json: {
        energiaTotalKwh: 2.5,
        emissaoTotalGCo2e: 2442,
        coletasCalculadas: 4,
        servicos: {
          monitorados: 1,
          disponiveis: 1,
          indisponiveis: 0,
          semMetricas: 0,
          desconhecidos: 0,
          removidos: 0,
        },
      },
    }),
  );
  await page.route('**/api/configuracao', (route) =>
    route.fulfill({ json: { intervaloColetaSegundos: 30 } }),
  );
  await page.route('**/api/coletas/servico/4/ultima-valida', (route) =>
    route.fulfill({ status: 404 }),
  );
  await page.route('**/api/servicos/4/historico**', (route) =>
    route.fulfill({
      json: [
        {
          inicio: '2026-11-15T14:00:00.000Z',
          energiaKwh: 2.0,
          emissaoGCo2e: 2000,
        },
      ],
    }),
  );
  await page.route('**/api/servicos/4/simulacao-regiao**', (route) =>
    route.fulfill({ json: { servicoId: 4, atual: null, regioes: [] } }),
  );

  await page.goto('/');
  const eqDashboard = page.getByRole('list', {
    name: 'Equivalências aproximadas de CO₂e',
  });
  await expect(eqDashboard).toContainText('≈');
  await expect(eqDashboard).toContainText('km rodados de carro');
  await expect(eqDashboard).toContainText('cargas de celular');

  await page.goto('/servicos/4');
  const eqDetail = page.getByRole('list', {
    name: 'Equivalências aproximadas de CO₂e',
  });
  await expect(eqDetail).toContainText('≈');
  await expect(eqDetail).toContainText('km rodados de carro');
  await expect(eqDetail).toContainText('cargas de celular');

  const axeResult = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(axeResult.violations).toEqual([]);
});

test('exibe equivalências aproximadas no modo demonstração', async ({
  page,
}) => {
  await page.goto('/?demo=1');
  const eqDemo = page.getByRole('list', {
    name: 'Equivalências aproximadas de CO₂e',
  });
  await expect(eqDemo).toContainText('≈');
  await expect(eqDemo).toContainText('km rodados de carro');
  await expect(eqDemo).toContainText('cargas de celular');
});
