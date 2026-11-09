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
          localizacao: {
            codigo: 'br-sudeste',
            pais: 'Brasil',
            regiao: 'Sudeste',
            cidade: 'São Paulo',
            latitude: -23.55,
            longitude: -46.63,
          },
          estadoAtual: 'DISPONIVEL',
        },
        {
          id: 13,
          idExterno: 'payment-api',
          nome: 'Payment API',
          regiaoCodigo: 'eu-west',
          localizacao: {
            codigo: 'eu-west',
            pais: 'Irlanda',
            regiao: 'Leinster',
            cidade: null,
            latitude: null,
            longitude: null,
          },
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

  const cards = page.getByRole('list', {
    name: 'Cards dos serviços monitorados',
  });
  await expect(cards.getByRole('listitem')).toHaveCount(2);

  const billing = cards.getByRole('article', { name: 'Billing API' });
  await expect(billing).toContainText('Ativo');
  await expect(billing).toContainText('Brasil · Sudeste');
  await expect(billing).toContainText('São Paulo');
  await expect(billing).toContainText('47,5 %');
  await expect(billing).toContainText('2,75 GB');
  await expect(billing).toContainText('15,00 GB');
  await expect(billing).toContainText('0,50 GB');
  await expect(billing).toContainText('1,2346 kWh');
  await expect(billing).toContainText('1,2346 kgCO₂e');

  const payment = cards.getByRole('article', { name: 'Payment API' });
  await expect(payment).toContainText('Indisponível');
  await expect(payment).toContainText('Irlanda · Leinster');
  await expect(payment).toContainText('Cidade não informada');
  await expect(payment.getByText('—', { exact: true })).toHaveCount(6);
  const indicators = page.getByLabel('Indicadores gerais');
  await expect(indicators).toContainText('3,7500');
  await expect(indicators).toContainText('2,3450');
  await expect(indicators.getByText('Serviços ativos')).toBeVisible();
  await expect(indicators.getByText('Serviços indisponíveis')).toBeVisible();
  await expect(indicators.getByText('1', { exact: true })).toHaveCount(2);
  await expect(indicators).toContainText('1 sem métricas · 0 removidos');
});

test('falha nos indicadores não impede os cards e recuperação na atualização', async ({
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
    page.getByRole('article', { name: 'Billing API' }),
  ).toContainText('Brasil (Sudeste)');

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

test('os cards não esperam a resposta lenta dos indicadores', async ({
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

test('serviço sem localização usa o código da região e não quebra o card', async ({
  page,
}) => {
  await page.route('**/api/servicos', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: 20,
          idExterno: 'legacy-api',
          nome: 'Legacy API',
          regiaoCodigo: 'jp-east',
          localizacao: null,
          estadoAtual: 'SEM_METRICAS',
        },
      ]),
    }),
  );
  await page.route('**/api/indicadores', (route) =>
    route.fulfill({ status: 500 }),
  );
  await page.route('**/api/coletas/servico/20/ultima-valida', (route) =>
    route.fulfill({ status: 404 }),
  );
  await page.goto('/');

  const card = page.getByRole('article', { name: 'Legacy API' });
  await expect(card).toContainText('Sem métricas');
  await expect(card).toContainText('Japão (Tóquio)');
  await expect(card).toContainText('Cidade não informada');
});
