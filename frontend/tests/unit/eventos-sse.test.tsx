import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ServiceCard from '../../src/components/dashboard/ServiceCard';
import type { LiveService } from '../../src/components/dashboard/liveTypes';
import useEventosSse from '../../src/hooks/useEventosSse';
import {
  ATRASO_RECONEXAO_SSE_MS,
  type EventoTempoRealSse,
} from '../../src/utils/eventosSse';

class MockEventSource {
  static instances: MockEventSource[] = [];
  readonly url: string;
  closed = false;
  private listeners = new Map<string, Set<(event: Event) => void>>();

  constructor(url: string) {
    this.url = url;
    MockEventSource.instances.push(this);
  }

  addEventListener(type: string, callback: (event: Event) => void) {
    const group = this.listeners.get(type) ?? new Set();
    group.add(callback);
    this.listeners.set(type, group);
  }

  emit(type: string, data?: unknown) {
    const group = this.listeners.get(type);
    if (!group) {
      return;
    }
    const event =
      data !== undefined
        ? new MessageEvent(type, {
            data: typeof data === 'string' ? data : JSON.stringify(data),
          })
        : new Event(type);
    for (const listener of group) {
      listener(event);
    }
  }

  close() {
    this.closed = true;
  }
}

const servicoBase: LiveService = {
  id: 1,
  idExterno: 'payments-api',
  nome: 'API de Pagamentos',
  selo: 'A',
  regiaoCodigo: 'br-sudeste',
  localizacao: {
    pais: 'Brasil',
    regiao: 'Sudeste',
    cidade: 'São Paulo',
  },
  estadoAtual: 'DISPONIVEL',
  energiaKwh: 0.0025,
  emissaoGCo2e: 0.21,
  latestCollection: {
    iniciadaEm: '2026-04-20T12:00:00.000Z',
    intervaloColetaSegundos: 30,
    cpuPercent: 35,
    memoryGb: 2,
    diskGb: 8,
    networkGb: 0.4,
    energiaKwh: 0.0025,
    emissaoGCo2e: 0.21,
  },
};

function ComponenteTesteSse({
  ativo = true,
  onEvento,
}: {
  ativo?: boolean;
  onEvento: (evento: EventoTempoRealSse) => void;
}) {
  const { status } = useEventosSse({ ativo, onEvento });
  return <div data-testid="sse-status">{status}</div>;
}

describe('useEventosSse e pulso do ServiceCard', () => {
  const originalEventSource = window.EventSource;

  beforeEach(() => {
    MockEventSource.instances = [];
    vi.useFakeTimers();
    Object.defineProperty(window, 'EventSource', {
      configurable: true,
      writable: true,
      value: MockEventSource,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    Object.defineProperty(window, 'EventSource', {
      configurable: true,
      writable: true,
      value: originalEventSource,
    });
  });

  it('conecta em /api/eventos, recebe coleta-registrada e estado-alterado e reconecta automaticamente após falha', () => {
    const recebidos: EventoTempoRealSse[] = [];

    render(<ComponenteTesteSse onEvento={(ev) => recebidos.push(ev)} />);

    expect(screen.getByTestId('sse-status')).toHaveTextContent('conectando');
    expect(MockEventSource.instances).toHaveLength(1);
    expect(MockEventSource.instances[0].url).toBe('/api/eventos');

    act(() => {
      MockEventSource.instances[0].emit('open');
    });
    expect(screen.getByTestId('sse-status')).toHaveTextContent('conectado');

    act(() => {
      MockEventSource.instances[0].emit('coleta-registrada', {
        tipo: 'coleta-registrada',
        servicoId: 1,
        coleta: {
          id: 10,
          servicoId: 1,
          iniciadaEm: '2026-04-20T12:00:30.000Z',
          intervaloColetaSegundos: 30,
          estadoColeta: 'SUCESSO',
          estadoCalculo: 'CONCLUIDO',
          cpuPercent: 72,
          memoryGb: 3.1,
          diskGb: 8,
          networkGb: 0.5,
          energiaKwh: 0.0038,
          emissaoGCo2e: 0.32,
        },
      });
      MockEventSource.instances[0].emit('estado-alterado', {
        tipo: 'estado-alterado',
        servicoId: 1,
        estadoAtual: 'INDISPONIVEL',
        atualizadoEm: '2026-04-20T12:01:00.000Z',
      });
    });

    expect(recebidos).toHaveLength(2);
    expect(recebidos[0].tipo).toBe('coleta-registrada');
    expect(recebidos[1].tipo).toBe('estado-alterado');

    act(() => {
      MockEventSource.instances[0].emit('error');
    });

    expect(screen.getByTestId('sse-status')).toHaveTextContent('fallback');
    expect(MockEventSource.instances[0].closed).toBe(true);

    act(() => {
      vi.advanceTimersByTime(ATRASO_RECONEXAO_SSE_MS);
    });

    expect(MockEventSource.instances).toHaveLength(2);
    act(() => {
      MockEventSource.instances[1].emit('open');
    });
    expect(screen.getByTestId('sse-status')).toHaveTextContent('conectado');
  });

  it('entra em modo fallback quando EventSource não está disponível no navegador', () => {
    Object.defineProperty(window, 'EventSource', {
      configurable: true,
      writable: true,
      value: undefined,
    });

    render(<ComponenteTesteSse onEvento={() => undefined} />);

    expect(screen.getByTestId('sse-status')).toHaveTextContent('fallback');
  });

  it('aplica a classe service-card--pulsando no ServiceCard apenas quando pulsando=true', () => {
    const { rerender } = render(
      <ServiceCard service={servicoBase} pulsando={true} />,
    );

    const card = screen.getByRole('article', { name: 'API de Pagamentos' });
    expect(card).toHaveClass('service-card--pulsando');
    expect(card).toHaveAttribute('data-pulsando', 'true');

    rerender(<ServiceCard service={servicoBase} pulsando={false} />);
    expect(card).not.toHaveClass('service-card--pulsando');
    expect(card).not.toHaveAttribute('data-pulsando');
  });
});
