import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('rotas, histórico, foco e painel conectado funcionam sem backend', async ({
  page,
}) => {
  const failures: string[] = [];
  page.on('pageerror', (error) => failures.push(error.message));
  await page.route('**/api/servicos', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }),
  );
  await page.route('**/api/indicadores', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        energiaTotalKwh: 0,
        emissaoTotalGCo2e: 0,
        servicos: { disponiveis: 0, indisponiveis: 0 },
      }),
    }),
  );
  await page.goto('/');
  await expect(page).toHaveTitle('Dashboard | GreenER');
  await expect(
    page.getByRole('heading', { name: 'Dashboard', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'Dashboard', exact: true }),
  ).toHaveAttribute('aria-current', 'page');
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/$/);
  await expect(
    page.getByRole('link', { name: 'Dashboard', exact: true }),
  ).toHaveAttribute('aria-current', 'page');
  await expect(page.getByLabel('Indicadores gerais')).toContainText('kWh');
  await expect(page.getByLabel('Indicadores gerais')).toContainText('kgCO₂e');
  await expect(
    page.getByRole('heading', { name: 'Nenhum serviço encontrado' }),
  ).toBeVisible();
  await page.getByRole('link', { name: 'Entrar', exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page).toHaveTitle('Entrar | GreenER');
  await expect(page.getByRole('main')).toBeFocused();
  await page.reload();
  await expect(
    page.getByRole('heading', { name: 'Bem-vindo de volta' }),
  ).toBeVisible();
  await page.goBack();
  await expect(page).toHaveTitle('Dashboard | GreenER');
  await page.goto('/endereco-que-nao-existe');
  await expect(page).toHaveTitle('Página não encontrada | GreenER');
  await page.reload();
  await expect(
    page.getByRole('heading', { name: 'Vamos voltar ao caminho certo?' }),
  ).toBeVisible();
  await page
    .getByRole('link', { name: 'Voltar ao dashboard', exact: true })
    .click();
  await expect(page).toHaveURL(/\/$/);
  expect(failures).toEqual([]);
});

test('login valida campos e exibe a mensagem 401 retornada pelo backend', async ({
  page,
}) => {
  let submittedBody: { email?: string; senha?: string } | undefined;
  await page.goto('/login');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page.getByLabel('E-mail', { exact: true })).toBeFocused();
  await page.getByLabel('E-mail', { exact: true }).fill('teste@greener.local');
  await page.getByLabel('Senha', { exact: true }).fill('senha-ficticia');
  await page.getByRole('button', { name: 'Mostrar senha' }).click();
  await expect(page.getByLabel('Senha', { exact: true })).toHaveAttribute(
    'type',
    'text',
  );
  await page.getByRole('button', { name: 'Ocultar senha' }).click();
  await expect(page.getByLabel('Senha', { exact: true })).toHaveAttribute(
    'type',
    'password',
  );
  await page.route('**/api/auth/login', async (route) => {
    submittedBody = route.request().postDataJSON();
    await route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({
        sucesso: false,
        statusCode: 401,
        mensagem: 'Credenciais inválidas.',
      }),
    });
  });
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveText('Credenciais inválidas.');
  const alertAccessibility = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(alertAccessibility.violations).toEqual([]);
  expect(submittedBody).toEqual({
    email: 'teste@greener.local',
    senha: 'senha-ficticia',
  });
});

test('login salva token e retorna ao dashboard após sucesso', async ({
  page,
}) => {
  await page.route('**/api/auth/login', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ accessToken: 'token-de-teste' }),
    }),
  );
  await page.route('**/api/servicos', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }),
  );
  await page.goto('/login');
  await page.getByLabel('E-mail', { exact: true }).fill('teste@greener.local');
  await page.getByLabel('Senha', { exact: true }).fill('senha-ficticia');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(
    page.getByRole('heading', { name: 'Dashboard', exact: true }),
  ).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem('@greener-abp:token')))
    .toBe('token-de-teste');
});

test('login distingue falha de conexão de credenciais inválidas', async ({
  page,
}) => {
  await page.route('**/api/auth/login', (route) => route.abort());
  await page.goto('/login');
  await page.getByLabel('E-mail', { exact: true }).fill('teste@greener.local');
  await page.getByLabel('Senha', { exact: true }).fill('senha-ficticia');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveText(
    'Não foi possível conectar ao servidor. Tente novamente.',
  );
});

test('alternância de tema usa claro por padrão e mantém a escolha salva', async ({
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
        energiaTotalKwh: 0,
        emissaoTotalGCo2e: 0,
        servicos: { disponiveis: 0, indisponiveis: 0 },
      }),
    }),
  );
  await page.goto('/');

  const darkMode = page.getByRole('button', { name: 'Modo escuro' });
  const lightMode = page.getByRole('button', { name: 'Modo claro' });

  await expect(darkMode).toHaveAttribute('aria-pressed', 'false');
  await expect(lightMode).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');

  await darkMode.click();
  await expect(darkMode).toHaveAttribute('aria-pressed', 'true');
  await expect(lightMode).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  const darkModeAccessibility = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(darkModeAccessibility.violations).toEqual([]);

  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await lightMode.click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');

  await page.goto('/login');
  await expect(
    page.getByText('ÁREA ADMINISTRATIVA', { exact: true }),
  ).toHaveCSS('color', 'rgb(23, 107, 48)');
  await darkMode.click();
  await expect(
    page.getByText('ÁREA ADMINISTRATIVA', { exact: true }),
  ).toHaveCSS('color', 'rgb(139, 212, 154)');
});

test('link de salto permite chegar ao conteúdo usando teclado', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('heading', { name: 'Dashboard', exact: true }).waitFor();
  await page.keyboard.press('Tab');
  await expect(
    page.getByRole('link', { name: 'Pular para o conteúdo' }),
  ).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('main')).toBeFocused();
});

for (const path of ['/', '/login', '/nao-existe']) {
  test(`acessibilidade e largura da página ${path}`, async ({
    page,
  }, testInfo) => {
    await page.goto(path);
    await page.getByRole('heading', { level: 1 }).waitFor();
    await page.evaluate(() => document.fonts.ready);
    const result = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    expect(result.violations).toEqual([]);
    for (const width of [360, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true);
    }
    await page.setViewportSize(
      testInfo.project.name === 'mobile'
        ? { width: 390, height: 844 }
        : { width: 1440, height: 1000 },
    );
    await page.screenshot({
      path: testInfo.outputPath('pagina.png'),
      fullPage: true,
    });
  });
}

test('há feedback durante carregamento e falha de uma página', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('heading', { name: 'Dashboard', exact: true }).waitFor();
  let releaseChunk: (() => void) | undefined;
  const pendingChunk = new Promise<void>((resolve) => {
    releaseChunk = resolve;
  });
  await page.route(
    /(?:\/pages\/Login\.tsx|\/assets\/Login-[^/]+\.js)(?:\?.*)?$/,
    async (route) => {
      await pendingChunk;
      await route.fulfill({
        status: 200,
        contentType: 'application/javascript',
        body: 'export default function BrokenPage() { throw new Error("Falha simulada pelo teste"); }',
      });
    },
  );
  await page.getByRole('link', { name: 'Entrar', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Abrindo a página');
  releaseChunk?.();
  await expect(page.getByRole('alert')).toContainText(
    'Não foi possível abrir esta página',
  );
  await page.unrouteAll({ behavior: 'wait' });
  await page.getByRole('button', { name: 'Recarregar aplicação' }).click();
  await expect(
    page.getByRole('heading', { name: 'Bem-vindo de volta' }),
  ).toBeVisible();
});
