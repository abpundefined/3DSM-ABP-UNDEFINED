import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { rankingDemo } from '../../src/mocks/ranking';

const serieComUltrapassagem = {
  periodo: {
    inicio: '2026-11-11T03:00:00.000Z',
    fim: '2026-11-11T06:00:00.000Z',
  },
  granularidade: 'hora',
  intervalos: [
    '2026-11-11T03:00:00.000Z',
    '2026-11-11T04:00:00.000Z',
    '2026-11-11T05:00:00.000Z',
  ],
  global: [
    { inicio: '2026-11-11T03:00:00.000Z', energiaKwh: 1, emissaoGCo2e: 15 },
    { inicio: '2026-11-11T04:00:00.000Z', energiaKwh: 2, emissaoGCo2e: 35 },
    { inicio: '2026-11-11T05:00:00.000Z', energiaKwh: 3, emissaoGCo2e: 60 },
  ],
  servicos: [
    {
      servicoId: 1,
      nome: 'API Alpha',
      serie: [
        {
          inicio: '2026-11-11T03:00:00.000Z',
          energiaKwh: 0.5,
          emissaoGCo2e: 10,
        },
        {
          inicio: '2026-11-11T04:00:00.000Z',
          energiaKwh: 0.2,
          emissaoGCo2e: 5,
        },
        {
          inicio: '2026-11-11T05:00:00.000Z',
          energiaKwh: 0.2,
          emissaoGCo2e: 5,
        },
      ],
    },
    {
      servicoId: 2,
      nome: 'Worker Beta',
      serie: [
        {
          inicio: '2026-11-11T03:00:00.000Z',
          energiaKwh: 0.2,
          emissaoGCo2e: 5,
        },
        {
          inicio: '2026-11-11T04:00:00.000Z',
          energiaKwh: 1.5,
          emissaoGCo2e: 30,
        },
        {
          inicio: '2026-11-11T05:00:00.000Z',
          energiaKwh: 2.5,
          emissaoGCo2e: 55,
        },
      ],
    },
  ],
};

async function simularApisRankingEEvolucao(page: Page) {
  await page.route('**/api/ranking**', (route) =>
    route.fulfill({ json: rankingDemo('energia') }),
  );
  await page.route('**/api/indicadores/serie**', (route) =>
    route.fulfill({ json: serieComUltrapassagem }),
  );
}

test('modo Evolução usa série existente, reordena barras pela emissão acumulada e permite pausar/navegar', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await simularApisRankingEEvolucao(page);

  await page.goto('/ranking?periodo=24h');
  await page.getByRole('button', { name: 'Evolução', exact: true }).click();
  await expect(page).toHaveURL(/\/ranking\?periodo=24h&modo=evolucao$/);

  // Sem reprodução automática com prefers-reduced-motion
  await expect(page.getByRole('button', { name: 'Reproduzir' })).toBeVisible();
  await expect(page.getByTestId('corrida-data-atual')).toHaveText(
    '11/11/2026, 00:00',
  );
  await expect(page.locator('.corrida-item').first()).toContainText(
    'API Alpha',
  );

  // Controle deslizante avança para o quadro 2 onde Worker Beta ultrapassa API Alpha
  const slider = page.getByRole('slider', { name: 'Quadro da evolução' });
  await slider.fill('1');
  await expect(page.getByTestId('corrida-data-atual')).toHaveText(
    '11/11/2026, 01:00',
  );
  await expect(page.locator('.corrida-item').first()).toContainText(
    'Worker Beta',
  );

  // Avança para o último quadro e volta ao início
  await slider.fill('2');
  await expect(page.getByTestId('corrida-data-atual')).toHaveText(
    '11/11/2026, 02:00',
  );
  await page.getByRole('button', { name: 'Início' }).click();
  await expect(slider).toHaveValue('0');
  await expect(page.locator('.corrida-item').first()).toContainText(
    'API Alpha',
  );
});

for (const theme of ['light', 'dark']) {
  test(`modo Evolução sem violações do Axe no tema ${theme}`, async ({
    page,
  }) => {
    await page.addInitScript((value) => {
      localStorage.setItem('greener-theme', value);
    }, theme);
    await page.goto('/ranking?demo=1&modo=evolucao');
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
    await expect(page.getByTestId('corrida-data-atual')).toBeVisible();

    const result = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    expect(result.violations).toEqual([]);
  });
}
