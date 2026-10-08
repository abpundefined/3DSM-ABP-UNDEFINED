import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('demonstração tem gráficos interativos, dados coerentes e nenhum acesso à API', async ({
  page,
}) => {
  const apiRequests: string[] = [];
  page.on('request', (request) => {
    if (request.url().includes('/api/')) apiRequests.push(request.url());
  });
  await page.goto('/');
  await page.getByRole('link', { name: 'Ver demonstração' }).click();
  await expect(page).toHaveURL(/\?demo=1$/);
  await expect(page).toHaveTitle('Dashboard · demonstração | GreenER');
  await expect(page.getByLabel('Modo de visualização')).toContainText(
    'Dados fictícios',
  );
  const metrics = page.getByLabel('Indicadores gerais');
  await expect(metrics).toContainText('14,85');
  await expect(metrics).toContainText('1,26');
  await expect(metrics).toContainText(
    '10 ativos · 1 indisponível · 1 sem métricas',
  );
  await expect(
    page.getByRole('heading', { name: 'Status dos serviços' }),
  ).toBeVisible();
  await expect(page.locator('.trend-summary')).toContainText('94,65');
  await page.getByRole('button', { name: 'Emissões', exact: true }).click();
  await expect(page.locator('.trend-summary')).toContainText('7,96');
  await expect(page.locator('.trend-readout')).toContainText('1,26 kgCO₂e');
  await page.getByText('Ver valores do gráfico', { exact: true }).click();
  await expect(
    page.getByRole('table', { name: 'Dados fictícios diários de emissões' }),
  ).toBeVisible();
  await page.getByLabel('Ordenar por').selectOption('energyKwh');
  await expect(
    page.locator('.ranking-list').getByRole('listitem').first(),
  ).toContainText('4,12');
  await expect(page.locator('.ranking-insight')).toContainText('27,7%');
  await page.getByLabel('Buscar serviço', { exact: true }).fill('Auth');
  await expect(page.locator('.service-table tbody tr')).toHaveCount(1);
  await expect(page.locator('.service-table')).toContainText('Auth Service');
  await page.getByLabel('Buscar serviço', { exact: true }).fill('');
  await page.getByLabel('Filtrar por status').selectOption('unavailable');
  await expect(page.locator('.service-table tbody tr')).toHaveCount(1);
  await expect(page.locator('.service-table')).toContainText('Payment Worker');
  await page.getByLabel('Buscar serviço', { exact: true }).fill('inexistente');
  await expect(
    page.getByRole('heading', { name: 'Nenhum serviço encontrado' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Limpar filtros' }).click();
  await expect(page.locator('.service-table tbody tr')).toHaveCount(12);
  await page.reload();
  await expect(page.getByLabel('Modo de visualização')).toContainText(
    'Dados fictícios',
  );
  await page.getByRole('link', { name: 'Voltar ao estado vazio' }).click();
  await expect(
    page.getByRole('heading', { name: 'Seu monitoramento começa aqui' }),
  ).toBeVisible();
  expect(apiRequests).toEqual([]);
});

test('demonstração é acessível e responsiva', async ({ page }, testInfo) => {
  await page.goto('/?demo=1');
  await page.getByRole('heading', { name: 'Top 5 serviços' }).waitFor();
  await page.evaluate(() => document.fonts.ready);
  const result = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(result.violations).toEqual([]);
  for (const width of [360, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  }
  await page.setViewportSize(
    testInfo.project.name === 'mobile'
      ? { width: 390, height: 844 }
      : { width: 1440, height: 1100 },
  );
  await page.screenshot({
    path: testInfo.outputPath('demo.png'),
    fullPage: true,
  });
});
