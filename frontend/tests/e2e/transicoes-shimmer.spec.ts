import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { rankingDemo } from '../../src/mocks/ranking';

test('exibe esqueletos com shimmer nos cards, gráficos e tabelas durante carregamento e passa no Axe', async ({
  page,
}) => {
  let releaseRanking: (() => Promise<void>) | undefined;
  await page.route(
    '**/api/ranking**',
    (route) =>
      new Promise<void>((resolve) => {
        releaseRanking = async () => {
          await route.fulfill({ json: rankingDemo('energia') });
          resolve();
        };
      }),
  );

  await page.goto('/ranking');

  const skeleton = page.locator('.loading-skeleton--table');
  await expect(skeleton).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Carregando o ranking' }),
  ).toHaveClass(/skeleton-sr-only/);

  const shimmerAnimation = await skeleton
    .locator('.skeleton-block')
    .first()
    .evaluate((el) => getComputedStyle(el).animationName);
  expect(shimmerAnimation).toBe('greener-skeleton-shimmer');

  const axeLoading = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(axeLoading.violations).toEqual([]);

  await releaseRanking?.();
  await expect(
    page.getByRole('region', { name: 'Tabela do ranking' }),
  ).toBeVisible();
});

test('desliga shimmer e View Transitions quando prefers-reduced-motion está ativo', async ({
  page,
  isMobile,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => {
    (window as unknown as { __vtCalls?: number }).__vtCalls = 0;
    const original = document.startViewTransition?.bind(document);
    document.startViewTransition = ((cb: () => void) => {
      (window as unknown as { __vtCalls: number }).__vtCalls += 1;
      return original ? original(cb) : cb();
    }) as typeof document.startViewTransition;
  });

  await page.addInitScript(() => {
    localStorage.setItem('greener-tour-visto', '1');
  });
  await page.route('**/api/ranking**', () => new Promise(() => {}));
  await page.goto('/');

  await page
    .getByRole('navigation', {
      name: isMobile ? 'Navegação inferior' : 'Navegação principal',
    })
    .getByRole('link', { name: 'Ranking' })
    .click();
  await expect(page).toHaveURL(/\/ranking/);

  const vtCalls = await page.evaluate(
    () => (window as unknown as { __vtCalls?: number }).__vtCalls ?? 0,
  );
  expect(vtCalls).toBe(0);

  const animationName = await page
    .locator('.loading-skeleton--table .skeleton-block')
    .first()
    .evaluate((el) => getComputedStyle(el).animationName);
  expect(animationName).toBe('none');

  const axeReduced = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(axeReduced.violations).toEqual([]);
});

test('usa View Transitions API ao navegar entre rotas sem atraso e faz fallback quando ausente', async ({
  page,
  isMobile,
}) => {
  await page.addInitScript(() => {
    (window as unknown as { __vtCalls?: number }).__vtCalls = 0;
    const original = document.startViewTransition?.bind(document);
    document.startViewTransition = ((cb: () => void) => {
      (window as unknown as { __vtCalls: number }).__vtCalls += 1;
      return original ? original(cb) : cb();
    }) as typeof document.startViewTransition;
  });

  await page.goto('/?demo=1');
  await page
    .getByRole('navigation', {
      name: isMobile ? 'Navegação inferior' : 'Navegação principal',
    })
    .getByRole('link', { name: 'Metodologia' })
    .click();
  await expect(page).toHaveURL(/\/metodologia/);
  await expect(
    page.getByRole('heading', { level: 1, name: /Como calculamos/i }),
  ).toBeVisible();

  const vtCalls = await page.evaluate(
    () => (window as unknown as { __vtCalls?: number }).__vtCalls ?? 0,
  );
  expect(vtCalls).toBeGreaterThanOrEqual(1);

  const axeRoute = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(axeRoute.violations).toEqual([]);
});
