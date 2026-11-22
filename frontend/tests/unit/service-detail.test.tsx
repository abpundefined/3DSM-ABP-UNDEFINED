import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchServiceDetail } from '../../src/services/serviceDetail';
import {
  formatHistoryDate,
  summarizeServiceHistory,
} from '../../src/utils/serviceHistory';

const service = {
  id: 4,
  idExterno: 'search-api',
  nome: 'Search API',
  regiaoCodigo: 'us-east',
  localizacao: null,
  selo: 'F',
  estadoAtual: 'DISPONIVEL',
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('fetchServiceDetail', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const path = String(input);
      if (path === '/api/servicos') {
        return jsonResponse([service]);
      }
      if (path === '/api/servicos/4/historico?periodo=7d') {
        return jsonResponse([
          {
            inicio: '2026-11-15T14:00:00.000Z',
            energiaKwh: 1.25,
            emissaoGCo2e: 1200,
            selo: 'F',
          },
        ]);
      }
      if (path === '/api/coletas/servico/4/ultima-valida') {
        return jsonResponse({ statusCode: 404 }, 404);
      }
      throw new Error(`URL inesperada: ${path}`);
    });
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('combina serviço e histórico, tratando 404 da última coleta como ausência', async () => {
    const result = await fetchServiceDetail(
      4,
      '?periodo=7d',
      new AbortController().signal,
    );

    expect(result).toEqual({
      service,
      latestCollection: null,
      history: [
        {
          inicio: '2026-11-15T14:00:00.000Z',
          energiaKwh: 1.25,
          emissaoGCo2e: 1200,
          selo: 'F',
        },
      ],
    });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('não consulta o histórico quando o serviço não está na lista', async () => {
    fetchMock.mockImplementation(async (input: RequestInfo | URL) => {
      if (String(input) === '/api/servicos') {
        return jsonResponse([]);
      }
      throw new Error(`URL inesperada: ${String(input)}`);
    });

    const result = await fetchServiceDetail(
      4,
      '',
      new AbortController().signal,
    );

    expect(result).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('preserva contagens de estado do histórico quando presentes na API', async () => {
    fetchMock.mockImplementation(async (input: RequestInfo | URL) => {
      const path = String(input);
      if (path === '/api/servicos') {
        return jsonResponse([service]);
      }
      if (path === '/api/servicos/4/historico?periodo=24h') {
        return jsonResponse([
          {
            inicio: '2026-11-15T14:00:00.000Z',
            energiaKwh: 1.25,
            emissaoGCo2e: 1200,
            selo: 'F',
            coletas: 12,
            ativo: 10,
            indisponivel: 1,
            semMetricas: 1,
          },
        ]);
      }
      if (path === '/api/coletas/servico/4/ultima-valida') {
        return jsonResponse({ statusCode: 404 }, 404);
      }
      throw new Error(`URL inesperada: ${path}`);
    });

    const result = await fetchServiceDetail(
      4,
      '?periodo=24h',
      new AbortController().signal,
    );

    expect(result?.history).toEqual([
      {
        inicio: '2026-11-15T14:00:00.000Z',
        energiaKwh: 1.25,
        emissaoGCo2e: 1200,
        selo: 'F',
        coletas: 12,
        ativo: 10,
        indisponivel: 1,
        semMetricas: 1,
      },
    ]);
  });
});

describe('summarizeServiceHistory', () => {
  it('soma apenas medições disponíveis e escala os eixos de forma independente', () => {
    const summary = summarizeServiceHistory([
      {
        inicio: '2026-11-15T13:00:00.000Z',
        energiaKwh: 0.25,
        emissaoGCo2e: 750,
        selo: 'A',
      },
      {
        inicio: '2026-11-15T14:00:00.000Z',
        energiaKwh: null,
        emissaoGCo2e: 1250,
        selo: 'F',
      },
    ]);

    expect(summary.totalEnergiaKwh).toBe(0.25);
    expect(summary.totalEmissaoGCo2e).toBe(2000);
    expect(summary.escalaEnergia).toEqual({ unidade: 'Wh', fator: 1000 });
    expect(summary.escalaEmissao).toEqual({
      unidade: 'kgCO₂e',
      fator: 0.001,
    });
    expect(summary.pontos.map((point) => point.energia)).toEqual([250, null]);
    expect(summary.pontos.map((point) => point.emissao)).toEqual([0.75, 1.25]);
    expect(summary.granularidadeHoraria).toBe(true);
    expect(formatHistoryDate('2026-11-15T14:00:00.000Z', true)).toContain(
      '11:00',
    );
  });

  it('mantém totais ausentes como null quando nenhum intervalo tem medições', () => {
    const summary = summarizeServiceHistory([
      {
        inicio: '2026-11-15T13:00:00.000Z',
        energiaKwh: null,
        emissaoGCo2e: null,
        selo: '—',
      },
    ]);

    expect(summary.totalEnergiaKwh).toBeNull();
    expect(summary.totalEmissaoGCo2e).toBeNull();
    expect(summary.possuiEnergia).toBe(false);
    expect(summary.possuiEmissao).toBe(false);
  });
});
