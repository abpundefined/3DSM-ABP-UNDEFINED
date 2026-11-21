import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { demoTotals } from '../../src/mocks/dashboard';
import { formatServiceCounter } from '../../src/utils/serviceCounter';

const THEME_KEY = 'greener-theme';

const servicos = [
  {
    id: 1,
    idExterno: 'api-ativa',
    nome: 'API Ativa',
    regiaoCodigo: 'br-sudeste',
    estadoAtual: 'DISPONIVEL',
  },
  {
    id: 2,
    idExterno: 'worker-parado',
    nome: 'Worker Parado',
    regiaoCodigo: 'br-sudeste',
    estadoAtual: 'INDISPONIVEL',
  },
  {
    id: 3,
    idExterno: 'fila-nova',
    nome: 'Fila Nova',
    regiaoCodigo: 'br-sudeste',
    estadoAtual: 'SEM_METRICAS',
  },
  {
    id: 4,
    idExterno: 'cron-removido',
    nome: 'Cron Removido',
    regiaoCodigo: 'br-sudeste',
    estadoAtual: 'REMOVIDO',
  },
];

const coletas: Record<number, string> = {
  1: '2026-11-15T14:00:00.000Z',
  2: '2026-11-12T09:30:00.000Z',
};

async function dashboardComEstados(page: Page) {
  await page.route('**/api/servicos', (route) =>
    route.fulfill({ json: servicos }),
  );
  await page.route('**/api/indicadores*', (route) =>
    route.fulfill({
      json: {
        energiaTotalKwh: 0.5,
        emissaoTotalGCo2e: 120,
        servicos: {
          disponiveis: 1,
          indisponiveis: 1,
          semMetricas: 1,
          removidos: 1,
        },
      },
    }),
  );
  await page.route('**/api/configuracao', (route) =>
    route.fulfill({ json: { intervaloColetaSegundos: 30 } }),
  );
  await page.route('**/api/coletas/servico/*/ultima-valida', (route) => {
    const id = Number(
      route.request().url().split('/servico/')[1].split('/')[0],
    );
    const iniciadaEm = coletas[id];
    return iniciadaEm
      ? route.fulfill({
          json: {
            dados: {
              iniciadaEm,
              cpuPercent: 30,
              memoryGb: 1.5,
              energiaKwh: 0.2,
              emissaoGCo2e: 50,
            },
          },
        })
      : route.fulfill({ status: 404, json: { message: 'Sem coleta' } });
  });
}

async function semViolacoes(page: Page) {
  const resultado = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(resultado.violations).toEqual([]);
}

test('P02: cada card sem coleta válida diz o motivo e só mostra a data que existe', async ({
  page,
}) => {
  await dashboardComEstados(page);
  await page.goto('/');

  const ativo = page.getByRole('article', { name: 'API Ativa' });
  await expect(ativo).toBeVisible();
  await expect(ativo.getByText(/Sem coleta válida/)).toHaveCount(0);

  const parado = page.getByRole('article', { name: 'Worker Parado' });
  await expect(parado).toContainText('Sem coleta válida no momento');
  await expect(parado.locator('time')).toHaveAttribute(
    'datetime',
    '2026-11-12T09:30:00.000Z',
  );
  await expect(parado.locator('time')).toContainText(/^12\/11\/2026.*06:30$/);

  const nova = page.getByRole('article', { name: 'Fila Nova' });
  await expect(nova).toContainText('Sem coleta válida');
  await expect(nova).toContainText(
    'Nenhuma coleta válida foi registrada para este serviço.',
  );
  await expect(nova.locator('time')).toHaveCount(0);
});

test('P06: o topo mostra quantos serviços estão ativos entre os monitorados, sem contar os removidos', async ({
  page,
}) => {
  await dashboardComEstados(page);
  await page.goto('/');

  await expect(page.getByText('1 ativo de 3 monitorados')).toBeVisible();
});

test('P06: sem serviços ou sem resposta do backend o contador não aparece', async ({
  page,
}) => {
  await page.route('**/api/**', (route) => route.fulfill({ status: 500 }));
  await page.goto('/');

  await expect(
    page.getByRole('button', { name: 'Tentar novamente' }),
  ).toBeVisible();
  await expect(page.getByText(/ativos? de .* monitorados?/)).toHaveCount(0);
});

test('P06: dashboard conectado não exibe banner de prévia e a saída da demonstração diz para onde leva', async ({
  page,
}) => {
  await page.route('**/api/**', (route) => route.fulfill({ json: [] }));
  await page.goto('/');

  await expect(page.getByText('Explore uma prévia do dashboard')).toHaveCount(
    0,
  );
  await expect(
    page.getByRole('link', { name: 'Ver demonstração' }),
  ).toHaveCount(0);

  await page.goto('/?demo=1');

  await expect(
    page.getByText(
      formatServiceCounter({
        active: demoTotals.active,
        monitored: demoTotals.services,
      }),
    ),
  ).toBeVisible();
  const sair = page.getByRole('link', { name: 'Sair da demonstração' });
  await expect(sair).toHaveClass(/button--secondary/);
  await expect(sair).not.toHaveClass(/button--accent/);
  await expect(
    page.getByRole('link', { name: 'Voltar ao estado vazio' }),
  ).toHaveCount(0);
  await sair.click();
  await expect(page).toHaveURL(/\/$/);
});

test('P06: no celular o aviso da demonstração fica compacto e mantém o essencial', async ({
  page,
}, testInfo) => {
  await page.goto('/?demo=1');

  await expect(
    page.getByText('Modo demonstração · Dados fictícios'),
  ).toBeVisible();
  const explicacao = page.getByText(
    'Valores ilustrativos para avaliar os gráficos, os indicadores e o layout.',
  );
  if (testInfo.project.name === 'mobile') {
    await expect(explicacao).toBeHidden();
  } else {
    await expect(explicacao).toBeVisible();
  }
  await expect(
    page.getByRole('link', { name: 'Sair da demonstração' }),
  ).toBeVisible();
});

for (const tema of ['light', 'dark']) {
  test(`P02 e P06 sem violações do Axe no tema ${tema}`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.addInitScript(
      ([key, value]) => localStorage.setItem(key, value),
      [THEME_KEY, tema],
    );
    await dashboardComEstados(page);
    await page.goto('/');
    await expect(
      page.getByRole('article', { name: 'Fila Nova' }),
    ).toContainText('Sem coleta válida');
    await expect(page.locator('html')).toHaveAttribute('data-theme', tema);
    await semViolacoes(page);

    await page.goto('/?demo=1');
    await expect(page.getByText(/ativos de .* monitorados/)).toBeVisible();
    await semViolacoes(page);
  });
}
