import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const TOKEN_KEY = '@greener-abp:token';

async function mockDashboardBase(page: Page) {
  await page.route('**/api/servicos', (route) => route.fulfill({ json: [] }));
  await page.route('**/api/configuracao', (route) =>
    route.fulfill({
      json: {
        intervaloColetaSegundos: 30,
        intervaloDescobertaSegundos: 60,
        metaMensalKgCo2e: 35,
        atualizadaEm: null,
        padrao: false,
      },
    }),
  );
  await page.route('**/api/indicadores/serie**', (route) =>
    route.fulfill({
      json: {
        periodo: {
          inicio: '2026-11-19T12:00:00.000Z',
          fim: '2026-11-20T12:00:00.000Z',
        },
        granularidade: 'hora',
        intervalos: ['2026-11-20T11:00:00.000Z'],
        global: [
          {
            inicio: '2026-11-20T11:00:00.000Z',
            energiaKwh: 0.01,
            emissaoGCo2e: 1.5,
          },
        ],
        servicos: [],
      },
    }),
  );
  await page.route('**/api/indicadores', (route) =>
    route.fulfill({
      json: {
        periodo: {
          inicio: '2026-11-19T12:00:00.000Z',
          fim: '2026-11-20T12:00:00.000Z',
        },
        energiaTotalKwh: 0.01,
        emissaoTotalGCo2e: 1.5,
        servicos: {
          disponiveis: 1,
          indisponiveis: 0,
          semMetricas: 0,
          removidos: 0,
        },
      },
    }),
  );
}

test('admin configura, valida e limpa a meta mensal em kgCO2e sem violações Axe', async ({
  page,
}) => {
  const config = {
    intervaloColetaSegundos: 30,
    intervaloDescobertaSegundos: 60,
    metaMensalKgCo2e: null as number | null,
    atualizadaEm: null as string | null,
    padrao: true,
  };
  const puts: unknown[] = [];

  await page.route('**/api/saude', (route) => route.fulfill({ status: 500 }));
  await page.route('**/api/configuracao', async (route) => {
    if (route.request().method() === 'PUT') {
      const body = route.request().postDataJSON();
      puts.push(body);
      Object.assign(config, body, {
        atualizadaEm: '2026-11-20T15:00:00.000Z',
        padrao: false,
      });
      return route.fulfill({ json: config });
    }
    return route.fulfill({ json: config });
  });

  await page.addInitScript(
    (key) => localStorage.setItem(key, 'token-salvo'),
    TOKEN_KEY,
  );
  await page.goto('/admin');

  const campoMeta = page.getByLabel('Meta mensal (kgCO₂e)');
  await expect(campoMeta).toHaveValue('');

  await campoMeta.fill('-10');
  await page.getByRole('button', { name: 'Salvar intervalos' }).click();
  await expect(
    page.getByText(/A meta mensal deve ser maior que zero/),
  ).toBeVisible();
  expect(puts).toEqual([]);

  await campoMeta.fill('500.5');
  await page.getByRole('button', { name: 'Salvar intervalos' }).click();
  await expect(page.getByRole('status')).toContainText('Intervalos salvos');
  expect(puts[0]).toEqual({
    intervaloColetaSegundos: 30,
    intervaloDescobertaSegundos: 60,
    metaMensalKgCo2e: 500.5,
  });

  const axeAdmin = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(axeAdmin.violations).toEqual([]);

  await campoMeta.fill('');
  await page.getByRole('button', { name: 'Salvar intervalos' }).click();
  await expect.poll(() => puts.length).toBe(2);
  expect(puts[1]).toEqual({
    intervaloColetaSegundos: 30,
    intervaloDescobertaSegundos: 60,
    metaMensalKgCo2e: null,
  });
});

test('dashboard exibe medidor, projeção e aviso quando ultrapassa a meta e passa no Axe em claro e escuro', async ({
  page,
}) => {
  await mockDashboardBase(page);
  await page.route('**/api/indicadores/meta', (route) =>
    route.fulfill({
      json: {
        metaMensal: 35,
        acumuladoMes: 24.5,
        diasDecorridos: 20,
        diasNoMes: 30,
        projecaoMes: 36.75,
      },
    }),
  );

  await page.goto('/');

  const painel = page.getByRole('region', { name: 'Projeção e meta do mês' });
  await expect(painel).toBeVisible();
  const medidor = painel.getByRole('meter', {
    name: 'Consumo mensal em relação à meta de carbono',
  });
  await expect(medidor).toHaveAttribute('aria-valuenow', '24.5');
  await expect(medidor).toHaveAttribute('aria-valuemax', '35');
  await expect(painel).toContainText('70,0% da meta');
  await expect(painel).toContainText('No ritmo atual: 36,75 kgCO₂e este mês');
  await expect(painel).toContainText(
    'Atenção: a projeção do mês ultrapassa a meta em 1,75 kgCO₂e.',
  );

  const axeLight = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(axeLight.violations).toEqual([]);

  await page.getByRole('button', { name: 'Modo escuro' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  const axeDark = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(axeDark.violations).toEqual([]);
});

test('dashboard sem meta mostra só a projeção e recupera de erro ao recarregar', async ({
  page,
}) => {
  await mockDashboardBase(page);
  let chamadas = 0;
  await page.route('**/api/indicadores/meta', (route) => {
    chamadas += 1;
    if (chamadas === 1) {
      return route.fulfill({ status: 500 });
    }
    return route.fulfill({
      json: {
        metaMensal: null,
        acumuladoMes: 10.5,
        diasDecorridos: 15,
        diasNoMes: 30,
        projecaoMes: 21,
      },
    });
  });

  await page.goto('/');

  const painel = page.getByRole('region', { name: 'Projeção e meta do mês' });
  await expect(painel).toContainText(
    'Não foi possível carregar a meta mensal.',
  );
  await painel.getByRole('button', { name: 'Recarregar a meta' }).click();

  await expect(painel).toContainText('No ritmo atual: 21,00 kgCO₂e este mês');
  await expect(painel.getByRole('meter')).toHaveCount(0);

  const axeSemMeta = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(axeSemMeta.violations).toEqual([]);
});
