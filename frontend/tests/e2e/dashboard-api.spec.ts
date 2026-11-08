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
        {
          id: 13,
          idExterno: 'payment-api',
          nome: 'Payment API',
          regiaoCodigo: 'br-sudeste',
          estadoAtual: 'INDISPONIVEL',
        },
      ]),
    }),
  );
  await page.route('**/api/indicadores', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        energiaTotalKwh: 3.75,
        emissaoTotalGCo2e: 2345,
        coletasCalculadas: 2,
        servicos: {
          monitorados: 3,
          disponiveis: 1,
          indisponiveis: 1,
          semMetricas: 1,
          desconhecidos: 0,
          removidos: 0,
        },
        periodo: {
          inicio: '2026-10-11T23:10:30.000Z',
          fim: '2026-10-12T23:10:30.000Z',
        },
        ultimaColetaEm: '2026-10-12T23:10:30.000Z',
        geradoEm: '2026-10-12T23:10:30.000Z',
      }),
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
  await page.route('**/api/coletas/servico/13/ultima-valida', (route) =>
    route.fulfill({
      status: 404,
      contentType: 'application/json',
      body: JSON.stringify({ statusCode: 404 }),
    }),
  );

  await page.goto('/');

  const table = page.getByRole('table', {
    name: 'Serviços e sua coleta válida mais recente.',
  });
  await expect(table).toContainText('Billing API');
  await expect(table).toContainText('Ativo');
  await expect(table).toContainText('Payment API');
  await expect(table).toContainText('Indisponível');
  await expect(table).toContainText('47,5 %');
  await expect(table).toContainText('2,75 GB');
  await expect(table).toContainText('Brasil (Sudeste)');
  const indicators = page.getByLabel('Indicadores gerais');
  await expect(indicators).toContainText('3,7500');
  await expect(indicators).toContainText('2,3450');
  await expect(indicators.getByText('Serviços ativos')).toBeVisible();
  await expect(indicators.getByText('Serviços indisponíveis')).toBeVisible();
  await expect(indicators.getByText('1', { exact: true })).toHaveCount(2);
  await expect(indicators).toContainText('1 sem métricas · 0 removidos');
  await expect(table).toContainText('1,2346 kWh');
  await expect(table).toContainText('1,2346 kgCO₂e');
});

test('falha nos indicadores não impede tabela e recuperação na atualização', async ({
  page,
}) => {
  let indicatorsFail = true;
  await page.route('**/api/indicadores', (route) =>
    indicatorsFail
      ? route.fulfill({ status: 500, body: 'Erro' })
      : route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            energiaTotalKwh: 2,
            emissaoTotalGCo2e: 100,
            servicos: {
              disponiveis: 1,
              indisponiveis: 0,
              semMetricas: 2,
              removidos: 3,
            },
          }),
        }),
  );
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
    route.fulfill({ status: 404 }),
  );
  await page.goto('/');

  const indicators = page.getByLabel('Indicadores gerais');
  await expect(page.getByRole('alert')).toContainText(
    'Não foi possível carregar os indicadores',
  );
  await expect(indicators.getByText('—', { exact: true })).toHaveCount(4);
  await expect(
    page.getByRole('table', {
      name: 'Serviços e sua coleta válida mais recente.',
    }),
  ).toContainText('Billing API');

  indicatorsFail = false;
  await page.getByRole('button', { name: 'Atualizar agora' }).click();
  await expect(indicators).toContainText('2,0000');
  await expect(indicators).toContainText('2 sem métricas · 3 removidos');
  await expect(page.getByRole('alert')).toHaveCount(0);

  indicatorsFail = true;
  await page.getByRole('button', { name: 'Atualizar agora' }).click();
  await expect(page.getByRole('alert')).toContainText(
    'Não foi possível carregar os indicadores',
  );
  await expect(indicators.getByText('—', { exact: true })).toHaveCount(4);
  await expect(page.getByText('Billing API')).toBeVisible();
});

test('indicadores continuam disponíveis quando a consulta de serviços falha', async ({
  page,
}) => {
  await page.route('**/api/servicos', (route) =>
    route.fulfill({ status: 500 }),
  );
  await page.route('**/api/indicadores', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        energiaTotalKwh: 5,
        emissaoTotalGCo2e: 1000,
        servicos: {
          disponiveis: 2,
          indisponiveis: 1,
          semMetricas: 0,
          removidos: 4,
        },
      }),
    }),
  );
  await page.goto('/');
  await expect(page.getByLabel('Indicadores gerais')).toContainText('5,0000');
  await expect(page.getByLabel('Indicadores gerais')).toContainText(
    '0 sem métricas · 4 removidos',
  );
  await expect(
    page.getByRole('heading', { name: 'Não foi possível carregar os dados' }),
  ).toBeVisible();
});

test('a tabela não espera a resposta lenta dos indicadores', async ({
  page,
}) => {
  let releaseIndicators!: () => void;
  const pendingIndicators = new Promise<void>((resolve) => {
    releaseIndicators = resolve;
  });
  await page.route('**/api/indicadores', async (route) => {
    await pendingIndicators;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        energiaTotalKwh: 0,
        emissaoTotalGCo2e: 0,
        servicos: {
          disponiveis: 0,
          indisponiveis: 0,
          semMetricas: 0,
          removidos: 0,
        },
      }),
    });
  });
  await page.route('**/api/servicos', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }),
  );
  try {
    await page.goto('/');
    await expect(
      page.getByRole('heading', { name: 'Nenhum serviço encontrado' }),
    ).toBeVisible();
    await expect(
      page.getByLabel('Indicadores gerais').getByText('—', { exact: true }),
    ).toHaveCount(4);
  } finally {
    releaseIndicators();
  }
  await expect(page.getByLabel('Indicadores gerais')).toContainText('0,0000');
});

test('resposta inválida dos indicadores é sinalizada sem ocultar os serviços', async ({
  page,
}) => {
  await page.route('**/api/servicos', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }),
  );
  await page.route('**/api/indicadores', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        energiaTotalKwh: 5,
        emissaoTotalGCo2e: 1000,
        servicos: { disponiveis: 2, indisponiveis: 1 },
      }),
    }),
  );
  await page.goto('/');
  await expect(page.getByRole('alert')).toContainText(
    'Não foi possível carregar os indicadores',
  );
  await expect(
    page.getByRole('heading', { name: 'Nenhum serviço encontrado' }),
  ).toBeVisible();
  await expect(
    page.getByLabel('Indicadores gerais').getByText('—', { exact: true }),
  ).toHaveCount(4);
});
