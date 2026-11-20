import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { simulacaoDemo } from '../../src/mocks/simulacao';

const BASE_UTC = Date.parse('2026-11-15T05:00:00.000Z'); // 02h em São Paulo

function criarHistoricoComPico() {
  return Array.from({ length: 15 }, (_, index) => {
    const ehPico = index === 12; // 17:00Z = 14h em São Paulo
    return {
      inicio: new Date(BASE_UTC + index * 60 * 60 * 1000).toISOString(),
      energiaKwh: ehPico ? 5 : 0.1,
      emissaoGCo2e: ehPico ? 2500 : 50,
      coletas: 12,
      ativo: 12,
      indisponivel: 0,
      semMetricas: 0,
    };
  });
}

test('marca pico incomum no detalhe do serviço e exibe lista acessível sem violações Axe', async ({
  page,
}) => {
  const historico = criarHistoricoComPico();
  await page.route('**/api/servicos', (route) =>
    route.fulfill({
      json: [
        {
          id: 4,
          idExterno: 'search-api',
          nome: 'Search API',
          regiaoCodigo: 'us-east',
          localizacao: {
            pais: 'Estados Unidos',
            regiao: 'Virgínia',
            cidade: 'Ashburn',
          },
          estadoAtual: 'DISPONIVEL',
        },
      ],
    }),
  );
  await page.route('**/api/servicos/4/historico**', (route) =>
    route.fulfill({ json: historico }),
  );
  await page.route('**/api/coletas/servico/4/ultima-valida', (route) =>
    route.fulfill({ status: 404 }),
  );
  await page.route('**/api/servicos/4/simulacao-regiao**', (route) =>
    route.fulfill({ json: simulacaoDemo(4) }),
  );

  await page.goto('/servicos/4?periodo=24h');

  const picosEnergia = page.getByRole('region', {
    name: 'Picos incomuns de energia',
  });
  await expect(picosEnergia).toBeVisible();
  await expect(
    picosEnergia.getByText('pico incomum às 14h', { exact: true }),
  ).toBeVisible();

  const picosEmissao = page.getByRole('region', {
    name: 'Picos incomuns de emissão',
  });
  await expect(picosEmissao).toBeVisible();
  await expect(
    picosEmissao.getByText('pico incomum às 14h', { exact: true }),
  ).toBeVisible();

  const axe = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(axe.violations).toEqual([]);
});

test('marca pico incomum na tendência do dashboard e explica o critério em Como calculamos', async ({
  page,
}) => {
  const pontos = criarHistoricoComPico();
  const intervalos = pontos.map((p) => p.inicio);

  await page.addInitScript(() => {
    localStorage.setItem('greener-tour-visto', '1');
  });
  await page.route('**/api/servicos', (route) => route.fulfill({ json: [] }));
  await page.route('**/api/configuracao', (route) =>
    route.fulfill({ json: { intervaloColetaSegundos: 60 } }),
  );
  await page.route('**/api/indicadores/meta', (route) =>
    route.fulfill({
      json: {
        metaMensal: null,
        acumuladoMes: 10,
        diasDecorridos: 15,
        diasNoMes: 30,
        projecaoMes: 20,
      },
    }),
  );
  await page.route('**/api/indicadores/serie**', (route) =>
    route.fulfill({
      json: {
        periodo: {
          inicio: intervalos[0],
          fim: intervalos[intervalos.length - 1],
        },
        granularidade: 'hora',
        intervalos,
        global: pontos.map(({ inicio, energiaKwh, emissaoGCo2e }) => ({
          inicio,
          energiaKwh,
          emissaoGCo2e,
        })),
        servicos: [],
      },
    }),
  );
  await page.route('**/api/indicadores?*', (route) =>
    route.fulfill({
      json: {
        energiaTotalKwh: 6.4,
        emissaoTotalGCo2e: 3200,
        servicos: {
          disponiveis: 1,
          indisponiveis: 0,
          semMetricas: 0,
          removidos: 0,
        },
      },
    }),
  );

  await page.goto('/?periodo=24h');

  const picosEnergia = page.getByRole('region', {
    name: 'Picos incomuns de energia',
  });
  await expect(picosEnergia).toBeVisible();
  await expect(
    picosEnergia.getByText('pico incomum às 14h', { exact: true }),
  ).toBeVisible();

  const axeDashboard = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(axeDashboard.violations).toEqual([]);

  await page.goto('/metodologia');
  await expect(
    page.getByRole('heading', { name: /Detecção de picos incomuns/i }),
  ).toBeVisible();
  await expect(page.getByText(/média \+ 3 × desvio-padrão/i)).toBeVisible();
});
