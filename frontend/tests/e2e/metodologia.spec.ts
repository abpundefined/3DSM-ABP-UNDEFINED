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
    'Selo de eficiência (A a F)',
  );
  await expect(page.locator('.methodology-page')).toContainText(
    'média + 3 desvios-padrão',
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
