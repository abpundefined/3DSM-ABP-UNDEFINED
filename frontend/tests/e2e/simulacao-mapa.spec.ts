import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { horariosDemo } from '../../src/mocks/horarios';
import { mapaDemo } from '../../src/mocks/mapa';

const estiloDeTeste = {
  version: 8,
  sources: {},
  layers: [
    {
      id: 'fundo',
      type: 'background',
      paint: { 'background-color': '#dfe8e1' },
    },
  ],
};

async function configurarMapa(page: Page) {
  const mutacoes: string[] = [];
  await page.route('https://tile.openstreetmap.org/**', (route) =>
    route.abort(),
  );
  await page.route('https://tiles.openfreemap.org/**', (route) =>
    route.fulfill({ json: estiloDeTeste }),
  );
  await page.route('**/api/**', (route) => {
    const metodo = route.request().method();
    if (metodo !== 'GET' && metodo !== 'HEAD') {
      mutacoes.push(`${metodo} ${route.request().url()}`);
    }
    if (route.request().url().includes('/api/mapa')) {
      return route.fulfill({ json: mapaDemo });
    }
    if (route.request().url().includes('/api/intensidade/horarios')) {
      return route.fulfill({ json: horariosDemo(null) });
    }
    return route.continue();
  });
  return mutacoes;
}

test('modo Simular permite escolher serviço e região pela lista, mostra diferença em g e % e permite desfazer sem alterar dados reais', async ({
  page,
}) => {
  const mutacoes = await configurarMapa(page);
  await page.goto('/mapa');

  const botaoSimular = page.getByRole('button', {
    name: 'Simular',
    exact: true,
  });
  await expect(botaoSimular).toBeVisible();
  await botaoSimular.click();

  await expect(botaoSimular).toHaveAttribute('aria-pressed', 'true');
  const painel = page.getByRole('region', { name: 'Modo simulação no mapa' });
  await expect(painel).toBeVisible();
  await expect(painel).toContainText('Simulação');
  await expect(painel).toContainText('nenhum dado real é alterado');

  await painel.getByLabel('Serviço').selectOption('8');
  await painel.getByLabel('Mover para região').selectOption('ca-central');
  await painel.getByRole('button', { name: 'Simular mudança' }).click();

  const status = painel.getByRole('status');
  await expect(status).toContainText('Media CDN');
  await expect(status).toContainText('Japão · Tóquio → Canadá · Toronto');
  await expect(status).toContainText(/−\d+,\d+ gCO₂e/);
  await expect(status).toContainText('−91,3%');

  // Tabela real de dados do mapa continua com a região original do serviço
  await page.getByText('Ver os dados do mapa em tabela').click();
  await expect(page.getByRole('row', { name: /Media CDN/ })).toContainText(
    'Japão · Tóquio',
  );

  await painel.getByRole('button', { name: 'Desfazer' }).click();
  await expect(status).toContainText('Nenhuma mudança simulada ainda');
  expect(mutacoes).toEqual([]);
});

test('arrastar marcador no mapa até outra região monitorada recalcula a emissão e permite desfazer', async ({
  page,
}) => {
  const mutacoes = await configurarMapa(page);
  await page.goto('/mapa?visao=mapa');

  await page.getByRole('button', { name: 'Simular', exact: true }).click();
  await page.locator('.mapa-leaflet').scrollIntoViewIfNeeded();

  const marcadorToquio = page
    .locator('.mapa-marcador-arrastavel')
    .filter({ has: page.locator('[data-servico-id="8"]') });
  const alvoToronto = page.locator('[data-regiao-alvo="ca-central"]');

  await expect(marcadorToquio).toBeVisible();
  await expect(alvoToronto).toBeVisible();

  const origemBox = await marcadorToquio.boundingBox();
  const destinoBox = await alvoToronto.boundingBox();
  if (!origemBox || !destinoBox) {
    throw new Error('Marcador ou região de destino fora da área visível.');
  }

  await page.mouse.move(
    origemBox.x + origemBox.width / 2,
    origemBox.y + origemBox.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(
    destinoBox.x + destinoBox.width / 2,
    destinoBox.y + destinoBox.height / 2,
    { steps: 12 },
  );
  await page.mouse.up();

  const painel = page.getByRole('region', { name: 'Modo simulação no mapa' });
  const status = painel.getByRole('status');
  await expect(status).toContainText('Media CDN');
  await expect(status).toContainText('Japão · Tóquio → Canadá · Toronto');
  await expect(status).toContainText(/−\d+,\d+ gCO₂e/);
  await expect(status).toContainText('−91,3%');

  await painel.getByRole('button', { name: 'Desfazer' }).click();
  await expect(status).toContainText('Nenhuma mudança simulada ainda');
  expect(mutacoes).toEqual([]);
});

test('modo Simular passa no Axe em tema claro e escuro e não causa rolagem horizontal em 375 px', async ({
  page,
}) => {
  await configurarMapa(page);
  await page.goto('/mapa?visao=mapa');
  await page.getByRole('button', { name: 'Simular', exact: true }).click();

  const painel = page.getByRole('region', { name: 'Modo simulação no mapa' });
  await painel.getByLabel('Serviço').selectOption('8');
  await painel.getByLabel('Mover para região').selectOption('ca-central');
  await painel.getByRole('button', { name: 'Simular mudança' }).click();
  await expect(painel.getByRole('status')).toContainText('−91,3%');

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
