import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('abre automaticamente só na primeira visita, persiste no localStorage e reabre pelo rodapé', async ({
  page,
}) => {
  await page.route('**/api/servicos', (route) => route.fulfill({ json: [] }));
  await page.route('**/api/indicadores**', (route) =>
    route.fulfill({
      json: {
        energiaTotalKwh: 0,
        emissaoTotalGCo2e: 0,
        servicos: {
          disponiveis: 0,
          indisponiveis: 0,
          semMetricas: 0,
          removidos: 0,
        },
      },
    }),
  );

  await page.goto('/');

  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(
    dialog.getByRole('heading', { name: 'Seletor de período' }),
  ).toBeVisible();

  // Percorre todos os passos disponíveis (pulando passos ausentes sem erro)
  while (await dialog.getByRole('button', { name: 'Próximo' }).isVisible()) {
    await dialog.getByRole('button', { name: 'Próximo' }).click();
  }
  await dialog.getByRole('button', { name: 'Concluir' }).click();
  await expect(dialog).toHaveCount(0);

  // Recarrega e confirma que não abre sozinho novamente
  await page.reload();
  await expect(
    page.getByRole('heading', { level: 1, name: 'Dashboard' }),
  ).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);

  // Reabre pelo botão "Fazer tour" no rodapé com foco gerenciado e fecha com Esc
  const botaoTour = page
    .getByRole('contentinfo')
    .getByRole('button', { name: 'Fazer tour' });
  await botaoTour.click();
  await expect(dialog).toBeVisible();
  await expect(dialog).toBeFocused();

  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(botaoTour).toBeFocused();
});

for (const theme of ['light', 'dark']) {
  test(`tour guiado sem violações do Axe no tema ${theme}`, async ({
    page,
  }) => {
    await page.addInitScript((value) => {
      localStorage.setItem('greener-theme', value);
    }, theme);
    await page.goto('/?demo=1');
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
    await expect(page.getByRole('dialog')).toBeVisible();

    const result = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    expect(result.violations).toEqual([]);
  });
}
