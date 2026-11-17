import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

function telemetry() {
  return {
    energiaTotalKwh: 0.0000123,
    emissaoTotalGCo2e: 0.0123,
    servicos: {
      disponiveis: 1,
      indisponiveis: 0,
      semMetricas: 0,
      removidos: 0,
    },
  };
}

async function dashboardApi(page: Page) {
  const state = {
    servicesFail: false,
    indicatorsFail: false,
    configurationFail: false,
    collectionFail: false,
    indicators: telemetry(),
  };
  await page.route('**/api/servicos', (route) =>
    route.fulfill({
      status: state.servicesFail ? 503 : 200,
      json: [
        {
          id: 12,
          idExterno: 'billing-api',
          nome: 'Billing API',
          regiaoCodigo: 'br-sudeste',
          estadoAtual: 'DISPONIVEL',
        },
      ],
    }),
  );
  await page.route('**/api/indicadores*', (route) =>
    route.fulfill({
      status: state.indicatorsFail ? 503 : 200,
      json: state.indicators,
    }),
  );
  await page.route('**/api/configuracao', (route) =>
    route.fulfill({
      status: state.configurationFail ? 503 : 200,
      json: { intervaloColetaSegundos: 30 },
    }),
  );
  await page.route('**/api/coletas/servico/12/ultima-valida', (route) =>
    route.fulfill({
      status: state.collectionFail ? 500 : 200,
      json: {
        dados: {
          iniciadaEm: '2026-11-15T14:00:00.000Z',
          cpuPercent: 47.5,
          memoryGb: 2.75,
          energiaKwh: 0.0000123,
          emissaoGCo2e: 0.0123,
        },
      },
    }),
  );
  return state;
}

async function refresh(page: Page) {
  const button = page.getByRole('button', { name: 'Atualizar agora' });
  await expect(button).toBeEnabled();
  await button.click();
  await expect(button).toBeEnabled();
}

test('indica conexão real e compartilha pequenas unidades com cards e painel lateral', async ({
  page,
}) => {
  await dashboardApi(page);
  await page.goto('/');
  await expect(
    page.getByText('Dados conectados ao backend', { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('alert')).toHaveCount(0);
  const values = page.getByLabel('Indicadores gerais').locator('.metric-value');
  await expect(values.nth(0)).toHaveText('0,01 Wh');
  await expect(values.nth(1)).toHaveText('0,01 gCO₂e');
  const card = page.getByRole('article', { name: 'Billing API' });
  await expect(card).toContainText('0,01 Wh');
  await expect(card).toContainText('0,01 gCO₂e');
  await card.getByRole('button', { name: 'Billing API' }).click();
  const drawer = page.getByRole('dialog', { name: 'Billing API' });
  await expect(drawer).toBeFocused();
  await expect(drawer).toContainText('0,01 Wh');
  await expect(drawer).toContainText('0,01 gCO₂e');
  await expect(
    drawer.getByRole('heading', { name: 'Última coleta', exact: true }),
  ).toBeVisible();
  await expect(drawer.getByText('0,01 gCO₂e', { exact: true })).toHaveCount(1);
  await page.keyboard.press('Escape');
  await expect(card.getByRole('button', { name: 'Billing API' })).toBeFocused();
});

test('primeiro acesso sem backend não promete dados anteriores e permite tentar novamente', async ({
  page,
}) => {
  const state = await dashboardApi(page);
  state.servicesFail = state.indicatorsFail = state.configurationFail = true;
  await page.goto('/');
  const alert = page.getByRole('alert');
  await expect(alert).toHaveCount(1);
  await expect(alert).toContainText(
    'Backend indisponível — ainda não há dados válidos',
  );
  await expect(alert).not.toContainText('exibindo os últimos');
  await expect(
    page.getByRole('button', { name: 'Tentar novamente' }),
  ).toBeVisible();
  await expect(
    page.getByLabel('Indicadores gerais').getByText('—', { exact: true }),
  ).toHaveCount(4);
  state.servicesFail = state.indicatorsFail = state.configurationFail = false;
  await page.getByRole('button', { name: 'Tentar novamente' }).click();
  await expect(
    page.getByText('Dados conectados ao backend', { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expect(
    page.getByRole('article', { name: 'Billing API' }),
  ).toBeVisible();
});

test('falha após carga preserva indicadores e serviços e recupera no polling automático', async ({
  page,
}) => {
  await page.clock.install();
  const state = await dashboardApi(page);
  await page.goto('/');
  await expect(
    page.getByText('Dados conectados ao backend', { exact: true }),
  ).toBeVisible();
  state.servicesFail = state.indicatorsFail = state.configurationFail = true;
  await refresh(page);
  const alert = page.getByRole('alert');
  await expect(alert).toHaveCount(1);
  await expect(alert).toContainText(
    'Backend indisponível — exibindo os últimos dados válidos',
  );
  await expect(alert).not.toContainText('HTTP');
  await expect(page.getByLabel('Indicadores gerais')).toContainText(
    'Últimos dados válidos',
  );
  await expect(
    page.getByLabel('Indicadores gerais').locator('.metric-value').first(),
  ).toHaveText('0,01 Wh');
  await expect(
    page.getByRole('article', { name: 'Billing API' }),
  ).toBeVisible();
  state.servicesFail = state.indicatorsFail = state.configurationFail = false;
  await page.clock.fastForward(30_000);
  await expect(
    page.getByText('Dados conectados ao backend', { exact: true }),
  ).toBeVisible();
  await expect(alert).toHaveCount(0);
});

test('falha apenas dos indicadores gera um aviso curto e mantém os serviços e últimos indicadores', async ({
  page,
}) => {
  const state = await dashboardApi(page);
  await page.goto('/');
  await expect(
    page.getByText('Dados conectados ao backend', { exact: true }),
  ).toBeVisible();
  state.indicatorsFail = true;
  await refresh(page);
  await expect(page.getByRole('alert')).toHaveCount(1);
  await expect(page.getByRole('alert')).toContainText(
    'Não foi possível atualizar os indicadores; tente novamente em instantes.',
  );
  await expect(
    page.getByText('Backend indisponível', { exact: false }),
  ).toHaveCount(0);
  await expect(
    page.getByText('Dados conectados ao backend', { exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole('article', { name: 'Billing API' }),
  ).toBeVisible();
  await expect(
    page.getByLabel('Indicadores gerais').locator('.metric-value').first(),
  ).toHaveText('0,01 Wh');
  state.indicatorsFail = false;
  await refresh(page);
  await expect(page.getByRole('alert')).toHaveCount(0);
});

test('falha isolada da coleta não declara queda geral nem apaga os cards anteriores', async ({
  page,
}) => {
  const state = await dashboardApi(page);
  await page.goto('/');
  await expect(
    page.getByText('Dados conectados ao backend', { exact: true }),
  ).toBeVisible();
  state.collectionFail = true;
  await refresh(page);
  await expect(page.getByRole('alert')).toContainText(
    'Falha parcial nas consultas ao backend',
  );
  await expect(page.getByRole('alert')).toContainText(
    'Não foi possível atualizar os serviços',
  );
  await expect(
    page.getByRole('article', { name: 'Billing API' }),
  ).toBeVisible();
  await expect(page.getByLabel('Indicadores gerais')).not.toContainText(
    'Últimos dados válidos',
  );
});

test('falha somente da configuração não apresenta intervalo antigo como atual', async ({
  page,
}) => {
  const state = await dashboardApi(page);
  await page.goto('/');
  await expect(
    page.getByText('Dados conectados ao backend', { exact: true }),
  ).toBeVisible();
  state.configurationFail = true;
  await refresh(page);
  await expect(page.getByRole('alert')).toContainText('o intervalo de coleta');
  await expect(page.getByText(/Coleta configurada/)).toHaveCount(0);
  await expect(
    page.getByRole('article', { name: 'Billing API' }),
  ).toBeVisible();
});

test('leitura abaixo da precisão continua positiva sem inventar valores nulos', async ({
  page,
}) => {
  const state = await dashboardApi(page);
  state.indicators.energiaTotalKwh = 1e-10;
  state.indicators.emissaoTotalGCo2e = 1e-10;
  await page.goto('/');
  const values = page.getByLabel('Indicadores gerais').locator('.metric-value');
  await expect(values.nth(0)).toHaveText('< 0,01 Wh');
  await expect(values.nth(1)).toHaveText('< 0,01 gCO₂e');
  state.indicators = { ...telemetry(), energiaTotalKwh: NaN };
  await refresh(page);
  await expect(page.getByRole('alert')).toContainText('os indicadores');
  await expect(values.nth(0)).toHaveText('< 0,01 Wh');
});

for (const theme of ['light', 'dark']) {
  test(`carregamento, falhas e recuperação acessíveis em tema ${theme}`, async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.addInitScript(
      (value) => localStorage.setItem('greener-theme', value),
      theme,
    );
    const state = await dashboardApi(page);
    await page.route('**/api/indicadores*', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 250));
      await route.fallback();
    });
    await page.goto('/');
    await expect(
      page.getByText('Dados conectados ao backend', { exact: true }),
    ).toBeVisible();
    for (const failure of ['none', 'partial', 'all', 'recovered']) {
      state.indicatorsFail = failure === 'partial' || failure === 'all';
      state.servicesFail = state.configurationFail = failure === 'all';
      await refresh(page);
      await expect(page.getByRole('alert')).toHaveCount(
        state.indicatorsFail ? 1 : 0,
      );
      const result = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze();
      expect(result.violations).toEqual([]);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    }
  });
}
