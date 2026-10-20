import { test, expect } from '@playwright/test';

test('dashboard consulta o backend e exibe serviços e última coleta', async ({
  page,
}) => {
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
          estadoAtual: 'DISPONIVEL',
        },
      ]),
    }),
  );
  await page.route('**/api/coletas/servico/12/ultima-valida', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        fonte: 'BANCO',
        dados: {
          iniciadaEm: '2026-10-12T23:10:30.000Z',
          cpuPercent: 47.5,
          memoryGb: 2.75,
          diskGb: 15,
          networkGb: 0.5,
          energiaKwh: null,
          emissaoGCo2e: null,
        },
      }),
    }),
  );

  await page.goto('/');

  const table = page.getByRole('table', {
    name: 'Serviços e sua coleta válida mais recente.',
  });
  await expect(table).toContainText('Billing API');
  await expect(table).toContainText('Ativo');
  await expect(table).toContainText('47,5 %');
  await expect(table).toContainText('2,75 GB');
  await expect(table).toContainText('br-sudeste');
  await expect(page.getByLabel('Indicadores gerais')).toContainText('1');
  await expect(page.getByLabel('Indicadores gerais')).toContainText(
    'O backend ainda não calcula consumo energético.',
  );
});
