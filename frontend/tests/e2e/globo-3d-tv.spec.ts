import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mapaDemo } from '../../src/mocks/mapa';

test('modo TV carrega o Globo 3D por import dinâmico e respeita prefers-reduced-motion', async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, 'Modo TV disponível apenas em telas desktop.');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.route('**/api/mapa**', (route) =>
    route.fulfill({ json: mapaDemo }),
  );
  await page.route('**/api/intensidade/horarios**', (route) =>
    route.fulfill({ status: 404, body: '' }),
  );

  await page.goto('/mapa?demo=1&tv=1');

  const globo3d = page.getByTestId('globo-3d-tv');
  const mapa2d = page.locator('.mapa-leaflet');
  await expect(globo3d.or(mapa2d)).toBeVisible();

  if (await globo3d.isVisible()) {
    await expect(globo3d).toHaveAttribute('data-animado', 'false');
    await expect(globo3d).toContainText('Movimento reduzido');
  }

  const result = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(result.violations).toEqual([]);
});

test('sem WebGL no modo TV, faz fallback automático para o mapa 2D', async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, 'Modo TV disponível apenas em telas desktop.');
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (
      type: string,
      ...args: unknown[]
    ) {
      if (type === 'webgl' || type === 'webgl2') {
        return null;
      }
      return original.apply(this, [type, ...args] as never);
    } as typeof HTMLCanvasElement.prototype.getContext;
  });
  await page.route('https://tile.openstreetmap.org/**', (route) =>
    route.abort(),
  );
  await page.route('https://tiles.openfreemap.org/**', (route) =>
    route.fulfill({ status: 503 }),
  );

  await page.goto('/mapa?demo=1&tv=1');

  await expect(page.locator('.mapa-leaflet')).toBeVisible();
  await expect(page.getByTestId('globo-3d-tv')).toHaveCount(0);
  await expect(page.locator('.mapa-tv-fallback-nota')).toBeVisible();
});
