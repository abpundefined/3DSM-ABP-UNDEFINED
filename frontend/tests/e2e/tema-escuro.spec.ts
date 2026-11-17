import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const THEME_KEY = 'greener-theme';
const TOKEN_KEY = '@greener-abp:token';

const configuracao = {
  intervaloColetaSegundos: 30,
  intervaloDescobertaSegundos: 60,
  atualizadaEm: null,
  padrao: true,
};

test.beforeEach(async ({ page }) => {
  // Sem transições, o Axe mede a cor final, e não uma cor no meio da animação.
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(
    (key) => localStorage.setItem(key, 'dark'),
    THEME_KEY,
  );
});

async function expectNoViolations(page: Page) {
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  const result = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(result.violations).toEqual([]);
}

test('dashboard com o backend fora do ar', async ({ page }) => {
  await page.route('**/api/**', (route) => route.fulfill({ status: 500 }));
  await page.goto('/');

  await expect(
    page.getByRole('button', { name: 'Tentar novamente' }),
  ).toBeVisible();
  await expect(page.locator('.live-refresh-error').first()).toBeVisible();
  await expectNoViolations(page);
});

test('período personalizado com erro de validação', async ({ page }) => {
  await page.route('**/api/**', (route) => route.fulfill({ status: 500 }));
  await page.goto('/');

  await page
    .getByLabel('Período', { exact: true })
    .selectOption('personalizado');
  await page.getByLabel('Início', { exact: true }).fill('2026-11-10');
  await page.getByLabel('Fim', { exact: true }).fill('2026-11-01');
  await page.getByRole('button', { name: 'Aplicar' }).click();

  await expect(page.locator('#period-error')).toBeVisible();
  await expectNoViolations(page);
});

test('modo demonstração', async ({ page }) => {
  await page.goto('/?demo=1');

  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expectNoViolations(page);
});

test('login com credenciais inválidas', async ({ page }) => {
  await page.route('**/api/auth/login', (route) =>
    route.fulfill({ status: 401, json: { message: 'Credenciais inválidas.' } }),
  );
  await page.goto('/login');

  await page.getByLabel('E-mail').fill('admin@greener.local');
  await page.getByLabel('Senha', { exact: true }).fill('senha-errada');
  await page.getByRole('button', { name: 'Entrar' }).click();

  await expect(page.getByRole('alert')).toBeVisible();
  await expectNoViolations(page);
});

test('administração com erro de campo', async ({ page }) => {
  await page.route('**/api/configuracao', (route) =>
    route.fulfill({ json: configuracao }),
  );
  await page.addInitScript(
    (key) => localStorage.setItem(key, 'token'),
    TOKEN_KEY,
  );
  await page.goto('/admin');

  await page.getByLabel('Intervalo de coleta (segundos)').fill('5');
  await page.getByRole('button', { name: 'Salvar intervalos' }).click();

  await expect(
    page.getByText(
      'O intervalo de coleta deve ficar entre 10 e 3600 segundos.',
    ),
  ).toBeVisible();
  await expectNoViolations(page);
});

test('administração com a saúde das integrações em demonstração', async ({
  page,
}) => {
  await page.route('**/api/configuracao', (route) =>
    route.fulfill({ json: configuracao }),
  );
  await page.addInitScript(
    (key) => localStorage.setItem(key, 'token'),
    TOKEN_KEY,
  );
  await page.goto('/admin?demo=1');

  await expect(page.getByText('Com falha')).toBeVisible();
  await expectNoViolations(page);
});
