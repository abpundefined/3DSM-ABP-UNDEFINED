import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { horariosDemo } from '../../src/mocks/horarios';
import { mapaDemo } from '../../src/mocks/mapa';
import { simulacaoDemo } from '../../src/mocks/simulacao';
import type { RespostaHorarios } from '../../src/types/horarios';

const estiloDeTeste = {
  version: 8,
  sources: {},
  layers: [
    {
      id: 'fundo',
      type: 'background',
      paint: { 'background-color': '#dfe8e1' },
    },
  ],
};

const nomeDaSecao = 'Melhor horário para executar processamentos pesados';

async function simularMapa(page: Page) {
  await page.route('https://tile.openstreetmap.org/**', (route) =>
    route.abort(),
  );
  await page.route('https://tiles.openfreemap.org/**', (route) =>
    route.fulfill({ json: estiloDeTeste }),
  );
  await page.route('**/api/mapa**', (route) =>
    route.fulfill({ json: mapaDemo }),
  );
}

async function simularHorarios(
  page: Page,
  resposta: (regiao: string | null) => RespostaHorarios = horariosDemo,
) {
  const chamadas: URL[] = [];
  await page.route('**/api/intensidade/horarios**', (route) => {
    const url = new URL(route.request().url());
    chamadas.push(url);
    return route.fulfill({ json: resposta(url.searchParams.get('regiao')) });
  });
  return chamadas;
}

const secao = (page: Page) => page.getByRole('region', { name: nomeDaSecao });

async function simularDetalheDoServico(page: Page) {
  const { servico } = simulacaoDemo(4)!;
  await page.route('**/api/servicos', (route) =>
    route.fulfill({
      json: [
        {
          id: servico.servicoId,
          idExterno: 'servico-4',
          nome: servico.nome,
          regiaoCodigo: servico.regiaoCodigo,
          localizacao: null,
          selo: 'A',
          estadoAtual: 'DISPONIVEL',
        },
      ],
    }),
  );
  await page.route('**/api/servicos/4/historico**', (route) =>
    route.fulfill({ json: [] }),
  );
  await page.route('**/api/coletas/servico/4/ultima-valida', (route) =>
    route.fulfill({
      status: 404,
      json: { statusCode: 404, message: 'Nenhuma coleta válida.' },
    }),
  );
}

async function analisarAcessibilidade(page: Page) {
  const resultado = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(resultado.violations).toEqual([]);
}

test('mostra o mapa de calor 7 × 24 com a melhor janela e a legenda com unidade', async ({
  page,
}) => {
  await simularMapa(page);
  await simularHorarios(page);
  await page.goto('/mapa');

  await expect(
    secao(page).locator('.horarios-grade .horarios-celula'),
  ).toHaveCount(7 * 24);
  await expect(
    secao(page).locator('.horarios-grade .horarios-celula--melhor'),
  ).toHaveCount(3);
  await expect(secao(page).locator('.horarios-resumo')).toContainText(
    /^Melhor horário para processamentos pesados: domingo, 02h–05h, com média de .* gCO₂e\/kWh, \d+% abaixo da média do período\.$/,
  );

  const legenda = secao(page).getByRole('region', {
    name: 'Legenda do mapa de calor',
  });
  await expect(legenda).toContainText('Intensidade média (gCO₂e/kWh)');
  await expect(legenda.getByRole('listitem')).toHaveCount(7);
  await expect(legenda).toContainText('Sem amostras no período');
  await expect(legenda).toContainText('Melhor janela de 3 horas');
});

test('mostra o valor da célula ao passar o mouse', async ({ page }) => {
  await simularMapa(page);
  await simularHorarios(page);
  await page.goto('/mapa');

  const celula = secao(page)
    .locator('.horarios-grade .horarios-celula')
    .nth(14);
  await celula.scrollIntoViewIfNeeded();
  await celula.click();

  await expect(secao(page).locator('.horarios-dica')).toContainText(
    /^domingo, 14h: [\d,]+ gCO₂e\/kWh, \d+ amostras$/,
  );
});

test('consulta a API com o período e a região escolhida', async ({ page }) => {
  await simularMapa(page);
  const chamadas = await simularHorarios(page);
  await page.goto('/mapa?periodo=7d');

  await expect(secao(page).locator('.horarios-resumo')).toBeVisible();
  expect(chamadas.at(-1)?.searchParams.get('periodo')).toBe('7d');
  expect(chamadas.at(-1)?.searchParams.has('regiao')).toBe(false);

  await secao(page).getByLabel('Horários de').selectOption('us-east');

  await expect(secao(page).locator('.horarios-resumo')).toContainText(
    'em Estados Unidos · Ashburn',
  );
  expect(chamadas.at(-1)?.searchParams.get('regiao')).toBe('us-east');
  expect(chamadas.at(-1)?.searchParams.get('periodo')).toBe('7d');
  await expect(page).toHaveURL(/horarios=us-east/);
});

test('acompanha a região do mapa até escolher outra para os horários', async ({
  page,
}) => {
  await simularMapa(page);
  const chamadas = await simularHorarios(page);
  await page.goto('/mapa?regiao=br-sudeste');

  await expect(secao(page).getByLabel('Horários de')).toHaveValue('br-sudeste');
  expect(chamadas.at(-1)?.searchParams.get('regiao')).toBe('br-sudeste');

  await secao(page).getByLabel('Horários de').selectOption('');

  await expect(secao(page).getByLabel('Horários de')).toHaveValue('');
  await expect(page).toHaveURL(/regiao=br-sudeste/);
  await expect(page).toHaveURL(/horarios=todas/);
  expect(chamadas.at(-1)?.searchParams.has('regiao')).toBe(false);
});

test('células sem amostras têm padrão próprio e aviso de horários sem coleta', async ({
  page,
}) => {
  await simularMapa(page);
  await simularHorarios(page);
  await page.goto('/mapa?horarios=jp-east');

  await expect(
    secao(page).locator('.horarios-grade .horarios-celula--sem-amostras'),
  ).toHaveCount(6);
  await expect(secao(page)).toContainText(
    '6 de 168 horários não têm coletas no período (hachurados)',
  );
});

test('avisa quando não há 3 horas seguidas com coletas', async ({ page }) => {
  await simularMapa(page);
  await simularHorarios(page, () => {
    const base = horariosDemo('br-sudeste');
    return {
      ...base,
      matriz: base.matriz.map((dia, indiceDia) =>
        dia.map((celula, hora) =>
          indiceDia === 1 && hora % 2 === 0
            ? celula
            : { media: null, quantidadeAmostras: null },
        ),
      ),
      melhorJanela: null,
    };
  });
  await page.goto('/mapa');

  await expect(secao(page)).toContainText(
    'Dados insuficientes para indicar a melhor janela',
  );
  await expect(secao(page).locator('.horarios-resumo')).toHaveCount(0);
  await expect(
    secao(page).locator('.horarios-grade .horarios-celula--melhor'),
  ).toHaveCount(0);
});

test('região sem nenhuma coleta mostra o estado vazio', async ({ page }) => {
  await simularMapa(page);
  await simularHorarios(page);
  await page.goto('/mapa?horarios=eu-west');

  await expect(secao(page)).toContainText(
    'Sem dados de intensidade no período',
  );
  await expect(secao(page).locator('.horarios-grade')).toHaveCount(0);
});

test('tabela alternativa traz todas as horas e os mesmos valores', async ({
  page,
}) => {
  await simularMapa(page);
  await simularHorarios(page);
  await page.goto('/mapa?horarios=jp-east');
  await secao(page)
    .getByText('Ver os dados do mapa de calor em tabela')
    .click();

  const tabela = secao(page).getByRole('table', {
    name: /Intensidade média de carbono em gCO₂e\/kWh por hora e dia da semana/,
  });
  await expect(tabela.locator('tbody tr')).toHaveCount(24);
  await expect(tabela.getByRole('columnheader')).toHaveCount(8);
  await expect(tabela.getByRole('rowheader').first()).toHaveText('00h');
  await expect(tabela.getByRole('cell', { name: /sem amostras/ })).toHaveCount(
    6,
  );
  await expect(tabela.getByRole('cell', { name: /melhor janela/ })).toHaveCount(
    3,
  );
  await analisarAcessibilidade(page);
});

test('mantém os dados e o nome da região anteriores até a nova resposta chegar', async ({
  page,
}) => {
  await simularMapa(page);
  let liberar: () => void = () => undefined;
  const liberada = new Promise<void>((resolve) => {
    liberar = resolve;
  });
  await page.route('**/api/intensidade/horarios**', async (route) => {
    const regiao = new URL(route.request().url()).searchParams.get('regiao');
    if (regiao === 'us-east') {
      await liberada;
    }
    await route.fulfill({ json: horariosDemo(regiao) });
  });
  await page.goto('/mapa?horarios=br-sudeste');
  await expect(secao(page).locator('.horarios-resumo')).toContainText(
    'em Brasil · São Paulo',
  );

  await secao(page).getByLabel('Horários de').selectOption('us-east');

  await expect(secao(page)).toContainText('Atualizando os horários...');
  await expect(secao(page).locator('.horarios-resumo')).toContainText(
    'em Brasil · São Paulo',
  );

  liberar();

  await expect(secao(page).locator('.horarios-resumo')).toContainText(
    'em Estados Unidos · Ashburn',
  );
  await expect(secao(page)).not.toContainText('Atualizando os horários...');
});

test('erro da API mostra a mensagem e permite tentar de novo', async ({
  page,
}) => {
  await simularMapa(page);
  let falhar = true;
  await page.route('**/api/intensidade/horarios**', (route) =>
    falhar
      ? route.fulfill({ status: 500, json: { message: 'Erro interno' } })
      : route.fulfill({ json: horariosDemo(null) }),
  );
  await page.goto('/mapa');

  await expect(page.getByRole('alert')).toContainText(
    'Não foi possível carregar os horários',
  );

  falhar = false;
  await page.getByRole('button', { name: 'Tentar novamente' }).click();

  await expect(secao(page).locator('.horarios-resumo')).toBeVisible();
  await expect(page.getByRole('alert')).toHaveCount(0);
});

test('resposta fora do contrato é recusada', async ({ page }) => {
  await simularMapa(page);
  await simularHorarios(page, () => ({
    fusoHorario: 'America/Sao_Paulo',
    matriz: [],
    melhorJanela: null,
  }));
  await page.goto('/mapa');

  await expect(page.getByRole('alert')).toContainText('formato inválido');
});

test('funciona com ?demo=1 sem chamar o backend', async ({ page }) => {
  await simularMapa(page);
  const chamadas = await simularHorarios(page);
  await page.goto('/mapa?demo=1');

  await expect(secao(page).locator('.horarios-resumo')).toContainText(
    'Melhor horário para processamentos pesados',
  );
  await secao(page).getByLabel('Horários de').selectOption('us-east');
  await expect(secao(page).locator('.horarios-resumo')).toContainText(
    'em Estados Unidos · Ashburn',
  );
  await expect(
    secao(page).getByRole('link', { name: 'Metodologia' }),
  ).toHaveAttribute('href', '/metodologia?demo=1');
  expect(chamadas).toHaveLength(0);
});

test('no detalhe do serviço abre na região dele e permite trocar', async ({
  page,
}) => {
  const regiao = simulacaoDemo(4)!.servico.regiaoCodigo;
  await page.route('**/api/servicos/4/simulacao-regiao**', (route) =>
    route.fulfill({ json: simulacaoDemo(4) }),
  );
  const chamadas = await simularHorarios(page);
  await simularDetalheDoServico(page);
  await page.goto('/servicos/4');

  await expect(secao(page).getByLabel('Horários de')).toHaveValue(regiao);
  await expect(secao(page).locator('.horarios-resumo')).toBeVisible();
  expect(chamadas.at(-1)?.searchParams.get('regiao')).toBe(regiao);

  await secao(page).getByLabel('Horários de').selectOption('ca-central');

  expect(chamadas.at(-1)?.searchParams.get('regiao')).toBe('ca-central');
  await analisarAcessibilidade(page);
});

test('no detalhe, sem a região do serviço não duplica o alerta e permite tentar de novo', async ({
  page,
}) => {
  let falhar = true;
  await page.route('**/api/servicos/4/simulacao-regiao**', (route) =>
    falhar
      ? route.fulfill({
          status: 404,
          json: { message: 'Serviço não encontrado.' },
        })
      : route.fulfill({ json: simulacaoDemo(4) }),
  );
  await simularHorarios(page);
  await simularDetalheDoServico(page);
  await page.goto('/servicos/4');

  await expect(page.getByRole('alert')).toHaveCount(1);
  await expect(secao(page)).toContainText(
    'Não foi possível descobrir a região do serviço',
  );

  falhar = false;
  await secao(page).getByRole('button', { name: 'Tentar novamente' }).click();

  await expect(secao(page).locator('.horarios-resumo')).toBeVisible();
});

test('mapa de calor não tem violações do Axe nos temas claro e escuro', async ({
  page,
}) => {
  await simularMapa(page);
  await simularHorarios(page);
  await page.goto('/mapa?horarios=br-sudeste');
  await expect(secao(page).locator('.horarios-resumo')).toBeVisible();
  await analisarAcessibilidade(page);

  await page.evaluate(() => {
    window.localStorage.setItem('greener-theme', 'dark');
  });
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(secao(page).locator('.horarios-resumo')).toBeVisible();
  await analisarAcessibilidade(page);
});

test('sem rolagem lateral em 375px e em 1920px', async ({ page }) => {
  await simularMapa(page);
  await simularHorarios(page);

  for (const largura of [375, 1920]) {
    await page.setViewportSize({ width: largura, height: 900 });
    await page.goto('/mapa?horarios=br-sudeste');
    await expect(secao(page).locator('.horarios-resumo')).toBeVisible();
    await secao(page)
      .getByText('Ver os dados do mapa de calor em tabela')
      .click();

    const larguras = await page.evaluate(() => ({
      pagina: document.documentElement.scrollWidth,
      tela: document.documentElement.clientWidth,
    }));
    expect(larguras.pagina).toBe(larguras.tela);
  }
});
