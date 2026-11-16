import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { simulacaoDemo } from '../../src/mocks/simulacao';

async function simularApi(page: Page, status = 200) {
  const chamadas: string[] = [];
  await page.route('**/api/servicos/4/simulacao-regiao**', (route) => {
    chamadas.push(route.request().url());
    return status === 200
      ? route.fulfill({ json: simulacaoDemo(4) })
      : route.fulfill({
          status,
          json: { statusCode: status, message: 'Serviço não encontrado.' },
        });
  });
  return chamadas;
}

test('sugere a região de menor emissão e mostra a diferença em g e em %', async ({
  page,
}) => {
  await simularApi(page);
  await page.goto('/servicos/4');

  const secao = page.getByRole('region', {
    name: 'E se rodasse em outra região?',
  });
  await expect(secao).toBeVisible();
  await expect(
    secao.getByRole('radio', { name: /Canadá \(Ontário\).*Menor emissão/ }),
  ).toBeChecked();
  await expect(
    secao.getByText(
      /a menos \(−\d+(,\d)?%\) que em Estados Unidos \(Virgínia\)/,
    ),
  ).toBeVisible();
  await expect(
    secao.getByRole('radio', {
      name: /Estados Unidos \(Virgínia\).*Região atual/,
    }),
  ).toBeVisible();
  await expect(
    secao.getByRole('radio', { name: /Irlanda.*sem dados no período/ }),
  ).toBeDisabled();
  await expect(
    secao.getByRole('link', { name: 'Como calculamos' }),
  ).toHaveAttribute('href', '/metodologia');
});

test('troca de região pelo teclado e atualiza o resultado', async ({
  page,
}) => {
  await simularApi(page);
  await page.goto('/servicos/4');

  const canada = page.getByRole('radio', { name: /Canadá/ });
  await canada.focus();
  await page.keyboard.press('ArrowDown');

  await expect(page.getByRole('radio', { name: /Brasil/ })).toBeChecked();
  await expect(
    page.getByText(/^Emissão estimada em Brasil \(Sudeste\):/),
  ).toBeVisible();

  await page.keyboard.press('ArrowDown');
  await expect(
    page.getByRole('radio', { name: /Estados Unidos/ }),
  ).toBeChecked();
  await expect(page.getByText('É a região atual do serviço.')).toBeVisible();
});

test('envia o período escolhido para a API', async ({ page }) => {
  const chamadas = await simularApi(page);
  await page.goto('/servicos/4?periodo=7d');

  await expect(page.getByRole('radio', { name: /Canadá/ })).toBeChecked();
  expect(chamadas.some((url) => url.includes('periodo=7d'))).toBe(true);
});

test('mostra mensagem clara quando o serviço não existe', async ({ page }) => {
  await simularApi(page, 404);
  await page.goto('/servicos/4');

  await expect(page.getByRole('alert')).toContainText(
    'Serviço não encontrado.',
  );
});

test('funciona no modo demonstração sem chamar o backend', async ({ page }) => {
  const chamadas: string[] = [];
  await page.route('**/api/**', (route) => {
    chamadas.push(route.request().url());
    return route.abort();
  });
  await page.goto('/servicos/4?demo=1');

  await expect(page.getByRole('radio', { name: /Canadá/ })).toBeChecked();
  await expect(
    page.getByRole('link', { name: 'Como calculamos' }),
  ).toHaveAttribute('href', '/metodologia?demo=1');
  expect(chamadas.filter((url) => url.includes('simulacao-regiao'))).toEqual(
    [],
  );
});

for (const tema of ['light', 'dark']) {
  test(`simulador sem violação do Axe no tema ${tema}`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.addInitScript(
      (valor) => localStorage.setItem('greener-theme', valor),
      tema,
    );
    await simularApi(page);
    await page.goto('/servicos/4');
    await expect(page.locator('html')).toHaveAttribute('data-theme', tema);
    await expect(page.getByRole('radio', { name: /Canadá/ })).toBeChecked();

    const resultado = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    expect(resultado.violations).toEqual([]);
  });
}
