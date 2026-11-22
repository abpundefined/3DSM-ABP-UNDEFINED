import { test, expect } from '@playwright/test';
import { rankingDemo } from '../../src/mocks/ranking';

test('baixa o CSV do ranking pelo botão de exportação', async ({ page }) => {
  await page.route('**/api/ranking**', (route) =>
    route.fulfill({ json: rankingDemo('energia') }),
  );
  await page.goto('/ranking');

  await expect(
    page.getByRole('heading', { name: 'Ranking', exact: true }),
  ).toBeVisible();
  const botaoExportar = page.getByRole('button', { name: 'Exportar CSV' });
  await expect(botaoExportar).toBeEnabled();

  const downloadPromise = page.waitForEvent('download');
  await botaoExportar.click();
  const download = await downloadPromise;
  const nomeArquivo = download.suggestedFilename();

  expect(nomeArquivo).toContain('greener-ranking');
  expect(nomeArquivo).toContain('.csv');
});
