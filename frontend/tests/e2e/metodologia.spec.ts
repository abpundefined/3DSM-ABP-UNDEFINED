import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { FONTE_EQUIVALENCIAS } from '../../src/constants/equivalencias';

test('página /metodologia apresenta fórmulas, API de carbono, SCI, EPA, critérios e exemplo real sem violações Axe', async ({
  page,
}) => {
  await page.goto('/metodologia');

  await expect(
    page.getByRole('heading', { level: 1, name: 'Como calculamos' }),
  ).toBeVisible();
  await expect(page).toHaveTitle('Como calculamos | GreenER');

  await expect(page.locator('.methodology-page')).toContainText(
    'Potência total (W)',
  );
  await expect(page.locator('.methodology-page')).toContainText(
    'Energia (Wh) = Potência (W)',
  );
  await expect(page.locator('.methodology-page')).toContainText(
    'Software Carbon Intensity (SCI)',
  );
  await expect(page.locator('.methodology-page')).toContainText(
    'não servem para relatório oficial de emissões',
  );
  await expect(page.locator('.methodology-page')).toContainText(
    FONTE_EQUIVALENCIAS.nome,
  );
  await expect(page.locator('.methodology-page')).toContainText(
    FONTE_EQUIVALENCIAS.consultadoEm,
  );
  await expect(page.locator('.methodology-page')).toContainText('12,4');
  await expect(page.locator('.methodology-page')).toContainText(
    'matriz 7 × 24',
  );
  await expect(page.locator('.methodology-page')).toContainText(
    'melhor janela de 3 horas seguidas',
  );
  await expect(page.locator('.methodology-page')).toContainText(
    'Selo de eficiência',
  );
  await expect(page.locator('.methodology-page')).toContainText(
    'Até 10 gCO₂e/h',
  );
  await expect(page.locator('.methodology-page')).toContainText(
    'não significa emissão zero',
  );
  await expect(page.locator('.methodology-page')).toContainText(
    'time-shifting',
  );
  await expect(page.locator('.methodology-page')).toContainText(
    'médias históricas do período selecionado',
  );
  await expect(page.locator('.methodology-page')).toContainText(
    'estadoColeta = SUCESSO',
  );
  await expect(page.locator('.methodology-page')).toContainText(
    'estadoCalculo = FALHA',
  );
  await expect(page.locator('.methodology-page')).toContainText(
    '/coletas/servico/:id/ultima-valida',
  );

  const axeLight = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(axeLight.violations).toEqual([]);
});

test('página /metodologia passa no Axe em tema escuro e sem rolagem horizontal em 375px e 1920px', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => {
    localStorage.setItem('greener-theme', 'dark');
  });

  await page.setViewportSize({ width: 375, height: 844 });
  await page.goto('/metodologia?demo=1');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  const overflowMobile = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  expect(overflowMobile).toBe(false);

  const axeDark = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(axeDark.violations).toEqual([]);

  await page.setViewportSize({ width: 1920, height: 1080 });
  const overflowDesktop = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  expect(overflowDesktop).toBe(false);
});

test('link "Como calculamos?" ao lado de valor estimado navega para /metodologia', async ({
  page,
}) => {
  await page.goto('/?demo=1');
  await page.getByRole('link', { name: 'Como calculamos?' }).first().click();
  await expect(page).toHaveURL(/\/metodologia\?demo=1$/);
  await expect(
    page.getByRole('heading', { level: 1, name: 'Como calculamos' }),
  ).toBeVisible();
});

test('link "Como calculamos?" aparece junto dos totais em /comparar e navega para /metodologia', async ({
  page,
}) => {
  await page.route('**/api/servicos', (route) =>
    route.fulfill({
      json: [
        {
          id: 1,
          idExterno: 'billing-api',
          nome: 'Billing API',
          regiaoCodigo: 'br-sudeste',
          localizacao: null,
          selo: 'A',
          estadoAtual: 'DISPONIVEL',
        },
        {
          id: 2,
          idExterno: 'reports-engine',
          nome: 'Reports Engine',
          regiaoCodigo: 'ca-central',
          localizacao: null,
          selo: 'A',
          estadoAtual: 'DISPONIVEL',
        },
      ],
    }),
  );
  await page.route('**/api/comparacao**', (route) =>
    route.fulfill({
      json: {
        periodo: {
          inicio: '2026-11-10T00:00:00.000Z',
          fim: '2026-11-17T23:59:59.999Z',
        },
        granularidade: 'hora',
        servicos: [
          {
            servicoId: 1,
            nome: 'Billing API',
            totais: {
              energiaKwh: 0.002,
              emissaoGCo2e: 0.4,
              cpuMedia: 21,
              memoriaMediaMb: 512,
              coletasValidas: 2,
            },
            serie: [
              {
                inicio: '2026-11-10T00:00:00.000Z',
                energiaKwh: 0.002,
                emissaoGCo2e: 0.4,
              },
            ],
          },
          {
            servicoId: 2,
            nome: 'Reports Engine',
            totais: {
              energiaKwh: 0.001,
              emissaoGCo2e: 0.9,
              cpuMedia: 22,
              memoriaMediaMb: 1024,
              coletasValidas: 2,
            },
            serie: [
              {
                inicio: '2026-11-10T00:00:00.000Z',
                energiaKwh: 0.001,
                emissaoGCo2e: 0.9,
              },
            ],
          },
        ],
      },
    }),
  );

  await page.goto('/comparar?servicos=1,2');
  const totais = page.getByRole('region', {
    name: 'Totais dos serviços comparados',
  });
  await expect(
    totais.getByRole('link', { name: 'Como calculamos?' }),
  ).toHaveCount(2);

  const tabela = page.getByRole('region', {
    name: 'Tabela de indicadores por serviço',
  });
  await expect(
    tabela.getByRole('link', { name: 'Como calculamos?' }),
  ).toHaveCount(3);
  await expect(
    tabela.getByRole('row', { name: /Energia total/ }).getByRole('link', {
      name: 'Como calculamos?',
    }),
  ).toBeVisible();
  await expect(
    tabela.getByRole('row', { name: /CO₂e total/ }).getByRole('link', {
      name: 'Como calculamos?',
    }),
  ).toBeVisible();
  await expect(
    tabela
      .getByRole('row', { name: /Intensidade de carbono/ })
      .getByRole('link', { name: 'Como calculamos?' }),
  ).toBeVisible();

  const axeComparacao = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(axeComparacao.violations).toEqual([]);

  await tabela.getByRole('link', { name: 'Como calculamos?' }).first().click();
  await expect(page).toHaveURL(/\/metodologia$/);
  await expect(
    page.getByRole('heading', { level: 1, name: 'Como calculamos' }),
  ).toBeVisible();
});
