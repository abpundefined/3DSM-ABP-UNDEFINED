import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function mockDashboardComMeta(
  page: Page,
  meta: {
    metaMensal: number;
    acumuladoMes: number;
    diasDecorridos: number;
    diasNoMes: number;
    projecaoMes: number;
  },
) {
  await page.addInitScript(() => {
    localStorage.setItem('greener-tour-visto', '1');
  });
  await page.route('**/api/servicos', (route) => route.fulfill({ json: [] }));
  await page.route('**/api/configuracao', (route) =>
    route.fulfill({ json: { intervaloColetaSegundos: 60 } }),
  );
  await page.route('**/api/indicadores**', (route) =>
    route.fulfill({
      json: {
        energiaTotalKwh: 2,
        emissaoTotalGCo2e: 800,
        servicos: {
          disponiveis: 1,
          indisponiveis: 0,
          semMetricas: 0,
          removidos: 0,
        },
      },
    }),
  );
  await page.route('**/api/indicadores/serie**', (route) =>
    route.fulfill({
      json: {
        periodo: {
          inicio: '2026-11-01T00:00:00Z',
          fim: '2026-11-20T00:00:00Z',
        },
        granularidade: 'dia',
        intervalos: [],
        global: [],
        servicos: [],
      },
    }),
  );
  await page.route('**/api/indicadores/meta', (route) =>
    route.fulfill({ json: meta }),
  );
}

for (const caso of [
  {
    nome: 'abaixo da meta (floresce)',
    estado: 'abaixo',
    meta: {
      metaMensal: 50,
      acumuladoMes: 20,
      diasDecorridos: 15,
      diasNoMes: 30,
      projecaoMes: 40,
    },
    esperado:
      'Planeta florescendo: abaixo da meta de carbono (40,0% da meta utilizada).',
  },
  {
    nome: 'perto da meta (atenção)',
    estado: 'perto',
    meta: {
      metaMensal: 50,
      acumuladoMes: 42,
      diasDecorridos: 25,
      diasNoMes: 30,
      projecaoMes: 50.4,
    },
    esperado:
      'Planeta em atenção: perto da meta de carbono (84,0% da meta utilizada).',
  },
  {
    nome: 'acima da meta (murcha)',
    estado: 'acima',
    meta: {
      metaMensal: 50,
      acumuladoMes: 60,
      diasDecorridos: 20,
      diasNoMes: 30,
      projecaoMes: 90,
    },
    esperado:
      'Planeta murcho: acima da meta de carbono (120,0% da meta utilizada).',
  },
]) {
  test(`planeta reage ao estado ${caso.nome} e passa no Axe`, async ({
    page,
  }) => {
    await mockDashboardComMeta(page, caso.meta);
    await page.goto('/');

    const planeta = page.getByTestId('planeta-meta-carbono');
    await expect(planeta).toBeVisible({ timeout: 10_000 });
    await expect(planeta).toHaveAttribute('data-estado-planeta', caso.estado);
    await expect(page.getByRole('img', { name: caso.esperado })).toBeVisible();

    const result = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    expect(result.violations).toEqual([]);
  });
}

test('planeta no modo escuro e com movimento reduzido sem violações do Axe', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => {
    localStorage.setItem('greener-theme', 'dark');
    localStorage.setItem('greener-tour-visto', '1');
  });
  await page.goto('/?demo=1');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.getByTestId('planeta-meta-carbono')).toBeVisible();

  const result = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(result.violations).toEqual([]);
});
