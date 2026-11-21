import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mapaDemo } from '../../src/mocks/mapa';
import { rankingDemo } from '../../src/mocks/ranking';

async function mockApiContador(page: Page) {
  await page.route('**/api/servicos', (route) =>
    route.fulfill({
      json: [
        {
          id: 1,
          nome: 'API Pedidos',
          estadoAtual: 'DISPONIVEL',
          regiao: 'br-sudeste',
          energiaKwh: 0.1,
          emissaoGCo2e: 60,
        },
      ],
    }),
  );
  await page.route('**/api/coletas/servico/1/ultima-valida', (route) =>
    route.fulfill({
      json: {
        dados: {
          iniciadaEm: '2026-11-20T12:00:00Z',
          intervaloColetaSegundos: 60,
          energiaKwh: 0.1,
          emissaoGCo2e: 60,
        },
      },
    }),
  );
  await page.route('**/api/configuracao', (route) =>
    route.fulfill({ json: { intervaloColetaSegundos: 60 } }),
  );
  await page.route('**/api/indicadores/meta', (route) =>
    route.fulfill({
      json: {
        metaMensal: null,
        acumuladoMes: 5,
        diasDecorridos: 15,
        diasNoMes: 30,
        projecaoMes: 10,
      },
    }),
  );
  await page.route('**/api/indicadores/serie**', (route) =>
    route.fulfill({
      json: {
        periodo: mapaDemo.periodo,
        granularidade: 'hora',
        intervalos: [],
        global: [],
        servicos: [],
      },
    }),
  );
  await page.route('**/api/indicadores**', (route) =>
    route.fulfill({
      json: {
        energiaTotalKwh: 2,
        emissaoTotalGCo2e: 86_400,
        servicos: {
          disponiveis: 1,
          indisponiveis: 0,
          semMetricas: 0,
          removidos: 0,
        },
      },
    }),
  );
  await page.route('**/api/mapa**', (route) =>
    route.fulfill({ json: mapaDemo }),
  );
  await page.route('**/api/ranking**', (route) =>
    route.fulfill({ json: rankingDemo('energia') }),
  );
}

test('contador ao vivo no dashboard soma a taxa em g/s, aumenta a cada segundo e zera ao clicar em Recomeçar', async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, 'Contador ao vivo disponível apenas em telas desktop.');
  await page.addInitScript(() => {
    localStorage.setItem('greener-tour-visto', '1');
  });
  await page.clock.install();
  await mockApiContador(page);

  await page.goto('/');

  const contador = page.getByRole('region', {
    name: 'Contador ao vivo de CO₂e',
  });
  await expect(contador).toBeVisible();
  await expect(contador).toContainText(
    'Desde que você chegou, os serviços emitiram',
  );

  const agora = await page.evaluate(() => Date.now());
  await page.clock.pauseAt(agora + 50);
  await contador.getByRole('button', { name: 'Recomeçar' }).click();
  await expect(contador.locator('.contador-co2-valor')).toHaveText('0,00 g');

  await page.clock.runFor(3_000);
  await expect(contador.locator('.contador-co2-valor')).toHaveText('3,00 g');

  await contador.getByRole('button', { name: 'Recomeçar' }).click();
  await expect(contador.locator('.contador-co2-valor')).toHaveText('0,00 g');
});

test('contador ao vivo no modo TV continua acumulando entre telas e Recomeçar não fecha o modo TV', async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, 'Modo TV disponível apenas em telas desktop.');
  await page.clock.install({ time: new Date('2026-11-20T12:00:00Z') });
  await page.clock.pauseAt(new Date('2026-11-20T12:00:00Z'));
  await mockApiContador(page);

  await page.goto('/?tv=1');
  await page.clock.runFor(10);

  const contadorTv = page.locator('.contador-co2--tv');
  await expect(contadorTv).toBeVisible();
  await expect(contadorTv.locator('.contador-co2-valor')).toHaveText('0,00 g');

  await page.clock.runFor(4_000);
  await expect(contadorTv.locator('.contador-co2-valor')).toHaveText('4,00 g');

  // Troca de tela após 10 s sem zerar o contador
  await page.clock.runFor(6_000);
  await expect(page).toHaveURL(/\/mapa\?tv=1$/);
  await expect(contadorTv.locator('.contador-co2-valor')).toHaveText('10,00 g');

  // Recomeçar zera sem sair do modo TV
  await contadorTv.getByRole('button', { name: 'Recomeçar' }).click();
  await expect(page).toHaveURL(/\/mapa\?tv=1$/);
  await expect(contadorTv.locator('.contador-co2-valor')).toHaveText('0,00 g');
});

test('versão mobile não exibe o contador ao vivo nem no dashboard nem em ?tv=1', async ({
  page,
  isMobile,
}) => {
  test.skip(!isMobile, 'Validação específica da versão mobile.');
  await page.addInitScript(() => {
    localStorage.setItem('greener-tour-visto', '1');
  });
  await mockApiContador(page);

  await page.goto('/?demo=1');
  await expect(
    page.getByRole('region', { name: 'Contador ao vivo de CO₂e' }),
  ).toHaveCount(0);

  await page.goto('/?tv=1');
  await expect(
    page.getByRole('region', { name: 'Contador ao vivo de CO₂e' }),
  ).toHaveCount(0);
});

for (const theme of ['light', 'dark']) {
  test(`contador ao vivo sem violações do Axe no tema ${theme}`, async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, 'Contador ao vivo disponível apenas em telas desktop.');
    await page.addInitScript((value) => {
      localStorage.setItem('greener-theme', value);
      localStorage.setItem('greener-tour-visto', '1');
    }, theme);
    await page.goto('/?demo=1');
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
    await expect(
      page.getByRole('region', { name: 'Contador ao vivo de CO₂e' }),
    ).toBeVisible();

    const result = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    expect(result.violations).toEqual([]);
  });
}
