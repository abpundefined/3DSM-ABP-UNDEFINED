import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('modo TV exibe QR code com link escrito embaixo sem violações do Axe', async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, 'Modo TV disponível apenas em telas desktop.');
  await page.goto('/?demo=1&tv=1');

  const barraTv = page.getByLabel('Status do modo TV');
  await expect(barraTv).toBeVisible();
  await expect(
    barraTv.getByRole('img', {
      name: /QR code para acessar a demonstração online/i,
    }),
  ).toBeVisible();
  await expect(barraTv).toContainText('Acesse no celular');
  await expect(barraTv).toContainText(
    'abpundefined.github.io/3DSM-ABP-UNDEFINED',
  );

  const axeClaro = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(axeClaro.violations).toEqual([]);
});

test('página /qr-code exibe cartaz imprimível, passa no Axe em claro/escuro e não faz chamadas ao backend', async ({
  page,
}) => {
  const chamadasApi: string[] = [];
  await page.route('**/api/**', (route) => {
    chamadasApi.push(route.request().url());
    return route.abort();
  });

  await page.goto('/qr-code');

  await expect(
    page.getByRole('heading', { name: 'QR Code da demonstração' }),
  ).toBeVisible();
  await expect(
    page.getByRole('img', {
      name: /QR code para acessar a demonstração online/i,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole('link', {
      name: 'abpundefined.github.io/3DSM-ABP-UNDEFINED',
    }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Imprimir cartaz' }),
  ).toBeVisible();
  expect(chamadasApi).toEqual([]);

  const axeClaro = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(axeClaro.violations).toEqual([]);

  await page.evaluate(() => {
    document.documentElement.setAttribute('data-theme', 'dark');
  });
  const axeEscuro = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(axeEscuro.violations).toEqual([]);

  await page.setViewportSize({ width: 375, height: 800 });
  const larguras = await page.evaluate(() => ({
    pagina: document.documentElement.scrollWidth,
    tela: document.documentElement.clientWidth,
  }));
  expect(larguras.pagina).toBe(larguras.tela);
});

test('modo demonstração em /comparar funciona sem chamadas ao backend', async ({
  page,
}) => {
  const chamadasApi: string[] = [];
  await page.route('**/api/**', (route) => {
    chamadasApi.push(route.request().url());
    return route.abort();
  });

  await page.goto('/comparar?demo=1&servicos=1,8');

  await expect(
    page.getByRole('heading', { name: 'Comparar serviços' }),
  ).toBeVisible();
  await expect(page.getByText('Auth Service').first()).toBeVisible();
  await expect(page.getByText('Media CDN').first()).toBeVisible();
  expect(chamadasApi).toEqual([]);
});
