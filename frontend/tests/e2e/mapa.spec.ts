import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { horariosDemo } from '../../src/mocks/horarios';
import { mapaDemo } from '../../src/mocks/mapa';

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

async function bloquearTiles(page: Page) {
  await page.route('https://tile.openstreetmap.org/**', (route) =>
    route.abort(),
  );
  await page.route('https://tiles.openfreemap.org/**', (route) =>
    route.fulfill({ json: estiloDeTeste }),
  );
}

async function simularMapa(page: Page) {
  const chamadas: string[] = [];
  await page.route('**/api/mapa**', (route) => {
    chamadas.push(route.request().url());
    return route.fulfill({ json: mapaDemo });
  });
  await page.route('**/api/intensidade/horarios**', (route) =>
    route.fulfill({ json: horariosDemo(null) }),
  );
  return chamadas;
}

test.beforeEach(async ({ page }) => {
  await bloquearTiles(page);
});

test('mostra os serviços com marcadores e agrupa os que estão próximos', async ({
  page,
}) => {
  await simularMapa(page);
  await page.goto('/mapa?visao=mapa');

  await expect(
    page.getByText('8 de 10 serviços com localização no mapa'),
  ).toBeVisible();
  await expect(page.locator('.mapa-grupo').first()).toBeVisible();

  await expect
    .poll(async () => {
      const grupos = await page.locator('.mapa-grupo').allInnerTexts();
      const soltos = await page.locator('path.mapa-marcador').count();
      return grupos.reduce((soma, texto) => soma + Number(texto), soltos);
    })
    .toBe(8);
  await expect(page.getByText('© OpenStreetMap')).toBeVisible();
});

test('popup mostra os dados do serviço e leva ao detalhe', async ({ page }) => {
  await simularMapa(page);
  await page.goto('/mapa?periodo=7d&visao=mapa');

  await page
    .locator('path.mapa-marcador:not(.mapa-marcador--sem-dados)')
    .click({ force: true });
  const popup = page.locator('.leaflet-popup-content');
  await expect(popup).toContainText('Media CDN');
  await expect(popup).toContainText('Japão · Tóquio');
  await expect(popup).toContainText('Disponível');
  await expect(popup).toContainText('kWh');
  await expect(popup).toContainText('gCO₂e');

  await popup.getByRole('link', { name: 'Ver detalhes' }).press('Enter');
  await expect(page).toHaveURL(/\/servicos\/8\?periodo=7d$/);
});

test('consulta a API com o período selecionado', async ({ page }) => {
  const chamadas = await simularMapa(page);
  await page.goto('/mapa?periodo=30d&visao=mapa');

  await expect(page.locator('.mapa-grupo').first()).toBeVisible();
  expect(chamadas.at(-1)).toMatch(/\/api\/mapa\?periodo=30d$/);
});

test('mostra o erro e permite tentar de novo', async ({ page }) => {
  let falhar = true;
  await page.route('**/api/mapa**', (route) =>
    falhar
      ? route.fulfill({ status: 502, body: '' })
      : route.fulfill({ json: mapaDemo }),
  );
  await page.goto('/mapa?visao=mapa');

  const alerta = page.getByRole('alert');
  await expect(alerta).toContainText('Não foi possível carregar o mapa');
  await expect(alerta).toContainText('HTTP 502');

  falhar = false;
  await page.getByRole('button', { name: 'Tentar novamente' }).click();
  await expect(page.locator('.mapa-grupo').first()).toBeVisible();
});

test('recusa resposta em formato inválido', async ({ page }) => {
  await page.route('**/api/mapa**', (route) =>
    route.fulfill({ json: { servicos: 'x' } }),
  );
  await page.goto('/mapa');

  await expect(page.getByRole('alert')).toContainText('formato inválido');
});

test('mostra estado vazio quando não há serviços', async ({ page }) => {
  await page.route('**/api/mapa**', (route) =>
    route.fulfill({ json: { ...mapaDemo, servicos: [], semCoordenadas: [] } }),
  );
  await page.goto('/mapa');

  await expect(page.getByText('Nenhum serviço monitorado')).toBeVisible();
});

test('modo demonstração usa dados locais sem chamar a API', async ({
  page,
}) => {
  const chamadas = await simularMapa(page);
  await page.goto('/mapa?demo=1&visao=mapa');

  await expect(page).toHaveTitle('Mapa de emissões · demonstração | GreenER');
  await expect(page.locator('.mapa-grupo').first()).toBeVisible();
  await expect(page.getByLabel('Período', { exact: true })).toHaveCount(0);
  expect(chamadas).toEqual([]);
});

test('mapa carregado não tem violações do Axe', async ({ page }) => {
  await simularMapa(page);
  await page.goto('/mapa?visao=mapa');
  await expect(page.locator('.mapa-grupo').first()).toBeVisible();

  const resultado = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(resultado.violations).toEqual([]);
});

test('compara intensidades por região, mostra serviços e passa no Axe', async ({
  page,
}) => {
  await simularMapa(page);
  await page.goto('/mapa');

  const grafico = page.getByRole('region', {
    name: 'Intensidade de carbono por região',
  });
  const regioes = grafico.getByRole('listitem');
  await expect(regioes).toHaveCount(5);
  await expect(regioes.nth(0)).toContainText('Japão · Tóquio');
  await expect(regioes.nth(0)).toContainText('471 gCO₂e/kWh');
  await expect(regioes.nth(1)).toContainText('Estados Unidos · Ashburn');
  await expect(regioes.nth(2)).toContainText('Brasil · São Paulo');
  await expect(regioes.nth(2)).toContainText('3 serviços');
  await expect(regioes.nth(3)).toContainText('Canadá · Toronto');
  await expect(regioes.nth(3)).toContainText('41 gCO₂e/kWh');
  await expect(regioes.nth(4)).toContainText('Irlanda · Dublin');
  await expect(regioes.nth(4)).toContainText('Sem dados');
  await expect(grafico).toContainText(
    'Japão · Tóquio emite 11,5 vezes mais CO₂e por kWh que Canadá · Toronto',
  );

  const resultado = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(resultado.violations).toEqual([]);
});

test('legenda mostra as faixas de emissão com unidade', async ({ page }) => {
  await simularMapa(page);
  await page.goto('/mapa');

  const legenda = page.getByRole('region', { name: 'Emissão no período' });
  await expect(legenda.getByRole('listitem')).toHaveCount(6);
  await expect(legenda).toContainText('0 a 4 gCO₂e');
  await expect(legenda).toContainText('16 a 20 gCO₂e');
  await expect(legenda).toContainText('Sem dados no período');
});

test('lista os serviços sem coordenadas com link para o detalhe', async ({
  page,
}) => {
  await simularMapa(page);
  await page.goto('/mapa?periodo=7d');

  const lista = page.getByRole('region', { name: 'Sem coordenadas (2)' });
  await expect(lista.getByRole('link')).toHaveText([
    'Email Worker',
    'Legacy Batch',
  ]);
  await expect(lista).toContainText('Disponível · 0,62 gCO₂e');

  await lista.getByRole('link', { name: 'Email Worker' }).click();
  await expect(page).toHaveURL(/\/servicos\/9\?periodo=7d$/);
});

test('tabela alternativa tem todos os serviços, do maior ao menor emissor', async ({
  page,
}) => {
  await simularMapa(page);
  await page.goto('/mapa');

  await page.getByText('Ver os dados do mapa em tabela').click();
  const tabela = page.getByRole('table', {
    name: /Serviços, localização e impacto ambiental/,
  });
  const linhas = tabela.locator('tbody tr');
  await expect(linhas).toHaveCount(10);
  await expect(linhas.first().getByRole('rowheader')).toHaveText(
    'Video Processor',
  );
  await expect(linhas.first()).toContainText('13,3 gCO₂e');
  await expect(linhas.last().getByRole('rowheader')).toHaveText(
    'Notification Worker',
  );
  await expect(tabela.getByRole('row', { name: /Email Worker/ })).toContainText(
    'Sem coordenadas',
  );
});

test('página não tem rolagem horizontal em 375 px', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await simularMapa(page);
  await page.goto('/mapa');
  await page.getByText('Ver os dados do mapa em tabela').click();

  const larguras = await page.evaluate(() => ({
    pagina: document.documentElement.scrollWidth,
    tela: document.documentElement.clientWidth,
  }));
  expect(larguras.pagina).toBe(larguras.tela);
});

test('em 1920 px, globo e mapa ficam ao lado da legenda sem rolagem horizontal', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await simularMapa(page);

  for (const [endereco, seletor] of [
    ['/mapa', '.globo'],
    ['/mapa?visao=mapa', '.mapa-leaflet'],
  ]) {
    await page.goto(endereco);
    const area = await page.locator(seletor).boundingBox();
    const legenda = await page
      .getByRole('region', { name: 'Emissão no período' })
      .boundingBox();
    const larguras = await page.evaluate(() => ({
      pagina: document.documentElement.scrollWidth,
      tela: document.documentElement.clientWidth,
    }));

    if (!area || !legenda) {
      throw new Error(`Sem área visível em ${endereco}.`);
    }
    expect(larguras.pagina).toBe(larguras.tela);
    expect(legenda.x).toBeGreaterThanOrEqual(area.x + area.width);
    expect(legenda.y).toBeLessThan(area.y + area.height);
  }
});

test('tabela aberta não tem violações do Axe', async ({ page }) => {
  await simularMapa(page);
  await page.goto('/mapa');
  await page.getByText('Ver os dados do mapa em tabela').click();
  await expect(page.locator('.mapa-tabela tbody tr')).toHaveCount(10);

  const resultado = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(resultado.violations).toEqual([]);
});

const pontosDoGlobo = (page: Page) =>
  page.getByRole('button', { name: /^Aproximar no mapa/ });

async function analisarAcessibilidade(page: Page) {
  const resultado = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(resultado.violations).toEqual([]);
}

test('abre no globo com um ponto por local visível', async ({ page }) => {
  await simularMapa(page);
  await page.goto('/mapa');

  await expect(
    page.getByRole('button', { name: 'Globo', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  await expect(pontosDoGlobo(page)).toHaveCount(4);
  await expect(
    page.getByRole('button', {
      name: /^Aproximar no mapa: Brasil · São Paulo/,
    }),
  ).toHaveAccessibleName(/Auth Service, Catalog API, Billing Service/);
});

const longitudeDoGlobo = async (page: Page) =>
  Number(
    (await page.locator('.globo-svg').getAttribute('data-rotacao'))?.split(
      ',',
    )[0],
  );

async function centroDoGlobo(page: Page) {
  const svg = page.locator('.globo-svg');
  await svg.evaluate((elemento) =>
    elemento.scrollIntoView({ block: 'center' }),
  );
  const caixa = await svg.boundingBox();
  if (!caixa) {
    throw new Error('Globo sem área visível.');
  }
  return { x: caixa.x + caixa.width / 2, y: caixa.y + caixa.height / 2 };
}

test('arrastar gira o globo e a inércia continua o giro até parar', async ({
  page,
}) => {
  await simularMapa(page);
  await page.goto('/mapa');
  await page.getByRole('button', { name: 'Pausar rotação' }).click();
  const svg = page.locator('.globo-svg');
  const inicial = await longitudeDoGlobo(page);
  const centro = await centroDoGlobo(page);

  await page.mouse.move(centro.x, centro.y);
  const aoSoltar = await svg.evaluate(async (elemento, { x, y }) => {
    const disparar = (tipo: string, deslocamento: number) =>
      elemento.dispatchEvent(
        new PointerEvent(tipo, {
          bubbles: true,
          pointerId: 1,
          pointerType: 'mouse',
          isPrimary: true,
          button: 0,
          buttons: tipo === 'pointerup' ? 0 : 1,
          clientX: x + deslocamento,
          clientY: y,
        }),
      );
    disparar('pointerdown', 0);
    for (let passo = 1; passo <= 6; passo += 1) {
      await new Promise((resolver) => setTimeout(resolver, 16));
      disparar('pointermove', passo * 20);
    }
    disparar('pointerup', 120);
    await new Promise((resolver) => requestAnimationFrame(resolver));
    return Number(elemento.getAttribute('data-rotacao')?.split(',')[0]);
  }, centro);
  expect(aoSoltar).not.toBe(inicial);
  await expect
    .poll(() => longitudeDoGlobo(page), { timeout: 10000 })
    .not.toBe(aoSoltar);

  let anterior = '';
  await expect
    .poll(
      async () => {
        const atual = (await svg.getAttribute('data-rotacao')) ?? '';
        const parado = atual === anterior;
        anterior = atual;
        return parado;
      },
      { intervals: [250], timeout: 8000 },
    )
    .toBe(true);
  expect(Math.abs((await longitudeDoGlobo(page)) - aoSoltar)).toBeGreaterThan(
    1,
  );
});

test('as setas do teclado giram o globo suavemente', async ({ page }) => {
  await simularMapa(page);
  await page.goto('/mapa');
  await page.getByRole('button', { name: 'Pausar rotação' }).click();
  const globo = page.getByRole('group', {
    name: 'Globo com os serviços monitorados',
  });
  await globo.focus();
  const inicial = await longitudeDoGlobo(page);

  await globo.press('ArrowLeft');
  await expect
    .poll(async () => (await longitudeDoGlobo(page)) - inicial, {
      timeout: 10000,
    })
    .toBeGreaterThan(10);
  expect((await longitudeDoGlobo(page)) - inicial).toBeLessThan(13);
});

test('com movimento reduzido, o globo não gira sozinho e as setas giram 12 graus', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await simularMapa(page);
  await page.goto('/mapa');
  const svg = page.locator('.globo-svg');
  await page.mouse.move(0, 0);

  await expect(
    page.getByRole('button', { name: 'Girar o globo' }),
  ).toBeVisible();
  await page.waitForTimeout(3500);
  await expect(svg).toHaveAttribute('data-rotacao', '55.0,-15.0,0.0');

  await page
    .getByRole('group', { name: 'Globo com os serviços monitorados' })
    .press('ArrowLeft');
  await expect(svg).toHaveAttribute('data-rotacao', '67.0,-15.0,0.0');
});

test('o globo gira sozinho devagar e o botão pausa a rotação', async ({
  page,
}) => {
  await simularMapa(page);
  await page.goto('/mapa');
  await page.mouse.move(0, 0);
  const inicial = await longitudeDoGlobo(page);

  await expect
    .poll(() => longitudeDoGlobo(page), { timeout: 12000 })
    .toBeGreaterThan(inicial + 3);

  await page.getByRole('button', { name: 'Pausar rotação' }).click();
  await page.mouse.move(0, 0);
  const pausado = await longitudeDoGlobo(page);
  await page.waitForTimeout(3500);
  expect(await longitudeDoGlobo(page)).toBe(pausado);

  await page.getByRole('button', { name: 'Girar o globo' }).click();
  await page.mouse.move(0, 0);
  await expect
    .poll(() => longitudeDoGlobo(page), { timeout: 12000 })
    .toBeGreaterThan(pausado + 3);
});

test('os botões + e − aproximam o globo e o terceiro + entra no mapa', async ({
  page,
}) => {
  await simularMapa(page);
  await page.goto('/mapa?periodo=7d');
  const svg = page.locator('.globo-svg');
  const aproximar = page.getByRole('button', {
    name: 'Aproximar',
    exact: true,
  });
  const afastar = page.getByRole('button', { name: 'Afastar', exact: true });

  await expect(afastar).toBeDisabled();
  await aproximar.click();
  await expect(svg).toHaveAttribute('data-zoom', '1.50');
  await expect(afastar).toBeEnabled();
  await afastar.click();
  await expect(svg).toHaveAttribute('data-zoom', '1.00');
  await expect(afastar).toBeDisabled();

  await aproximar.click();
  await aproximar.click();
  await expect(svg).toHaveAttribute('data-zoom', '2.25');
  await aproximar.click();
  await expect(page).toHaveURL(/periodo=7d&visao=mapa$/);
  await expect(page.locator('.leaflet-container')).toBeVisible();
});

test('a roda do mouse aproxima o globo até entrar no mapa', async ({
  page,
}) => {
  await simularMapa(page);
  await page.goto('/mapa');
  const svg = page.locator('.globo-svg');
  const centro = await centroDoGlobo(page);
  await page.mouse.move(centro.x, centro.y);

  await page.mouse.wheel(0, -400);
  await expect
    .poll(async () => Number(await svg.getAttribute('data-zoom')))
    .toBeGreaterThan(1.2);
  await expect(page).not.toHaveURL(/visao=mapa/);

  for (let passo = 0; passo < 10; passo += 1) {
    await page.mouse.wheel(0, -400);
  }
  await expect(page).toHaveURL(/visao=mapa/);
  await expect(page.locator('.leaflet-container')).toBeVisible();
});

async function afastarAteOMinimo(page: Page) {
  const afastar = page.getByRole('button', { name: 'Afastar', exact: true });
  const voltar = page.getByRole('button', { name: 'Voltar ao globo' });
  const mapa = page.locator('.leaflet-container');

  for (let passo = 0; passo < 10; passo += 1) {
    await page.waitForTimeout(250);
    await expect(mapa).not.toHaveClass(/leaflet-zoom-anim/);
    if (await voltar.isVisible()) {
      return;
    }
    await afastar.click({ timeout: 2000 }).catch(() => undefined);
  }
  await expect(voltar).toBeVisible();
}

test('sem o estilo vetorial, o mapa usa imagens sem repetir o mundo', async ({
  page,
}) => {
  await page.route('https://tiles.openfreemap.org/**', (route) =>
    route.fulfill({ status: 503 }),
  );
  const tiles: string[] = [];
  page.on('request', (requisicao) => {
    const url = requisicao.url();
    if (url.startsWith('https://tile.openstreetmap.org/')) {
      tiles.push(url);
    }
  });
  await simularMapa(page);
  await page.goto('/mapa?visao=mapa');
  await afastarAteOMinimo(page);

  await expect.poll(() => tiles.length).toBeGreaterThan(0);
  await expect(page.locator('.maplibregl-canvas')).toHaveCount(0);
  const coordenadas = tiles.map((url) =>
    url
      .replace('https://tile.openstreetmap.org/', '')
      .replace('.png', '')
      .split('/')
      .map(Number),
  );
  for (const [z, x, y] of coordenadas) {
    expect(x).toBeGreaterThanOrEqual(0);
    expect(x).toBeLessThan(2 ** z);
    expect(y).toBeGreaterThanOrEqual(0);
    expect(y).toBeLessThan(2 ** z);
  }

  const menorZoom = Math.min(...coordenadas.map(([z]) => z));
  const caixa = await page.locator('.leaflet-container').boundingBox();
  expect(256 * 2 ** menorZoom).toBeGreaterThanOrEqual(caixa?.width ?? 0);
  expect(256 * 2 ** menorZoom).toBeGreaterThanOrEqual(caixa?.height ?? 0);
});

test('dica mostra os serviços e o impacto do local', async ({ page }) => {
  await simularMapa(page);
  await page.goto('/mapa');

  await page
    .getByRole('button', {
      name: /^Aproximar no mapa: Estados Unidos · Ashburn/,
    })
    .focus();
  const dica = page.locator('.globo-dica');
  await expect(dica).toContainText('Estados Unidos · Ashburn');
  await expect(dica).toContainText('Search API, Video Processor');
  await expect(dica).toContainText('gCO₂e');
});

test('selecionar um local aproxima no mapa e abre o serviço', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await simularMapa(page);
  await page.goto('/mapa?periodo=7d');

  await page
    .getByRole('button', { name: /^Aproximar no mapa: Canadá · Toronto/ })
    .press('Enter');
  await expect(page).toHaveURL(/visao=mapa/);
  await expect(
    page.getByRole('button', { name: 'Mapa', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.leaflet-popup-content')).toContainText(
    'Reports Engine',
  );
});

test('com animação, o clique no globo também chega ao mapa', async ({
  page,
}) => {
  await simularMapa(page);
  await page.goto('/mapa');

  await page
    .getByRole('button', { name: /^Aproximar no mapa: Canadá · Toronto/ })
    .click();
  await expect(page.locator('.leaflet-popup-content')).toContainText(
    'Reports Engine',
    { timeout: 10_000 },
  );
});

test('botões alternam entre globo e mapa mantendo o período', async ({
  page,
}) => {
  await simularMapa(page);
  await page.goto('/mapa?periodo=7d');

  await page.getByRole('button', { name: 'Mapa', exact: true }).click();
  await expect(page).toHaveURL(/periodo=7d&visao=mapa$/);
  await expect(page.locator('.leaflet-container')).toBeVisible();

  await page.getByRole('button', { name: 'Globo', exact: true }).click();
  await expect(page).toHaveURL(/\/mapa\?periodo=7d$/);
  await expect(pontosDoGlobo(page)).toHaveCount(4);
});

test('globo não tem violações do Axe no tema claro', async ({ page }) => {
  await simularMapa(page);
  await page.goto('/mapa');
  await expect(pontosDoGlobo(page)).toHaveCount(4);

  await analisarAcessibilidade(page);
});

test('globo não tem violações do Axe no tema escuro', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('greener-theme', 'dark');
  });
  await simularMapa(page);
  await page.goto('/mapa');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(pontosDoGlobo(page)).toHaveCount(4);

  await analisarAcessibilidade(page);
});

const momentoDaLinha = (page: Page) =>
  page.locator('.linha-do-tempo-momento strong');

test('linha do tempo mostra um intervalo e volta ao período inteiro', async ({
  page,
}) => {
  await simularMapa(page);
  await page.goto('/mapa');
  const linha = page.getByRole('region', { name: 'Linha do tempo' });
  const periodoInteiro = linha.getByRole('button', {
    name: 'Ver período inteiro',
  });

  await expect(momentoDaLinha(page)).toHaveText('Período inteiro');
  await expect(periodoInteiro).toBeDisabled();

  await linha.getByRole('slider', { name: 'Intervalo exibido' }).fill('14');
  await expect(momentoDaLinha(page)).toHaveText('11/11, 14:00');
  await expect(
    page.getByRole('region', { name: 'Emissão no intervalo' }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', {
      name: /^Aproximar no mapa: Brasil · São Paulo/,
    }),
  ).toHaveAccessibleName(/Em 11\/11, 14:00/);
  await analisarAcessibilidade(page);

  await periodoInteiro.click();
  await expect(momentoDaLinha(page)).toHaveText('Período inteiro');
  await expect(
    page.getByRole('region', { name: 'Emissão no período' }),
  ).toBeVisible();
});

test('reproduzir avança os intervalos, pausa e para no último', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.clock.install();
  await simularMapa(page);
  await page.goto('/mapa');
  const linha = page.getByRole('region', { name: 'Linha do tempo' });

  await linha.getByRole('button', { name: 'Reproduzir' }).click();
  await expect(momentoDaLinha(page)).toHaveText('11/11, 00:00');
  await page.clock.runFor(900);
  await expect(momentoDaLinha(page)).toHaveText('11/11, 01:00');

  await linha.getByRole('button', { name: 'Pausar' }).click();
  await page.clock.runFor(3000);
  await expect(momentoDaLinha(page)).toHaveText('11/11, 01:00');

  await linha.getByRole('slider', { name: 'Intervalo exibido' }).fill('22');
  await linha.getByRole('button', { name: 'Reproduzir' }).click();
  await page.clock.runFor(900);
  await expect(momentoDaLinha(page)).toHaveText('11/11, 23:00');
  await expect(linha.getByRole('button', { name: 'Reproduzir' })).toBeVisible();
  await page.clock.runFor(3000);
  await expect(momentoDaLinha(page)).toHaveText('11/11, 23:00');
});

test('no mapa, o intervalo muda o marcador e entra no popup', async ({
  page,
}) => {
  await simularMapa(page);
  await page.goto('/mapa?visao=mapa');
  const marcador = page.locator(
    'path.mapa-marcador:not(.mapa-marcador--sem-dados)',
  );
  await expect(marcador).toHaveClass(/mapa-marcador--faixa-3/);

  await page.getByRole('slider', { name: 'Intervalo exibido' }).fill('14');
  await expect(marcador).toHaveClass(/mapa-marcador--faixa-2/);

  await marcador.click({ force: true });
  const popup = page.locator('.leaflet-popup-content');
  await expect(popup).toContainText('Media CDN');
  await expect(popup).toContainText('Em 11/11, 14:00');
  await expect(popup).toContainText('0,35 gCO₂e');
});

test('filtro por região centraliza o globo e filtra a lista e a tabela', async ({
  page,
}) => {
  await simularMapa(page);
  await page.goto('/mapa?periodo=7d');
  const regiao = page.getByRole('combobox', {
    name: 'Região',
    exact: true,
  });

  await regiao.selectOption({ label: 'Brasil · São Paulo' });
  await expect(page).toHaveURL(/periodo=7d&regiao=br-sudeste$/);
  await expect(page.locator('.mapa-resumo')).toHaveText(
    '3 serviços em Brasil · São Paulo',
  );
  await expect(pontosDoGlobo(page)).toHaveCount(1);
  await expect(page.locator('.globo-svg')).toHaveAttribute(
    'data-rotacao',
    '46.6,23.6,0.0',
  );
  await expect(
    page.getByRole('region', { name: 'Sem coordenadas (0)' }),
  ).toBeVisible();
  await page.getByText('Ver os dados do mapa em tabela').click();
  await expect(page.locator('.mapa-tabela tbody tr')).toHaveCount(3);
  await analisarAcessibilidade(page);

  await regiao.selectOption({ label: 'Todas as regiões' });
  await expect(page).toHaveURL(/\/mapa\?periodo=7d$/);
  await expect(pontosDoGlobo(page)).toHaveCount(4);
  await expect(page.locator('.mapa-tabela tbody tr')).toHaveCount(10);
});

test('no mapa, a região da URL enquadra só os marcadores dela', async ({
  page,
}) => {
  await simularMapa(page);
  await page.goto('/mapa?visao=mapa&regiao=jp-east');

  await expect(
    page.getByRole('combobox', { name: 'Região', exact: true }),
  ).toHaveValue('jp-east');
  await expect(page.locator('path.mapa-marcador')).toHaveCount(1);
  await page.locator('path.mapa-marcador').click({ force: true });
  await expect(page.locator('.leaflet-popup-content')).toContainText(
    'Media CDN',
  );
});

test('região inexistente na URL mostra todas as regiões', async ({ page }) => {
  await simularMapa(page);
  await page.goto('/mapa?regiao=inexistente');

  await expect(
    page.getByRole('combobox', { name: 'Região', exact: true }),
  ).toHaveValue('');
  await expect(page.locator('.mapa-resumo')).toHaveText(
    '8 de 10 serviços com localização no mapa',
  );
  await expect(pontosDoGlobo(page)).toHaveCount(4);
});

test('depois de girar com a mão, o globo volta a girar sozinho', async ({
  page,
}) => {
  await simularMapa(page);
  await page.goto('/mapa');
  const svg = page.locator('.globo-svg');
  const centro = await centroDoGlobo(page);

  await page.mouse.move(centro.x, centro.y);
  await page.mouse.down();
  await page.mouse.move(centro.x - 60, centro.y, { steps: 4 });
  await page.waitForTimeout(150);
  await page.mouse.up();
  const depoisDoArrasto = await longitudeDoGlobo(page);

  await expect
    .poll(() => longitudeDoGlobo(page), { timeout: 10000 })
    .not.toBe(depoisDoArrasto);
  const retomado = await longitudeDoGlobo(page);
  await expect
    .poll(() => longitudeDoGlobo(page), { timeout: 5000 })
    .not.toBe(retomado);
  await expect(svg).toBeVisible();
});

test('no zoom mínimo do mapa, o − e a roda do mouse voltam ao globo', async ({
  page,
}) => {
  await simularMapa(page);
  await page.goto('/mapa?periodo=7d&visao=mapa');

  await afastarAteOMinimo(page);
  await page.getByRole('button', { name: 'Voltar ao globo' }).click();
  await expect(page).toHaveURL(/\/mapa\?periodo=7d$/);
  const svg = page.locator('.globo-svg');
  await expect
    .poll(async () => Number(await svg.getAttribute('data-zoom')))
    .toBe(1);

  await page.getByRole('button', { name: 'Mapa', exact: true }).click();
  await afastarAteOMinimo(page);
  const mapa = page.getByRole('region', {
    name: 'Mapa dos serviços monitorados',
  });
  const caixa = await mapa.boundingBox();
  if (!caixa) {
    throw new Error('Mapa sem área visível.');
  }
  await page.mouse.move(caixa.x + caixa.width / 2, caixa.y + caixa.height / 2);
  for (let passo = 0; passo < 3; passo += 1) {
    await page.mouse.wheel(0, 400);
  }
  await expect(page).not.toHaveURL(/visao=mapa/);
  await expect(page.locator('.globo-svg')).toBeVisible();
});

test('o mapa usa o estilo vetorial claro também no modo escuro', async ({
  page,
}) => {
  const estilos: string[] = [];
  page.on('request', (requisicao) => {
    if (requisicao.url().startsWith('https://tiles.openfreemap.org/')) {
      estilos.push(requisicao.url());
    }
  });
  await simularMapa(page);
  await page.goto('/mapa?visao=mapa');

  await expect(page.locator('.maplibregl-canvas')).toHaveCount(1);
  await expect(page.locator('.leaflet-control-attribution')).toContainText(
    'OpenFreeMap',
  );

  await page.getByRole('button', { name: 'Modo escuro' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('.maplibregl-canvas')).toHaveCount(1);
  await expect(page.locator('.mapa-marcador--faixa-3')).toHaveCSS(
    'fill',
    'rgb(144, 82, 3)',
  );
  expect(estilos).toEqual(['https://tiles.openfreemap.org/styles/positron']);
});

test('com o globo girando, o menu troca de página normalmente', async ({
  page,
  isMobile,
}) => {
  await simularMapa(page);
  await page.goto('/mapa');
  const inicial = await longitudeDoGlobo(page);
  await expect
    .poll(() => longitudeDoGlobo(page), { timeout: 12000 })
    .toBeGreaterThan(inicial + 1);

  const menu = isMobile
    ? page.getByRole('navigation', { name: 'Navegação inferior' })
    : page.getByRole('navigation', { name: 'Navegação principal' });
  await menu.getByRole('link', { name: 'Ranking' }).click();

  await expect(page).toHaveURL(/\/ranking/);
  await expect(page.locator('.globo-svg')).toHaveCount(0);
  await expect(page.getByRole('heading', { level: 1 })).not.toHaveText(
    'Mapa de emissões',
  );
});

const listaDeLocais = (page: Page) => page.locator('.globo-locais-item');

async function abrirListaDeLocais(page: Page) {
  const alternar = page.getByRole('button', { name: /^Locais \(/ });
  if ((await alternar.getAttribute('aria-expanded')) === 'false') {
    await alternar.click();
  }
  await expect(alternar).toHaveAttribute('aria-expanded', 'true');
}

test('a lista de locais mostra todos os locais da maior para a menor emissão', async ({
  page,
  isMobile,
}) => {
  await simularMapa(page);
  await page.goto('/mapa');
  const alternar = page.getByRole('button', { name: 'Locais (5)' });

  await expect(alternar).toHaveAttribute(
    'aria-expanded',
    isMobile ? 'false' : 'true',
  );
  await abrirListaDeLocais(page);
  await expect(listaDeLocais(page)).toHaveCount(5);
  await expect(page.locator('.globo-locais-nome')).toHaveText([
    'Estados Unidos · Ashburn',
    'Japão · Tóquio',
    'Brasil · São Paulo',
    'Canadá · Toronto',
    'Irlanda · Dublin',
  ]);
  await expect(listaDeLocais(page).nth(2)).toContainText('3 serviços');
  await expect(listaDeLocais(page).nth(4)).toContainText('sem dados');
  await analisarAcessibilidade(page);

  await alternar.click();
  await expect(alternar).toHaveAttribute('aria-expanded', 'false');
  await expect(listaDeLocais(page).first()).toBeHidden();
});

test('passar o mouse num local da lista gira o globo até ele e mostra a dica', async ({
  page,
}) => {
  await simularMapa(page);
  await page.goto('/mapa');
  await abrirListaDeLocais(page);
  const toquio = page.getByRole('button', {
    name: /^Aproximar no mapa: Japão/,
  });
  await expect(toquio).toBeHidden();

  await listaDeLocais(page).filter({ hasText: 'Japão · Tóquio' }).hover();

  await expect(toquio).toBeVisible();
  await expect(page.locator('.globo-svg')).toHaveAttribute(
    'data-rotacao',
    '-139.7,-35.7,0.0',
  );
  await expect(page.locator('.globo-dica')).toContainText('Media CDN');
});

test('Enter num local da lista entra no mapa naquele ponto', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await simularMapa(page);
  await page.goto('/mapa');
  await abrirListaDeLocais(page);
  const toronto = listaDeLocais(page).filter({ hasText: 'Canadá · Toronto' });

  await toronto.focus();
  await expect(page.locator('.globo-svg')).toHaveAttribute(
    'data-rotacao',
    /^79\.4,-43\.\d,0\.0$/,
  );
  await toronto.press('Enter');

  await expect(page).toHaveURL(/visao=mapa/);
  await expect(page.locator('.leaflet-popup-content')).toContainText(
    'Reports Engine',
  );
});
