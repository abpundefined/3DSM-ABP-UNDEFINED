import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { rankingDemo } from '../../src/mocks/ranking';

async function simularRanking(page: Page) {
  const consultas: URLSearchParams[] = [];
  await page.route('**/api/ranking**', (route) => {
    const params = new URL(route.request().url()).searchParams;
    consultas.push(params);
    return route.fulfill({
      json: rankingDemo(
        params.get('metrica') === 'emissao' ? 'emissao' : 'energia',
      ),
    });
  });
  return consultas;
}

async function semViolacoes(page: Page) {
  const resultado = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(resultado.violations).toEqual([]);
}

const linhas = (page: Page) => page.getByRole('table').getByRole('row');

test('mostra o ranking por energia e troca para emissão', async ({ page }) => {
  const consultas = await simularRanking(page);
  await page.goto('/ranking');

  await expect(
    page.getByRole('heading', { name: 'Ranking por energia' }),
  ).toBeVisible();
  await expect(linhas(page).nth(1)).toContainText('1º');
  await expect(linhas(page).nth(1)).toContainText('Video Processor');
  await expect(linhas(page).nth(6)).toContainText('Reports Engine');
  expect(consultas.at(-1)?.get('metrica')).toBe('energia');
  expect(consultas.at(-1)?.get('limite')).toBe('10');
  await semViolacoes(page);

  const emissao = page.getByRole('button', { name: 'Emissão', exact: true });
  await emissao.click();
  await expect(emissao).toHaveAttribute('aria-pressed', 'true');
  await expect(page).toHaveURL(/\/ranking\?metrica=emissao$/);
  await expect(
    page.getByRole('heading', { name: 'Ranking por emissão' }),
  ).toBeVisible();
  await expect(linhas(page).nth(8)).toContainText('Reports Engine');
  expect(consultas.at(-1)?.get('metrica')).toBe('emissao');
  await semViolacoes(page);
});

test('consulta a API com o período e mostra o período considerado', async ({
  page,
}) => {
  const consultas = await simularRanking(page);
  await page.goto('/ranking?periodo=7d&metrica=emissao');

  await expect(
    page.getByText(
      'Dados de 11/11/2026, 00:00 a 11/11/2026, 23:59, no horário de Brasília.',
    ),
  ).toBeVisible();
  expect(consultas.at(-1)?.get('periodo')).toBe('7d');
  expect(consultas.at(-1)?.get('metrica')).toBe('emissao');

  await page.getByLabel('Período', { exact: true }).selectOption('30d');
  await expect(page).toHaveURL(/periodo=30d/);
  await expect(page).toHaveURL(/metrica=emissao/);
  await expect.poll(() => consultas.at(-1)?.get('periodo')).toBe('30d');
});

test('clique no serviço leva ao detalhe mantendo o período', async ({
  page,
}) => {
  await simularRanking(page);
  await page.goto('/ranking?periodo=7d');

  await page.getByRole('link', { name: 'Media CDN' }).click();
  await expect(page).toHaveURL(/\/servicos\/8\?periodo=7d$/);

  await page.goBack();
  await page
    .locator('.ranking-bloco')
    .first()
    .locator('.recharts-bar-rectangle')
    .first()
    .click();
  await expect(page).toHaveURL(/\/servicos\/5\?periodo=7d$/);
});

test('mantém o ranking na tela enquanto atualiza a métrica', async ({
  page,
}) => {
  let liberar = () => {};
  const espera = new Promise<void>((resolve) => {
    liberar = resolve;
  });
  await page.route('**/api/ranking**', async (route) => {
    const metrica = new URL(route.request().url()).searchParams.get('metrica');
    if (metrica === 'emissao') {
      await espera;
    }
    return route.fulfill({
      json: rankingDemo(metrica === 'emissao' ? 'emissao' : 'energia'),
    });
  });
  await page.goto('/ranking');
  await expect(
    page.getByRole('heading', { name: 'Ranking por energia' }),
  ).toBeVisible();

  await page.getByRole('button', { name: 'Emissão', exact: true }).click();
  await expect(page.getByText('Atualizando o ranking...')).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Ranking por energia' }),
  ).toBeVisible();

  liberar();
  await expect(
    page.getByRole('heading', { name: 'Ranking por emissão' }),
  ).toBeVisible();
  await expect(page.getByText('Atualizando o ranking...')).toHaveCount(0);
});

test('lista os serviços sem dados e mostra os estados vazios', async ({
  page,
}) => {
  const { periodo } = rankingDemo('energia');
  let semDados = [{ servicoId: 6, nome: 'Notification Worker' }];
  await page.route('**/api/ranking**', (route) =>
    route.fulfill({
      json: { periodo, metrica: 'energia', itens: [], semDados },
    }),
  );

  await page.goto('/ranking');
  await expect(page.getByText('Nenhuma coleta no período')).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Sem dados no período (1)' }),
  ).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'Notification Worker' }),
  ).toHaveAttribute('href', '/servicos/6');
  await semViolacoes(page);

  semDados = [];
  await page.reload();
  await expect(page.getByText('Nenhum serviço monitorado')).toBeVisible();
});

test('erro do backend mostra a mensagem e permite tentar de novo', async ({
  page,
}) => {
  let chamadas = 0;
  await page.route('**/api/ranking**', (route) => {
    chamadas += 1;
    return chamadas === 1
      ? route.fulfill({ status: 500 })
      : route.fulfill({ json: rankingDemo('energia') });
  });

  await page.goto('/ranking');
  await expect(page.getByRole('alert')).toContainText(
    'Não foi possível carregar o ranking',
  );
  await expect(page.getByRole('alert')).toContainText('HTTP 500');
  await semViolacoes(page);

  await page.getByRole('button', { name: 'Tentar novamente' }).click();
  await expect(
    page.getByRole('heading', { name: 'Ranking por energia' }),
  ).toBeVisible();
});

test('funciona com ?demo=1 sem chamar o backend', async ({ page }) => {
  const consultas = await simularRanking(page);
  await page.goto('/ranking?demo=1');

  await expect(page).toHaveTitle('Ranking · demonstração | GreenER');
  await expect(page.getByLabel('Período', { exact: true })).toHaveCount(0);
  await expect(
    page.locator('.ranking-bloco').first().locator('.recharts-bar-rectangle'),
  ).toHaveCount(8);
  await expect(page.locator('.ranking-bloco').first()).toContainText(
    'Energia (Wh)',
  );

  await page.getByRole('button', { name: 'Emissão', exact: true }).click();
  await expect(page).toHaveURL(/\/ranking\?demo=1&metrica=emissao$/);
  await expect(
    page.getByRole('heading', { name: 'Ranking por emissão' }),
  ).toBeVisible();
  expect(consultas).toEqual([]);
});

test('sem rolagem lateral em 375px e em 1920px', async ({ page }) => {
  for (const width of [375, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/ranking?demo=1');
    await expect(page.locator('.recharts-bar-rectangle').first()).toBeVisible();
    const sobra = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    );
    expect(sobra, `${width}px`).toBeLessThanOrEqual(0);
  }

  const celulaDeEnergia = page.locator('.ranking-tabela tbody td').nth(1);
  await expect(celulaDeEnergia).toHaveCSS('white-space', 'nowrap');
});

test('modo escuro sem violação do Axe', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => localStorage.setItem('greener-theme', 'dark'));
  await page.goto('/ranking?demo=1&metrica=emissao');

  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(
    page.getByRole('heading', { name: 'Ranking por emissão' }),
  ).toBeVisible();
  await semViolacoes(page);
});
