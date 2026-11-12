import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const pages = [
  { path: '/ranking', heading: 'Ranking' },
  { path: '/comparar', heading: 'Comparar serviços' },
  { path: '/mapa', heading: 'Mapa de emissões' },
  { path: '/servicos/7', heading: 'Serviço 7' },
  { path: '/admin', heading: 'Administração' },
  { path: '/metodologia', heading: 'Como calculamos' },
];

for (const { path, heading } of pages) {
  test(`página ${path} abre sem erro e sem violação do Axe`, async ({
    page,
  }) => {
    const failures: string[] = [];
    page.on('pageerror', (error) => failures.push(error.message));
    await page.goto(path);
    await expect(
      page.getByRole('heading', { level: 1, name: heading }),
    ).toBeVisible();
    await expect(page).toHaveTitle(`${heading} | GreenER`);
    const result = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    expect(result.violations).toEqual([]);
    expect(failures).toEqual([]);
  });
}

test('menu leva a todas as páginas e marca a página atual', async (
  { page },
  testInfo,
) => {
  const menuName =
    testInfo.project.name === 'mobile'
      ? 'Navegação inferior'
      : 'Navegação principal';
  await page.goto('/');
  const menu = page.getByRole('navigation', { name: menuName });
  for (const label of ['Ranking', 'Comparar', 'Mapa', 'Metodologia']) {
    await menu.getByRole('link', { name: label, exact: true }).click();
    await expect(
      menu.getByRole('link', { name: label, exact: true }),
    ).toHaveAttribute('aria-current', 'page');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  }
  await expect(
    menu.getByRole('link', { name: 'Admin', exact: true }),
  ).toHaveCount(0);
});

test('Admin aparece no menu só para usuário autenticado', async (
  { page },
  testInfo,
) => {
  const menuName =
    testInfo.project.name === 'mobile'
      ? 'Navegação inferior'
      : 'Navegação principal';
  await page.addInitScript(() => {
    localStorage.setItem('@greener-abp:token', 'token-salvo');
  });
  await page.goto('/metodologia');
  const menu = page.getByRole('navigation', { name: menuName });
  await menu.getByRole('link', { name: 'Admin', exact: true }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await expect(
    page.getByRole('heading', { level: 1, name: 'Administração' }),
  ).toBeVisible();
});

test('gráfico de exemplo mostra a unidade e funciona com ?demo=1', async ({
  page,
}) => {
  await page.goto('/ranking?demo=1');
  const chart = page.locator('.chart-example');
  await expect(chart).toContainText('Wh');
  await expect(chart.locator('.recharts-bar-rectangle')).toHaveCount(3);
});

test('barra inferior não cobre o fim da página no celular', async (
  { page },
  testInfo,
) => {
  test.skip(testInfo.project.name !== 'mobile', 'Só existe no celular');
  await page.goto('/metodologia');
  await page.setViewportSize({ width: 375, height: 667 });
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  const footer = await page.locator('.site-footer').boundingBox();
  const bar = await page
    .getByRole('navigation', { name: 'Navegação inferior' })
    .boundingBox();
  expect(footer && bar).toBeTruthy();
  expect(footer!.y + footer!.height).toBeLessThanOrEqual(bar!.y + 1);
});
