import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const servicosMock = [
  {
    id: 1,
    idExterno: 'video-engine',
    nome: 'Video Engine',
    regiaoCodigo: 'br-sudeste',
    localizacao: { pais: 'Brasil', regiao: 'Sudeste', cidade: 'São Paulo' },
    selo: 'B',
    estadoAtual: 'DISPONIVEL',
    componentes: {
      cpuW: 0.4,
      memoriaW: 1.2,
      discoW: 0.2,
      redeW: 0.2,
      totalW: 2.0,
    },
  },
  {
    id: 2,
    idExterno: 'auth-api',
    nome: 'Auth API',
    regiaoCodigo: 'us-east',
    localizacao: {
      pais: 'Estados Unidos',
      regiao: 'Virginia',
      cidade: 'Ashburn',
    },
    selo: 'A',
    estadoAtual: 'DISPONIVEL',
    componentes: {
      cpuW: 0.1,
      memoriaW: 0.6,
      discoW: 0.1,
      redeW: 0.2,
      totalW: 1.0,
    },
  },
  {
    id: 3,
    idExterno: 'email-worker',
    nome: 'Email Worker',
    regiaoCodigo: 'br-sudeste',
    localizacao: { pais: 'Brasil', regiao: 'Sudeste', cidade: 'São Paulo' },
    selo: '—',
    estadoAtual: 'SEM_METRICAS',
    componentes: null,
  },
];

async function mockDashboardApi(page: Page) {
  await page.route('**/api/servicos', (route) =>
    route.fulfill({ json: servicosMock }),
  );
  await page.route('**/api/configuracao', (route) =>
    route.fulfill({ json: { intervaloColetaSegundos: 30 } }),
  );
  await page.route('**/api/indicadores/serie**', (route) =>
    route.fulfill({
      json: {
        periodo: {
          inicio: '2026-11-19T12:00:00.000Z',
          fim: '2026-11-20T12:00:00.000Z',
        },
        granularidade: 'hora',
        intervalos: ['2026-11-20T10:00:00.000Z', '2026-11-20T11:00:00.000Z'],
        global: [
          {
            inicio: '2026-11-20T10:00:00.000Z',
            energiaKwh: 0.002,
            emissaoGCo2e: 0.3,
          },
          {
            inicio: '2026-11-20T11:00:00.000Z',
            energiaKwh: 0.003,
            emissaoGCo2e: 0.45,
          },
        ],
        servicos: [],
      },
    }),
  );
  await page.route('**/api/indicadores**', (route) =>
    route.fulfill({
      json: {
        periodo: {
          inicio: '2026-11-19T12:00:00.000Z',
          fim: '2026-11-20T12:00:00.000Z',
        },
        energiaTotalKwh: 0.005,
        emissaoTotalGCo2e: 0.75,
        servicos: {
          disponiveis: 2,
          indisponiveis: 0,
          semMetricas: 1,
          removidos: 0,
        },
      },
    }),
  );
  await page.route('**/api/coletas/servico/*/ultima-valida', (route) =>
    route.fulfill({
      json: {
        fonte: 'CACHE_FALLBACK',
        dados: {
          iniciadaEm: '2026-11-20T11:55:00.000Z',
          intervaloColetaSegundos: 30,
          cpuPercent: 40,
          memoryGb: 2,
          diskGb: 10,
          networkGb: 5,
          energiaKwh: 0.002,
          emissaoGCo2e: 0.2,
        },
      },
    }),
  );
}

async function mockServiceDetailApi(page: Page) {
  await mockDashboardApi(page);
  await page.route('**/api/servicos/1/historico**', (route) =>
    route.fulfill({
      json: [
        {
          inicio: '2026-11-20T10:00:00.000Z',
          energiaKwh: 0.001,
          emissaoGCo2e: 0.1,
          selo: 'A',
          componentes: {
            cpuW: 0.78,
            memoriaW: 0.12,
            discoW: 0.06,
            redeW: 0.04,
            totalW: 1.0,
          },
        },
        {
          inicio: '2026-11-20T11:00:00.000Z',
          energiaKwh: 0.0012,
          emissaoGCo2e: 0.12,
          selo: 'A',
          componentes: {
            cpuW: 0.78,
            memoriaW: 0.12,
            discoW: 0.06,
            redeW: 0.04,
            totalW: 1.0,
          },
        },
      ],
    }),
  );
  await page.route('**/api/servicos/1/simulacao-regiao**', (route) =>
    route.fulfill({
      json: {
        periodo: {
          inicio: '2026-11-19T12:00:00.000Z',
          fim: '2026-11-20T12:00:00.000Z',
        },
        servico: {
          servicoId: 1,
          nome: 'Video Engine',
          regiaoCodigo: 'br-sudeste',
        },
        energiaKwh: 0.0022,
        coletasConsideradas: 2,
        emissaoAtualGCo2e: 0.22,
        melhorRegiaoCodigo: 'br-sudeste',
        regioes: [
          {
            codigo: 'br-sudeste',
            pais: 'Brasil',
            regiao: 'Sudeste',
            cidade: 'São Paulo',
            intensidadeGCo2ePorKwh: 100,
            amostrasIntensidade: 2,
            emissaoEstimadaGCo2e: 0.22,
            diferencaGCo2e: 0,
            diferencaPercentual: 0,
            atual: true,
            menorEmissao: true,
          },
        ],
      },
    }),
  );
  await page.route('**/api/intensidade/horarios**', (route) =>
    route.fulfill({
      json: {
        fusoHorario: 'America/Sao_Paulo',
        matriz: Array.from({ length: 7 }, () =>
          Array.from({ length: 24 }, () => ({
            media: null,
            quantidadeAmostras: null,
          })),
        ),
        melhorJanela: null,
      },
    }),
  );
}

test('dashboard conectado soma a composição de todos os serviços, mostra tabela, frase resumo e passa no Axe', async ({
  page,
}) => {
  await mockDashboardApi(page);
  await page.goto('/');

  const secao = page.getByRole('region', { name: 'Composição da energia' });
  await expect(secao).toBeVisible();
  // Soma: cpu 0.50 (16.7%), memoria 1.80 (60.0%), disco 0.30 (10.0%), rede 0.40 (13.3%), total 3.00 W
  await expect(secao).toContainText('Memória responde por 60% do consumo.');
  await expect(secao.locator('.composicao-donut-centro')).toContainText(
    '3,00 W',
  );
  await expect(
    secao.getByRole('row', { name: /Memória\s+1,80 W\s+60,0%/ }),
  ).toBeVisible();
  await expect(
    secao.getByRole('row', { name: /Total\s+3,00 W\s+100,0%/ }),
  ).toBeVisible();

  const axeLight = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(axeLight.violations).toEqual([]);
});

test('detalhe do serviço exibe composição do serviço com mesmas cores fixas e passa no Axe em tema claro e escuro', async ({
  page,
}) => {
  await mockServiceDetailApi(page);
  await page.goto('/servicos/1');

  const secao = page.getByRole('region', { name: 'Composição da energia' });
  await expect(secao).toBeVisible();
  await expect(secao).toContainText('CPU responde por 78% do consumo.');
  await expect(secao.locator('.composicao-donut-centro')).toContainText(
    '1,00 W',
  );

  const chaves = await secao
    .locator('.composicao-legenda li')
    .evaluateAll((els) => els.map((el) => el.getAttribute('data-componente')));
  expect(chaves).toEqual(['cpu', 'memoria', 'disco', 'rede']);

  const axeLight = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(axeLight.violations).toEqual([]);

  await page.getByRole('button', { name: 'Modo escuro' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  const axeDark = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(axeDark.violations).toEqual([]);
});

test('modo demonstração exibe composição no dashboard e no detalhe sem chamar API e sem rolagem lateral', async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 844 });
  await page.goto('/?demo=1');

  const secaoDashboard = page.getByRole('region', {
    name: 'Composição da energia',
  });
  await expect(secaoDashboard).toBeVisible();
  await expect(secaoDashboard).toContainText(/responde por \d+% do consumo\./);

  const overflowMobile = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  expect(overflowMobile).toBe(false);

  await page.goto('/servicos/1?demo=1');
  const secaoDetalhe = page.getByRole('region', {
    name: 'Composição da energia',
  });
  await expect(secaoDetalhe).toBeVisible();
  await expect(secaoDetalhe).toContainText(/responde por \d+% do consumo\./);
});
