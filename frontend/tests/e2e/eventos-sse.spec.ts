import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

async function configurarMocksBaseDashboard(
  page: Page,
  opcoes: {
    cpuPorRequisicao?: number[];
  } = {},
) {
  let indiceColeta = 0;
  const cpus = opcoes.cpuPorRequisicao ?? [28];

  await page.addInitScript(() => {
    localStorage.setItem('greener-tour-visto', '1');
  });

  await page.route('**/api/servicos', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: 1,
          idExterno: 'billing-api',
          nome: 'API de Faturamento',
          regiaoCodigo: 'br-sudeste',
          localizacao: {
            pais: 'Brasil',
            regiao: 'Sudeste',
            cidade: 'São Paulo',
          },
          estadoAtual: 'DISPONIVEL',
          energiaKwh: 0.002,
          emissaoGCo2e: 0.17,
        },
      ]),
    });
  });

  await page.route('**/api/coletas/servico/1/ultima-valida', async (route) => {
    const cpuAtual = cpus[Math.min(indiceColeta, cpus.length - 1)];
    indiceColeta += 1;

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        fonte: 'CACHE_FALLBACK',
        dados: {
          iniciadaEm: '2026-04-20T12:00:00.000Z',
          intervaloColetaSegundos: 30,
          cpuPercent: cpuAtual,
          memoryGb: 2.0,
          diskGb: 10.0,
          networkGb: 0.5,
          energiaKwh: 0.002,
          emissaoGCo2e: 0.17,
        },
      }),
    });
  });

  await page.route('**/api/configuracao', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        intervaloColetaSegundos: 30,
        intervaloDescobertaSegundos: 60,
        metaEmissaoDiariaGCo2e: 500,
      }),
    });
  });

  await page.route('**/api/indicadores**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        energiaTotalKwh: 0.002,
        emissaoTotalGCo2e: 0.17,
        servicos: {
          disponiveis: 1,
          indisponiveis: 0,
          semMetricas: 0,
          removidos: 0,
        },
      }),
    });
  });

  await page.route('**/api/indicadores/serie**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        periodo: {
          inicio: '2026-04-19T12:00:00.000Z',
          fim: '2026-04-20T12:00:00.000Z',
        },
        granularidade: 'hora',
        intervalos: [],
        global: [],
        servicos: [],
      }),
    });
  });

  await page.route('**/api/indicadores/meta', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        metaMensal: null,
        acumuladoMes: 5,
        diasDecorridos: 15,
        diasNoMes: 30,
        projecaoMes: 10,
      }),
    });
  });

  await page.route('**/api/oportunidades**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        periodo: {
          inicio: '2026-04-19T12:00:00.000Z',
          fim: '2026-04-20T12:00:00.000Z',
        },
        resumo: {
          totalOportunidades: 0,
          reducaoPotencialGCo2e: 0,
          porTipo: {
            MIGRAR_REGIAO: 0,
            SUPERDIMENSIONAMENTO: 0,
            MUDAR_HORARIO: 0,
          },
        },
        limiares: {
          reducaoMinimaMigrarRegiaoPercentual: 20,
          cpuMaximaSuperdimensionamentoPercentual: 15,
          reducaoEstimadaSuperdimensionamentoPercentual: 30,
          reducaoMinimaMudarHorarioPercentual: 20,
          duracaoJanelaHorarioHoras: 3,
        },
        aviso: 'Sugestão estimada.',
        oportunidades: [],
      }),
    });
  });
}

test.describe('Atualização em tempo real com SSE (#147)', () => {
  test('atualiza o card e aplica animação de pulso ao receber coleta-registrada e estado-alterado via SSE', async ({
    page,
  }) => {
    await page.addInitScript(() => {
      class FakeEventSource {
        static latest: FakeEventSource | null = null;
        url: string;
        readyState = 1;
        private listeners: Record<string, Array<(ev: Event) => void>> = {};

        constructor(url: string) {
          this.url = url;
          FakeEventSource.latest = this;
          (
            window as unknown as { __sseInstance?: FakeEventSource }
          ).__sseInstance = this;
          window.setTimeout(() => {
            this.dispatch('open', new Event('open'));
          }, 10);
        }

        addEventListener(type: string, cb: (ev: Event) => void) {
          this.listeners[type] = this.listeners[type] ?? [];
          this.listeners[type].push(cb);
        }

        dispatch(type: string, ev: Event) {
          for (const cb of this.listeners[type] ?? []) {
            cb(ev);
          }
        }

        close() {
          this.readyState = 2;
        }
      }

      (
        window as unknown as {
          EventSource: typeof FakeEventSource;
          __emitirSse: (tipo: string, payload: unknown) => void;
        }
      ).EventSource = FakeEventSource;
      (
        window as unknown as {
          __emitirSse: (tipo: string, payload: unknown) => void;
        }
      ).__emitirSse = (tipo: string, payload: unknown) => {
        const instance = FakeEventSource.latest;
        if (!instance) return;
        instance.dispatch(
          tipo,
          new MessageEvent(tipo, { data: JSON.stringify(payload) }),
        );
      };
    });

    await configurarMocksBaseDashboard(page);
    await page.goto('/');

    const card = page.getByRole('article', { name: 'API de Faturamento' });
    await expect(card).toBeVisible();
    await expect(
      card.getByRole('meter', { name: 'Uso de CPU' }),
    ).toHaveAttribute('aria-valuenow', '28');
    await expect(page.locator('.live-dashboard-toolbar')).toHaveAttribute(
      'data-sse-status',
      'conectado',
    );

    await page.evaluate(() => {
      (
        window as unknown as {
          __emitirSse: (tipo: string, payload: unknown) => void;
        }
      ).__emitirSse('coleta-registrada', {
        tipo: 'coleta-registrada',
        servicoId: 1,
        coleta: {
          id: 50,
          servicoId: 1,
          iniciadaEm: '2026-04-20T12:00:30.000Z',
          intervaloColetaSegundos: 30,
          estadoColeta: 'SUCESSO',
          estadoCalculo: 'CONCLUIDO',
          cpuPercent: 84,
          memoryGb: 4.5,
          diskGb: 12.0,
          networkGb: 1.2,
          energiaKwh: 0.0065,
          emissaoGCo2e: 0.55,
        },
      });
    });

    await expect(card).toHaveAttribute('data-pulsando', 'true');
    await expect(
      card.getByRole('meter', { name: 'Uso de CPU' }),
    ).toHaveAttribute('aria-valuenow', '84');

    await page.evaluate(() => {
      (
        window as unknown as {
          __emitirSse: (tipo: string, payload: unknown) => void;
        }
      ).__emitirSse('estado-alterado', {
        tipo: 'estado-alterado',
        servicoId: 1,
        estadoAtual: 'INDISPONIVEL',
        atualizadoEm: '2026-04-20T12:00:45.000Z',
      });
    });

    await expect(card).toContainText('Indisponível');

    const axeLight = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    expect(axeLight.violations).toEqual([]);

    await page.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'dark');
    });
    const axeDark = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    expect(axeDark.violations).toEqual([]);
  });

  test('não aplica animação de pulso com movimento reduzido (prefers-reduced-motion: reduce)', async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });

    await page.addInitScript(() => {
      class FakeEventSource {
        static latest: FakeEventSource | null = null;
        private listeners: Record<string, Array<(ev: Event) => void>> = {};

        constructor() {
          FakeEventSource.latest = this;
          window.setTimeout(() => {
            for (const cb of this.listeners['open'] ?? []) {
              cb(new Event('open'));
            }
          }, 10);
        }

        addEventListener(type: string, cb: (ev: Event) => void) {
          this.listeners[type] = this.listeners[type] ?? [];
          this.listeners[type].push(cb);
        }

        dispatch(type: string, ev: Event) {
          for (const cb of this.listeners[type] ?? []) {
            cb(ev);
          }
        }

        close() {}
      }

      (
        window as unknown as {
          EventSource: typeof FakeEventSource;
          __emitirSse: (tipo: string, payload: unknown) => void;
        }
      ).EventSource = FakeEventSource;
      (
        window as unknown as {
          __emitirSse: (tipo: string, payload: unknown) => void;
        }
      ).__emitirSse = (tipo: string, payload: unknown) => {
        FakeEventSource.latest?.dispatch(
          tipo,
          new MessageEvent(tipo, { data: JSON.stringify(payload) }),
        );
      };
    });

    await configurarMocksBaseDashboard(page);
    await page.goto('/');

    const card = page.getByRole('article', { name: 'API de Faturamento' });
    await expect(card).toBeVisible();

    await page.evaluate(() => {
      (
        window as unknown as {
          __emitirSse: (tipo: string, payload: unknown) => void;
        }
      ).__emitirSse('coleta-registrada', {
        tipo: 'coleta-registrada',
        servicoId: 1,
        coleta: {
          id: 51,
          servicoId: 1,
          iniciadaEm: '2026-04-20T12:01:00.000Z',
          intervaloColetaSegundos: 30,
          estadoColeta: 'SUCESSO',
          estadoCalculo: 'CONCLUIDO',
          cpuPercent: 61,
          memoryGb: 3.0,
          diskGb: 10.0,
          networkGb: 0.5,
          energiaKwh: 0.004,
          emissaoGCo2e: 0.34,
        },
      });
    });

    await expect(
      card.getByRole('meter', { name: 'Uso de CPU' }),
    ).toHaveAttribute('aria-valuenow', '61');
    await expect(card).not.toHaveAttribute('data-pulsando', 'true');
  });

  test('volta para atualização periódica (fallback) quando o endpoint SSE falha', async ({
    page,
  }) => {
    await page.clock.install();
    await configurarMocksBaseDashboard(page, {
      cpuPorRequisicao: [28, 76],
    });

    await page.route('**/api/eventos', async (route) => {
      await route.fulfill({
        status: 503,
        contentType: 'text/plain',
        body: 'SSE indisponivel',
      });
    });

    await page.goto('/');

    const card = page.getByRole('article', { name: 'API de Faturamento' });
    await expect(card).toBeVisible();
    await expect(
      card.getByRole('meter', { name: 'Uso de CPU' }),
    ).toHaveAttribute('aria-valuenow', '28');
    await expect(page.locator('.live-dashboard-toolbar')).toHaveAttribute(
      'data-sse-status',
      'fallback',
    );

    await page.clock.fastForward(30_000);

    await expect(
      card.getByRole('meter', { name: 'Uso de CPU' }),
    ).toHaveAttribute('aria-valuenow', '76');
  });
});
