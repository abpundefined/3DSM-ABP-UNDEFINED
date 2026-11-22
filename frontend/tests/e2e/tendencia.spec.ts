import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mapaDemo } from '../../src/mocks/mapa';
import type { PontoDaSerie, RespostaSerie } from '../../src/types/serie';
import { rotuloDaMiniTendencia } from '../../src/utils/serie';

const servicos = [...mapaDemo.servicos, ...mapaDemo.semCoordenadas].map(
  ({ servicoId, nome, regiaoCodigo, estado }) => ({
    id: servicoId,
    idExterno: `servico-${servicoId}`,
    nome,
    regiaoCodigo,
    selo: 'A',
    estadoAtual: estado,
  }),
);

const arredondar = (valor: number) => Math.round(valor * 1e6) / 1e6;

function pontosDoServico(
  emissoes: (number | null)[],
  totais: { energiaKwh: number | null; emissaoGCo2e: number | null },
): PontoDaSerie[] {
  const kwhPorGrama =
    totais.energiaKwh !== null && totais.emissaoGCo2e
      ? totais.energiaKwh / totais.emissaoGCo2e
      : 0;

  return mapaDemo.intervalos.map((inicio, indice) => {
    const emissao = emissoes[indice] ?? null;
    return {
      inicio,
      energiaKwh: emissao === null ? null : arredondar(emissao * kwhPorGrama),
      emissaoGCo2e: emissao,
    };
  });
}

const seriesDeTeste = [
  ...mapaDemo.servicos.map(({ servicoId, nome, serie, totais }) => ({
    servicoId,
    nome,
    serie: pontosDoServico(serie, totais),
  })),
  ...mapaDemo.semCoordenadas.map(({ servicoId, nome, totais }) => {
    const porIntervalo =
      totais.emissaoGCo2e === null
        ? null
        : arredondar(totais.emissaoGCo2e / mapaDemo.intervalos.length);
    return {
      servicoId,
      nome,
      serie: pontosDoServico(
        mapaDemo.intervalos.map(() => porIntervalo),
        totais,
      ),
    };
  }),
];

function somar(valores: (number | null)[]) {
  const presentes = valores.filter((valor) => valor !== null);
  return presentes.length === 0
    ? null
    : arredondar(presentes.reduce((soma, valor) => soma + valor, 0));
}

const serieDaApi: RespostaSerie = {
  periodo: mapaDemo.periodo,
  granularidade: mapaDemo.granularidade,
  intervalos: mapaDemo.intervalos,
  global: mapaDemo.intervalos.map((inicio, indice) => ({
    inicio,
    energiaKwh: somar(
      seriesDeTeste.map(({ serie }) => serie[indice].energiaKwh),
    ),
    emissaoGCo2e: somar(
      seriesDeTeste.map(({ serie }) => serie[indice].emissaoGCo2e),
    ),
  })),
  servicos: seriesDeTeste,
};

function serieSemMetrica(
  metrica: 'energiaKwh' | 'emissaoGCo2e',
): RespostaSerie {
  const limparPonto = (ponto: PontoDaSerie) => ({ ...ponto, [metrica]: null });
  return {
    ...serieDaApi,
    global: serieDaApi.global.map(limparPonto),
    servicos: serieDaApi.servicos.map((servico) => ({
      ...servico,
      serie: servico.serie.map(limparPonto),
    })),
  };
}

const indicadores = {
  energiaTotalKwh: 0.1,
  emissaoTotalGCo2e: 31.53,
  coletasCalculadas: 200,
  servicos: {
    monitorados: 10,
    disponiveis: 7,
    indisponiveis: 1,
    semMetricas: 1,
    desconhecidos: 1,
    removidos: 0,
  },
};

const configuracao = {
  intervaloColetaSegundos: 30,
  intervaloDescobertaSegundos: 60,
  atualizadaEm: null,
  padrao: true,
};

async function simularPainel(
  page: Page,
  responderSerie: () => { status?: number; json?: object } = () => ({
    json: serieDaApi,
  }),
) {
  const consultasDaSerie: URLSearchParams[] = [];
  await page.route('**/api/**', (route) => {
    const url = new URL(route.request().url());
    switch (url.pathname) {
      case '/api/servicos':
        return route.fulfill({ json: servicos });
      case '/api/indicadores':
        return route.fulfill({ json: indicadores });
      case '/api/configuracao':
        return route.fulfill({ json: configuracao });
      case '/api/indicadores/serie':
        consultasDaSerie.push(url.searchParams);
        return route.fulfill(responderSerie());
      default:
        return route.fulfill({ status: 404 });
    }
  });
  return consultasDaSerie;
}

async function semViolacoes(page: Page) {
  const resultado = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(resultado.violations).toEqual([]);
}

const painel = (page: Page) =>
  page.locator('section', {
    has: page.getByRole('heading', { name: 'Tendência no período' }),
  });

test('energia e emissão em gráficos separados, com unidade e frase', async ({
  page,
}) => {
  const consultasDaSerie = await simularPainel(page);
  await page.goto('/?periodo=7d');

  await expect(painel(page).getByText('Energia (Wh)')).toBeVisible();
  await expect(painel(page).getByText('Emissão (gCO₂e)')).toBeVisible();
  await expect(painel(page)).toContainText('Total de 31,53 gCO₂e no período');
  await expect(painel(page).locator('.recharts-line')).toHaveCount(2);
  expect(consultasDaSerie.at(-1)?.get('periodo')).toBe('7d');
  expect(consultasDaSerie.at(-1)?.get('porServico')).toBe('true');
  await semViolacoes(page);
});

test('alterna para a área empilhada com os 5 que mais emitem e Outros', async ({
  page,
}) => {
  await simularPainel(page);
  await page.goto('/');

  const porServico = painel(page).getByRole('button', { name: 'Por serviço' });
  await porServico.click();
  await expect(porServico).toHaveAttribute('aria-pressed', 'true');
  await expect(painel(page)).toContainText(
    'Os 5 serviços que mais emitem somam 95,5% da emissão do período; o maior é Video Processor.',
  );
  const legenda = painel(page).locator('.recharts-legend-item');
  await expect(legenda).toHaveCount(6);
  await expect(legenda.first()).toContainText('Video Processor');
  await expect(legenda.last()).toContainText('Outros (3)');
  await semViolacoes(page);
});

test('cada card mostra o mini gráfico com o rótulo da tendência', async ({
  page,
}) => {
  await simularPainel(page);
  await page.goto('/');

  const videoProcessor = serieDaApi.servicos.find(
    ({ nome }) => nome === 'Video Processor',
  );
  const rotulo = rotuloDaMiniTendencia(
    videoProcessor?.serie.map((ponto) => ponto.emissaoGCo2e) ?? [],
    { kind: 'preset', preset: '24h' },
  );
  const card = page.getByRole('article', { name: 'Video Processor' });

  await expect(card).toContainText(rotulo);
  await expect(card.locator('.mini-tendencia polyline')).toHaveCount(1);
  await expect(page.locator('.mini-tendencia')).toHaveCount(servicos.length);
});

test('sem coletas no período mostra o aviso', async ({ page }) => {
  const semValores = (ponto: { inicio: string }) => ({
    inicio: ponto.inicio,
    energiaKwh: null,
    emissaoGCo2e: null,
  });
  await simularPainel(page, () => ({
    json: {
      ...serieDaApi,
      global: serieDaApi.global.map(semValores),
      servicos: serieDaApi.servicos.map((servico) => ({
        ...servico,
        serie: servico.serie.map(semValores),
      })),
    },
  }));
  await page.goto('/');

  await expect(painel(page)).toContainText(
    'Sem dados de energia para exibir neste período.',
  );
  await expect(painel(page)).toContainText(
    'Sem dados de emissão para exibir neste período.',
  );
  await expect(page.locator('.mini-tendencia').first()).toContainText(
    'Sem coletas suficientes para a tendência nas últimas 24 horas',
  );
});

test('mostra o estado vazio somente no gráfico da métrica sem dados', async ({
  page,
}) => {
  let resposta = serieSemMetrica('energiaKwh');
  await simularPainel(page, () => ({ json: resposta }));

  for (const caso of [
    {
      metrica: 'energiaKwh' as const,
      mensagem: 'Sem dados de energia para exibir neste período.',
      graficoVisivel: 'Emissão (gCO₂e)',
    },
    {
      metrica: 'emissaoGCo2e' as const,
      mensagem: 'Sem dados de emissão para exibir neste período.',
      graficoVisivel: 'Energia (Wh)',
    },
  ]) {
    resposta = serieSemMetrica(caso.metrica);
    await page.goto('/?periodo=7d');

    const graficos = painel(page).locator('.tendencia-graficos');
    await expect(graficos.getByText(caso.mensagem)).toBeVisible();
    await expect(graficos.getByText(caso.graficoVisivel)).toBeVisible();
    await expect(graficos.locator('.recharts-line')).toHaveCount(1);
  }
});

test('erro na série não derruba o painel e permite recarregar', async ({
  page,
}) => {
  let chamadas = 0;
  await simularPainel(page, () => {
    chamadas += 1;
    return chamadas === 1 ? { status: 500 } : { json: serieDaApi };
  });
  await page.goto('/');

  await expect(painel(page)).toContainText(
    'Não foi possível carregar a tendência.',
  );
  await expect(
    page.getByRole('article', { name: 'Video Processor' }),
  ).toBeVisible();
  await expect(page.getByRole('alert')).toHaveCount(0);
  await semViolacoes(page);

  await painel(page)
    .getByRole('button', { name: 'Recarregar a tendência' })
    .click();
  await expect(painel(page)).toContainText('Total de 31,53 gCO₂e no período');
});

test('modo escuro sem violação do Axe', async ({ page }) => {
  await simularPainel(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => localStorage.setItem('greener-theme', 'dark'));
  await page.goto('/');

  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await painel(page).getByRole('button', { name: 'Por serviço' }).click();
  await expect(painel(page).locator('.recharts-legend-item')).toHaveCount(6);
  await semViolacoes(page);
});

test('sem rolagem lateral em 375px e em 1920px', async ({ page }) => {
  await simularPainel(page);
  for (const width of [375, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    await expect(painel(page).locator('.recharts-line')).toHaveCount(2);
    const sobra = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    );
    expect(sobra, `${width}px`).toBeLessThanOrEqual(0);
  }
});
