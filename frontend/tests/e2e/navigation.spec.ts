import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('rotas, histórico, foco e estado vazio funcionam sem backend', async ({
  page,
}) => {
  const failures: string[] = [];
  page.on('pageerror', (error) => failures.push(error.message));
  await page.goto('/');
  await expect(page).toHaveTitle('Dashboard | GreenER');
  await expect(
    page.getByRole('heading', { name: 'Dashboard', exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel('Indicadores gerais')).toContainText('kWh');
  await expect(page.getByLabel('Indicadores gerais')).toContainText('kgCO₂e');
  await expect(
    page.getByRole('heading', { name: 'Seu monitoramento começa aqui' }),
  ).toBeVisible();
  await page
    .getByText('Como funciona o monitoramento', { exact: false })
    .click();
  await expect(
    page.getByText('Descobrir os serviços.', { exact: true }),
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

test('login valida os campos e informa indisponibilidade sem transmitir credenciais', async ({
  page,
}) => {
  const apiRequests: string[] = [];
  page.on('request', (request) => {
    if (request.method() === 'POST' || request.url().includes('/api/'))
      apiRequests.push(request.url());
  });
  await page.goto('/login');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page.getByLabel('Usuário', { exact: true })).toBeFocused();
  await page.getByLabel('Usuário', { exact: true }).fill('usuario-de-teste');
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
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page.getByRole('status')).toContainText(
    'O acesso administrativo ainda não está disponível.',
  );
  expect(apiRequests).toEqual([]);
  const storage = await page.evaluate(() => ({
    local: Object.keys(localStorage),
    session: Object.keys(sessionStorage),
  }));
  expect(storage).toEqual({ local: [], session: [] });
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
