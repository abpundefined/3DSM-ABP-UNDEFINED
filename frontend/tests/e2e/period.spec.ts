import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const indicadores = {
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
};

async function mockBackend(page: Page) {
  const requests: URL[] = [];
  await page.clock.setFixedTime(new Date('2026-11-13T12:11:00Z'));
  await page.route('**/api/servicos', (route) => route.fulfill({ json: [] }));
  await page.route(
    (url) => url.pathname === '/api/indicadores',
    (route) => {
      requests.push(new URL(route.request().url()));
      return route.fulfill({ json: indicadores });
    },
  );
  return requests;
}

test('sem escolha, o dashboard usa as últimas 24 horas', async ({ page }) => {
  const requests = await mockBackend(page);
  await page.goto('/');

  await expect(page.getByLabel('Período', { exact: true })).toHaveValue('24h');
  await expect(page.getByText('Período analisado:')).toContainText(
    '12/11/2026, 09:11 a 13/11/2026, 09:11',
  );
  await expect.poll(() => requests.length).toBeGreaterThan(0);
  expect(requests[0].search).toBe('');
});

test('trocar o período atualiza a URL, a frase e a consulta', async ({
  page,
}) => {
  const requests = await mockBackend(page);
  await page.goto('/');

  const select = page.getByLabel('Período', { exact: true });
  await select.selectOption('7d');

  await expect(page).toHaveURL(/\/\?periodo=7d$/);
  await expect(page.getByText('Período analisado:')).toContainText(
    '06/11 a 13/11/2026',
  );
  await expect
    .poll(() => requests.at(-1)?.searchParams.get('periodo'))
    .toBe('7d');
  await expect(page.getByLabel('Indicadores gerais')).toContainText('3,7500');

  await page.goBack();
  await expect(select).toHaveValue('24h');
});

test('período personalizado inválido mostra o erro e não muda a URL', async ({
  page,
}) => {
  await mockBackend(page);
  await page.goto('/');

  await page.getByLabel('Período', { exact: true }).selectOption('personalizado');
  await page.getByLabel('Início', { exact: true }).fill('2026-11-10');
  await page.getByLabel('Fim', { exact: true }).fill('2026-11-01');
  await page.getByRole('button', { name: 'Aplicar' }).click();

  const error = page.locator('#period-error');
  await expect(error).toHaveText(
    'A data de fim precisa ser igual ou posterior à data de início.',
  );
  await expect(page).not.toHaveURL(/inicio=/);

  await page.getByLabel('Início', { exact: true }).fill('2026-08-01');
  await page.getByRole('button', { name: 'Aplicar' }).click();
  await expect(error).toContainText('no máximo 90 dias');

  const result = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(result.violations).toEqual([]);
});

test('período personalizado válido vai para a URL e para a API', async ({
  page,
}) => {
  const requests = await mockBackend(page);
  await page.goto('/');

  await page.getByLabel('Período', { exact: true }).selectOption('personalizado');
  await page.getByLabel('Início', { exact: true }).fill('2026-11-01');
  await page.getByLabel('Fim', { exact: true }).fill('2026-11-07');
  await page.getByRole('button', { name: 'Aplicar' }).click();

  await expect(page).toHaveURL(/\?inicio=2026-11-01&fim=2026-11-07$/);
  await expect(page.getByText('Período analisado:')).toContainText(
    '01/11 a 07/11/2026',
  );
  await expect
    .poll(() => requests.at(-1)?.searchParams.get('inicio'))
    .toBe('2026-11-01T00:00:00.000-03:00');
  expect(requests.at(-1)?.searchParams.get('fim')).toBe(
    '2026-11-07T23:59:59.999-03:00',
  );
});

test('link com o período já abre filtrado', async ({ page }) => {
  const requests = await mockBackend(page);
  await page.goto('/?periodo=mes-anterior');

  await expect(page.getByLabel('Período', { exact: true })).toHaveValue(
    'mes-anterior',
  );
  await expect(page.getByText('Período analisado:')).toContainText(
    '01/10 a 31/10/2026',
  );
  await expect
    .poll(() => requests.at(-1)?.searchParams.get('periodo'))
    .toBe('mes-anterior');
});

test('o período continua ao trocar de página pelo menu', async ({
  page,
}, testInfo) => {
  await mockBackend(page);
  const menuName =
    testInfo.project.name === 'mobile'
      ? 'Navegação inferior'
      : 'Navegação principal';
  await page.goto('/?periodo=30d');

  const menu = page.getByRole('navigation', { name: menuName });
  await menu.getByRole('link', { name: 'Ranking', exact: true }).click();
  await expect(page).toHaveURL(/\/ranking\?periodo=30d$/);

  await menu.getByRole('link', { name: 'Dashboard', exact: true }).click();
  await expect(page).toHaveURL(/\/\?periodo=30d$/);
  await expect(page.getByLabel('Período', { exact: true })).toHaveValue('30d');
});

test('modo demonstração não mostra o seletor', async ({ page }) => {
  await page.goto('/?demo=1');

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Dashboard');
  await expect(page.getByLabel('Período', { exact: true })).toHaveCount(0);
});
