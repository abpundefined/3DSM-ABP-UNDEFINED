import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const TOKEN_KEY = '@greener-abp:token';

async function mockBackend(
  page: Page,
  putResponse?: { status: number; body: object },
) {
  const config = {
    intervaloColetaSegundos: 30,
    intervaloDescobertaSegundos: 60,
    atualizadaEm: null as string | null,
    padrao: true,
  };
  const puts: { authorization?: string; body: unknown }[] = [];

  await page.route('**/api/servicos', (route) => route.fulfill({ json: [] }));
  await page.route('**/api/indicadores', (route) =>
    route.fulfill({ status: 500 }),
  );
  await page.route('**/api/auth/login', (route) =>
    route.fulfill({ json: { accessToken: 'token-de-teste' } }),
  );
  await page.route('**/api/configuracao', async (route) => {
    const request = route.request();
    if (request.method() !== 'PUT') {
      return route.fulfill({ json: config });
    }
    const body = request.postDataJSON();
    puts.push({ authorization: request.headers().authorization, body });
    if (putResponse) {
      return route.fulfill({
        status: putResponse.status,
        json: putResponse.body,
      });
    }
    Object.assign(config, body, {
      atualizadaEm: '2026-11-15T13:00:00.000Z',
      padrao: false,
    });
    return route.fulfill({ json: config });
  });

  return puts;
}

async function axeViolations(page: Page) {
  const result = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  return result.violations;
}

test('login, alteração do intervalo e novo valor no dashboard', async ({
  page,
}, testInfo) => {
  const puts = await mockBackend(page);

  await page.goto('/admin');
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('alert')).toHaveText(
    'Entre para acessar a administração.',
  );
  await page.getByLabel('E-mail').fill('admin@greener.local');
  await page.getByLabel('Senha', { exact: true }).fill('senha-de-teste');
  await page.getByRole('button', { name: 'Entrar' }).click();

  await expect(page).toHaveURL(/\/admin$/);
  const coleta = page.getByLabel('Intervalo de coleta (segundos)');
  await expect(coleta).toHaveValue('30');
  await expect(
    page.getByText('Usando os valores padrão do servidor.'),
  ).toBeVisible();
  expect(await axeViolations(page)).toEqual([]);

  await coleta.fill('60');
  await page.getByRole('button', { name: 'Salvar intervalos' }).click();
  await expect(page.getByRole('status')).toHaveText(
    'Intervalos salvos. Eles passam a valer no próximo ciclo de monitoramento.',
  );
  await expect(page.getByText(/Última alteração:/)).toBeVisible();
  expect(puts).toEqual([
    {
      authorization: 'Bearer token-de-teste',
      body: { intervaloColetaSegundos: 60, intervaloDescobertaSegundos: 60 },
    },
  ]);

  const menu = page.getByRole('navigation', {
    name:
      testInfo.project.name === 'mobile'
        ? 'Navegação inferior'
        : 'Navegação principal',
  });
  await menu.getByRole('link', { name: 'Dashboard', exact: true }).click();
  await expect(
    page.getByText(
      'Coleta configurada a cada 60 segundos · painel atualizado a cada 30 segundos.',
    ),
  ).toBeVisible();
});

test('valores fora dos limites mostram o erro e não chamam a API', async ({
  page,
}) => {
  const puts = await mockBackend(page);
  await page.addInitScript(
    (key) => localStorage.setItem(key, 'token-salvo'),
    TOKEN_KEY,
  );
  await page.goto('/admin');

  const coleta = page.getByLabel('Intervalo de coleta (segundos)');
  const descoberta = page.getByLabel('Intervalo de descoberta (segundos)');
  await coleta.fill('5');
  await descoberta.fill('');
  await page.getByRole('button', { name: 'Salvar intervalos' }).click();

  await expect(
    page.getByText(
      'O intervalo de coleta deve ficar entre 10 e 3600 segundos.',
    ),
  ).toBeVisible();
  await expect(
    page.getByText('Informe o intervalo de descoberta.'),
  ).toBeVisible();
  await expect(coleta).toHaveAttribute('aria-invalid', 'true');
  await expect(coleta).toBeFocused();
  expect(puts).toEqual([]);
  expect(await axeViolations(page)).toEqual([]);
});

test('resposta 401 encerra a sessão e leva ao login com mensagem', async ({
  page,
}) => {
  await mockBackend(page, {
    status: 401,
    body: { statusCode: 401, message: 'Token inválido.' },
  });
  await page.addInitScript(
    (key) => localStorage.setItem(key, 'token-expirado'),
    TOKEN_KEY,
  );
  await page.goto('/admin');

  await page.getByRole('button', { name: 'Salvar intervalos' }).click();

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('alert')).toHaveText(
    'Sua sessão expirou. Entre novamente para salvar.',
  );
  expect(
    await page.evaluate((key) => localStorage.getItem(key), TOKEN_KEY),
  ).toBeNull();
});

test('erro de validação do backend aparece na página', async ({ page }) => {
  await mockBackend(page, {
    status: 400,
    body: {
      statusCode: 400,
      message: ['O intervalo de coleta máximo é 3600 segundos.'],
    },
  });
  await page.addInitScript(
    (key) => localStorage.setItem(key, 'token-salvo'),
    TOKEN_KEY,
  );
  await page.goto('/admin');

  await page.getByRole('button', { name: 'Salvar intervalos' }).click();

  await expect(page.getByRole('alert')).toHaveText(
    'O intervalo de coleta máximo é 3600 segundos.',
  );
  await expect(
    page.getByRole('button', { name: 'Salvar intervalos' }),
  ).toBeEnabled();
});
