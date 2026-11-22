import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mapaDemo } from '../../src/mocks/mapa';
import { rankingDemo } from '../../src/mocks/ranking';

const PARETO = '3 de 8 serviços respondem por 89,1% das emissões do período.';

async function simularBackend(page: Page, mapa: object = mapaDemo) {
  const consultasDoMapa: URLSearchParams[] = [];
  await page.route('**/api/ranking**', (route) =>
    route.fulfill({ json: rankingDemo('energia') }),
  );
  await page.route('**/api/mapa**', (route) => {
    consultasDoMapa.push(new URL(route.request().url()).searchParams);
    return route.fulfill({ json: mapa });
  });
  return consultasDoMapa;
}

async function semViolacoes(page: Page) {
  const resultado = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(resultado.violations).toEqual([]);
}

const secao = (page: Page) =>
  page.locator('section', {
    has: page.getByRole('heading', { name: 'Participação nas emissões' }),
  });

test('treemap por região com a frase de Pareto e a legenda', async ({
  page,
}) => {
  const consultasDoMapa = await simularBackend(page);
  await page.goto('/ranking?periodo=7d');

  await expect(secao(page)).toContainText(PARETO);
  await expect(secao(page)).toContainText(
    'Estados Unidos · Ashburn é a região que mais emite: 62,4% do total.',
  );
  await expect(page.locator('.treemap-bloco')).toHaveCount(8);
  await expect(
    page
      .getByRole('list', { name: 'Emissão por região' })
      .getByRole('listitem'),
  ).toHaveCount(5);
  expect(consultasDoMapa.at(-1)?.get('periodo')).toBe('7d');
  await semViolacoes(page);
});

test('tabela alternativa e clique no bloco levam ao detalhe', async ({
  page,
}) => {
  await simularBackend(page);
  await page.goto('/ranking?periodo=7d');

  await secao(page).getByText('Ver a participação em tabela').click();
  const linhas = page
    .getByRole('table', { name: /agrupada por região/ })
    .getByRole('row');
  await expect(linhas).toHaveCount(9);
  await expect(linhas.nth(1)).toContainText('Estados Unidos · Ashburn');
  await expect(linhas.nth(1)).toContainText('Video Processor');
  await expect(linhas.nth(1)).toContainText('42,2%');
  await semViolacoes(page);

  await page.locator('.treemap-bloco').first().click();
  await expect(page).toHaveURL(/\/servicos\/5\?periodo=7d$/);
});

test('sem emissão no período mostra o aviso', async ({ page }) => {
  await simularBackend(page, {
    ...mapaDemo,
    servicos: mapaDemo.servicos.map((servico) => ({
      ...servico,
      totais: { energiaKwh: null, emissaoGCo2e: null },
    })),
    semCoordenadas: [],
  });
  await page.goto('/ranking');

  await expect(secao(page)).toContainText(
    'Nenhuma emissão registrada no período.',
  );
  await expect(page.locator('.treemap-bloco')).toHaveCount(0);
});

test('erro do GET /mapa não derruba o ranking e permite tentar de novo', async ({
  page,
}) => {
  let chamadas = 0;
  await page.route('**/api/ranking**', (route) =>
    route.fulfill({ json: rankingDemo('energia') }),
  );
  await page.route('**/api/mapa**', (route) => {
    chamadas += 1;
    return chamadas === 1
      ? route.fulfill({ status: 500 })
      : route.fulfill({ json: mapaDemo });
  });
  await page.goto('/ranking');

  await expect(
    page.getByRole('heading', { name: 'Ranking por energia' }),
  ).toBeVisible();
  await expect(secao(page).getByRole('alert')).toContainText(
    'Não foi possível carregar a participação por região.',
  );
  await semViolacoes(page);

  await secao(page).getByRole('button', { name: 'Tentar novamente' }).click();
  await expect(secao(page)).toContainText(PARETO);
});

test('funciona com ?demo=1 no modo escuro sem chamar o backend', async ({
  page,
}) => {
  const consultasDoMapa = await simularBackend(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => localStorage.setItem('greener-theme', 'dark'));
  await page.goto('/ranking?demo=1');

  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(secao(page)).toContainText(PARETO);
  await expect(page.locator('.treemap-bloco')).toHaveCount(8);
  expect(consultasDoMapa).toEqual([]);
  await semViolacoes(page);
});
