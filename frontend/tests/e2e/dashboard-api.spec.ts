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
          energiaKwh: '1.234567',
          emissaoGCo2e: '1234.567',
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
  await expect(table).toContainText('Brasil (Sudeste)');
  await expect(page.getByLabel('Indicadores gerais')).toContainText('1');
  await expect(table).toContainText('1,2346 kWh');
  await expect(table).toContainText('1,2346 kgCO₂e');
});

test('dashboard atualiza dados após 30 segundos sem recarregar a página', async ({
  page,
}) => {
  let servicesRequests = 0;
  let documentLoads = 0;
  page.on('load', () => {
    documentLoads += 1;
  });

  await page.clock.install();
  await page.route('**/api/servicos', (route) => {
    servicesRequests += 1;
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: 12,
          idExterno: 'billing-api',
          nome:
            servicesRequests === 1 ? 'Estado inicial' : 'Atualização periódica',
          regiaoCodigo: 'br-sudeste',
          estadoAtual: 'DISPONIVEL',
        },
      ]),
    });
  });
  await page.route('**/api/coletas/servico/12/ultima-valida', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        dados: {
          iniciadaEm: '2026-10-12T23:10:30.000Z',
          cpuPercent: 47.5,
          memoryGb: 2.75,
          diskGb: 15,
          networkGb: 0.5,
          energiaKwh: '1.234567',
          emissaoGCo2e: '1234.567',
        },
      }),
    }),
  );

  await page.goto('/');
  const table = page.getByRole('table', {
    name: 'Serviços e sua coleta válida mais recente.',
  });
  await expect(table).toContainText('Estado inicial');
  expect(servicesRequests).toBe(1);
  expect(documentLoads).toBe(1);

  await page.clock.fastForward(29_999);
  expect(servicesRequests).toBe(1);

  await page.clock.fastForward(1);
  await expect(table).toContainText('Atualização periódica');
  expect(servicesRequests).toBe(2);
  expect(documentLoads).toBe(1);
});
