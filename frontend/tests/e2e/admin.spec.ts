import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const TOKEN_KEY = '@greener-abp:token';

const saude = {
  geradoEm: '2026-11-17T12:00:30.000Z',
  agregador: {
    estado: 'OPERACIONAL',
    ultimaConsultaEm: '2026-11-17T12:00:00.000Z',
    tempoRespostaMs: 120,
    ultimoSucessoEm: '2026-11-17T12:00:00.000Z',
    mensagemErro: null,
  },
  apiCarbono: {
    estado: 'FALHA',
    ultimaConsultaEm: '2026-11-17T12:00:20.000Z',
    tempoRespostaMs: 8000,
    ultimoSucessoEm: '2026-11-17T11:58:30.000Z',
    mensagemErro: 'Tempo limite de 8000 ms excedido ao consultar a API.',
  },
  ultimaDescobertaEm: '2026-11-17T12:00:00.000Z',
  coletasUltimaHora: { total: 10, falhas: 1, taxaFalha: 0.1 },
  servicosPorEstado: {
    DISPONIVEL: 4,
    INDISPONIVEL: 1,
    SEM_METRICAS: 2,
    REMOVIDO: 0,
    DESCONHECIDO: 0,
  },
};

async function mockBackend(
  page: Page,
  putResponse?: { status: number; body: object },
) {
  const config = {
    intervaloColetaSegundos: 30,
    intervaloDescobertaSegundos: 60,
    atualizadaEm: null as string | null,
    padrao: true,
  };
  const puts: { authorization?: string; body: unknown }[] = [];

  await page.route('**/api/saude', (route) => route.fulfill({ json: saude }));
  await page.route('**/api/servicos', (route) => route.fulfill({ json: [] }));
  await page.route('**/api/indicadores', (route) =>
    route.fulfill({ status: 500 }),
  );
  await page.route('**/api/auth/login', (route) =>
    route.fulfill({ json: { accessToken: 'token-de-teste' } }),
  );
  await page.route('**/api/configuracao', async (route) => {
    const request = route.request();
    if (request.method() !== 'PUT') {
      return route.fulfill({ json: config });
    }
    const body = request.postDataJSON();
    puts.push({ authorization: request.headers().authorization, body });
    if (putResponse) {
      return route.fulfill({
        status: putResponse.status,
        json: putResponse.body,
      });
    }
    Object.assign(config, body, {
      atualizadaEm: '2026-11-15T13:00:00.000Z',
      padrao: false,
    });
    return route.fulfill({ json: config });
  });

  return puts;
}

async function axeViolations(page: Page) {
  const result = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  return result.violations;
}

test('login, alteração do intervalo e novo valor no dashboard', async ({
  page,
}, testInfo) => {
  const puts = await mockBackend(page);

  await page.goto('/admin');
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('alert')).toHaveText(
    'Entre para acessar a administração.',
  );
  await page.getByLabel('E-mail').fill('admin@greener.local');
  await page.getByLabel('Senha', { exact: true }).fill('senha-de-teste');
  await page.getByRole('button', { name: 'Entrar' }).click();

  await expect(page).toHaveURL(/\/admin$/);
  const coleta = page.getByLabel('Intervalo de coleta (segundos)');
  await expect(coleta).toHaveValue('30');
  await expect(
    page.getByText('Usando os valores padrão do servidor.'),
  ).toBeVisible();
  expect(await axeViolations(page)).toEqual([]);

  await coleta.fill('60');
  await page.getByRole('button', { name: 'Salvar intervalos' }).click();
  await expect(page.getByRole('status')).toHaveText(
    'Intervalos salvos. Eles passam a valer no próximo ciclo de monitoramento.',
  );
  await expect(page.getByText(/Última alteração:/)).toBeVisible();
  expect(puts).toEqual([
    {
      authorization: 'Bearer token-de-teste',
      body: { intervaloColetaSegundos: 60, intervaloDescobertaSegundos: 60 },
    },
  ]);

  const menu = page.getByRole('navigation', {
    name:
      testInfo.project.name === 'mobile'
        ? 'Navegação inferior'
        : 'Navegação principal',
  });
  await menu.getByRole('link', { name: 'Dashboard', exact: true }).click();
  await expect(
    page.getByText(
      'Coleta configurada a cada 60 segundos · painel atualizado a cada 30 segundos.',
    ),
  ).toBeVisible();
});

test('valores fora dos limites mostram o erro e não chamam a API', async ({
  page,
}) => {
  const puts = await mockBackend(page);
  await page.addInitScript(
    (key) => localStorage.setItem(key, 'token-salvo'),
    TOKEN_KEY,
  );
  await page.goto('/admin');

  const coleta = page.getByLabel('Intervalo de coleta (segundos)');
  const descoberta = page.getByLabel('Intervalo de descoberta (segundos)');
  await coleta.fill('5');
  await descoberta.fill('');
  await page.getByRole('button', { name: 'Salvar intervalos' }).click();

  await expect(
    page.getByText(
      'O intervalo de coleta deve ficar entre 10 e 3600 segundos.',
    ),
  ).toBeVisible();
  await expect(
    page.getByText('Informe o intervalo de descoberta.'),
  ).toBeVisible();
  await expect(coleta).toHaveAttribute('aria-invalid', 'true');
  await expect(coleta).toBeFocused();
  expect(puts).toEqual([]);
  expect(await axeViolations(page)).toEqual([]);
});

test('resposta 401 encerra a sessão e leva ao login com mensagem', async ({
  page,
}) => {
  await mockBackend(page, {
    status: 401,
    body: { statusCode: 401, message: 'Token inválido.' },
  });
  await page.addInitScript(
    (key) => localStorage.setItem(key, 'token-expirado'),
    TOKEN_KEY,
  );
  await page.goto('/admin');

  await page.getByRole('button', { name: 'Salvar intervalos' }).click();

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('alert')).toHaveText(
    'Sua sessão expirou. Entre novamente para salvar.',
  );
  expect(
    await page.evaluate((key) => localStorage.getItem(key), TOKEN_KEY),
  ).toBeNull();
});

test('erro de validação do backend aparece na página', async ({ page }) => {
  await mockBackend(page, {
    status: 400,
    body: {
      statusCode: 400,
      message: ['O intervalo de coleta máximo é 3600 segundos.'],
    },
  });
  await page.addInitScript(
    (key) => localStorage.setItem(key, 'token-salvo'),
    TOKEN_KEY,
  );
  await page.goto('/admin');

  await page.getByRole('button', { name: 'Salvar intervalos' }).click();

  await expect(page.getByRole('alert')).toHaveText(
    'O intervalo de coleta máximo é 3600 segundos.',
  );
  await expect(
    page.getByRole('button', { name: 'Salvar intervalos' }),
  ).toBeEnabled();
});

test('painel mostra o estado das integrações em texto, com horário relativo', async ({
  page,
}) => {
  await mockBackend(page);
  const autorizacoes: (string | undefined)[] = [];
  await page.route('**/api/saude', (route) => {
    autorizacoes.push(route.request().headers().authorization);
    return route.fulfill({ json: saude });
  });
  await page.addInitScript(
    (key) => localStorage.setItem(key, 'token-salvo'),
    TOKEN_KEY,
  );
  await page.goto('/admin');

  const painel = page.getByRole('region', { name: 'Saúde das integrações' });
  const agregador = painel.getByRole('article').filter({
    has: page.getByRole('heading', { name: 'Agregador de métricas' }),
  });
  const carbono = painel.getByRole('article').filter({
    has: page.getByRole('heading', { name: 'API de carbono' }),
  });

  await expect(agregador.getByText('Operacional')).toBeVisible();
  await expect(agregador.getByText('120 ms')).toBeVisible();
  await expect(agregador.getByText('há 30 segundos').first()).toBeVisible();
  await expect(carbono.getByText('Com falha')).toBeVisible();
  await expect(carbono.getByText('8 s')).toBeVisible();
  await expect(carbono.getByText('há 2 minutos')).toBeVisible();
  await expect(
    carbono.getByText('Tempo limite de 8000 ms excedido ao consultar a API.'),
  ).toBeVisible();
  await expect(
    painel.getByText('10 coletas na última hora, 1 falhou (10%).'),
  ).toBeVisible();
  await expect(
    painel.getByRole('listitem').filter({ hasText: 'Sem métricas' }),
  ).toContainText('2');
  expect(autorizacoes).toEqual(['Bearer token-salvo']);
  expect(await axeViolations(page)).toEqual([]);
});

test('falha ao consultar a saúde mostra o erro e permite tentar de novo', async ({
  page,
}) => {
  await mockBackend(page);
  let tentativas = 0;
  await page.route('**/api/saude', (route) => {
    tentativas += 1;
    return tentativas === 1
      ? route.fulfill({ status: 500 })
      : route.fulfill({ json: saude });
  });
  await page.addInitScript(
    (key) => localStorage.setItem(key, 'token-salvo'),
    TOKEN_KEY,
  );
  await page.goto('/admin');

  const painel = page.getByRole('region', { name: 'Saúde das integrações' });
  await expect(
    painel.getByText(/Não foi possível consultar o backend/),
  ).toBeVisible();
  expect(await axeViolations(page)).toEqual([]);

  await painel.getByRole('button', { name: 'Tentar novamente' }).click();
  await expect(painel.getByText('Agregador de métricas')).toBeVisible();
  await expect(painel.getByText('Com falha')).toBeVisible();
});

test('resposta 401 na saúde encerra a sessão e leva ao login', async ({
  page,
}) => {
  await mockBackend(page);
  await page.route('**/api/saude', (route) =>
    route.fulfill({
      status: 401,
      json: { statusCode: 401, message: 'Token inválido.' },
    }),
  );
  await page.addInitScript(
    (key) => localStorage.setItem(key, 'token-expirado'),
    TOKEN_KEY,
  );
  await page.goto('/admin');

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('alert')).toHaveText(
    'Sua sessão expirou. Entre novamente para ver a saúde das integrações.',
  );
});

test('modo demonstração mostra o painel sem chamar a API de saúde', async ({
  page,
}) => {
  await mockBackend(page);
  const chamadas: string[] = [];
  await page.route('**/api/saude', (route) => {
    chamadas.push(route.request().url());
    return route.fulfill({ status: 500 });
  });
  await page.addInitScript(
    (key) => localStorage.setItem(key, 'token-salvo'),
    TOKEN_KEY,
  );
  await page.goto('/admin?demo=1');

  const painel = page.getByRole('region', { name: 'Saúde das integrações' });
  await expect(
    painel.getByText('Modo demonstração · dados fictícios.'),
  ).toBeVisible();
  await expect(painel.getByText('Operacional')).toBeVisible();
  await expect(painel.getByText('Com falha')).toBeVisible();
  await expect(
    painel.getByRole('button', { name: 'Atualizar agora' }),
  ).toHaveCount(0);
  expect(chamadas).toEqual([]);
  expect(await axeViolations(page)).toEqual([]);
});
