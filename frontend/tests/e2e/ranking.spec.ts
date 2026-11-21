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

const linhas = (page: Page) =>
  page.getByRole('region', { name: 'Tabela do ranking' }).getByRole('row');

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

test('compara janelas com texto e ícone e permite ordenar todas as colunas', async ({
  page,
}) => {
  const dados = {
    ...rankingDemo('energia'),
    periodo: { inicio: '2026-11-01T00:00:00Z', fim: '2026-11-08T00:00:00Z' },
    variacaoPercentual: { energiaKwh: 12, emissaoGCo2e: -5 },
    variacaoPorServico: [
      {
        servicoId: 1,
        nome: 'Alpha',
        selo: 'B',
        emissaoAtualGCo2e: 80,
        emissaoAnteriorGCo2e: 100,
        diferencaGCo2e: -20,
        variacaoPercentual: -20,
      },
      {
        servicoId: 2,
        nome: 'Beta',
        selo: 'C',
        emissaoAtualGCo2e: 120,
        emissaoAnteriorGCo2e: 50,
        diferencaGCo2e: 70,
        variacaoPercentual: 140,
      },
      {
        servicoId: 3,
        nome: 'Novo',
        selo: '—',
        emissaoAtualGCo2e: 10,
        emissaoAnteriorGCo2e: null,
        diferencaGCo2e: null,
        variacaoPercentual: null,
      },
    ],
  };
  await page.route('**/api/ranking**', (route) =>
    route.fulfill({ json: dados }),
  );
  await page.goto('/ranking?periodo=7d');
  await expect(
    page.getByText('▲ 12% em relação aos 7 dias anteriores'),
  ).toBeVisible();
  await expect(
    page.getByText('▼ 5% em relação aos 7 dias anteriores'),
  ).toBeVisible();
  const tabela = page.getByRole('table', { name: 'Variação por serviço' });
  await expect(tabela.getByRole('row')).toHaveCount(4);
  for (const [coluna, primeiro] of [
    ['Serviço', 'Alpha'],
    ['Emissão atual', 'Novo'],
    ['Emissão anterior', 'Beta'],
    ['Diferença', 'Alpha'],
    ['Variação (%)', 'Alpha'],
  ]) {
    await tabela.getByRole('button', { name: coluna, exact: true }).click();
    await expect(tabela.getByRole('row').nth(1)).toContainText(primeiro);
  }
  await tabela
    .getByRole('button', { name: 'Variação (%)', exact: true })
    .click();
  await expect(tabela.getByRole('row').nth(1)).toContainText('Beta');
  await expect(tabela.getByRole('row').last()).toContainText(
    'sem base de comparação',
  );
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

  await page
    .getByRole('region', { name: 'Tabela do ranking' })
    .getByRole('link', { name: 'Media CDN' })
    .click();
  await expect(page).toHaveURL(/\/servicos\/8\?periodo=7d$/);

  await page.goBack();
  await page
    .getByRole('region', { name: 'Ranking por energia' })
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
  let semDados = [{ servicoId: 6, nome: 'Notification Worker', selo: '—' }];
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
    page
      .getByRole('region', { name: 'Ranking por energia' })
      .locator('.recharts-bar-rectangle'),
  ).toHaveCount(8);
  await expect(
    page.getByRole('region', { name: 'Ranking por energia' }),
  ).toContainText('Energia (Wh)');

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

test('agrupa por serviço, região e país mantendo o grupo na URL e atualizando gráficos e tabela sem violação do Axe', async ({
  page,
}) => {
  await page.goto('/ranking?demo=1');

  const grupoControles = page.getByRole('group', {
    name: 'Agrupar o ranking por',
  });
  const abaServico = grupoControles.getByRole('button', {
    name: 'Serviço',
    exact: true,
  });
  const abaRegiao = grupoControles.getByRole('button', {
    name: 'Região',
    exact: true,
  });
  const abaPais = grupoControles.getByRole('button', {
    name: 'País',
    exact: true,
  });

  await expect(abaServico).toHaveAttribute('aria-pressed', 'true');
  await expect(
    page
      .getByRole('region', { name: 'Ranking por energia' })
      .locator('.recharts-bar-rectangle'),
  ).toHaveCount(8);

  await abaRegiao.click();
  await expect(abaRegiao).toHaveAttribute('aria-pressed', 'true');
  await expect(page).toHaveURL(/\/ranking\?demo=1&grupo=regiao$/);
  await expect(
    page
      .getByRole('region', { name: 'Ranking por energia' })
      .locator('.recharts-bar-rectangle'),
  ).toHaveCount(5);
  await expect(
    page.getByRole('region', { name: 'Ranking por energia' }),
  ).toContainText('Estados Unidos · Ashburn lidera em energia');
  await expect(linhas(page)).toHaveCount(6);
  await expect(linhas(page).nth(1)).toContainText('Estados Unidos · Ashburn');
  await expect(linhas(page).nth(2)).toContainText('Brasil · São Paulo');
  await expect(linhas(page).nth(3)).toContainText('Japão · Tóquio');
  await semViolacoes(page);

  await abaPais.click();
  await expect(abaPais).toHaveAttribute('aria-pressed', 'true');
  await expect(page).toHaveURL(/\/ranking\?demo=1&grupo=pais$/);
  await expect(
    page.getByRole('region', { name: 'Ranking por energia' }),
  ).toContainText('Estados Unidos lidera em energia');
  await expect(linhas(page).nth(1)).toContainText('Estados Unidos');
  await expect(linhas(page).nth(2)).toContainText('Brasil');
  await expect(linhas(page).nth(3)).toContainText('Japão');
  await semViolacoes(page);

  await abaServico.click();
  await expect(abaServico).toHaveAttribute('aria-pressed', 'true');
  await expect(page).toHaveURL(/\/ranking\?demo=1$/);
  await expect(linhas(page).nth(1)).toContainText('Video Processor');
});
