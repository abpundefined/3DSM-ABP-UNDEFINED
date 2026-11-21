import type { LiveService } from '../components/dashboard/liveTypes.ts';
import { calcularComponentesPorMetricas } from './composicaoEnergia.ts';
import { toFiniteNumber } from './formatters.ts';

export const CAMINHO_EVENTOS_SSE = '/api/eventos';
export const DURACAO_PULSO_CARD_MS = 1_200;
export const ATRASO_RECONEXAO_SSE_MS = 5_000;

export type EstadoMonitoramentoSse =
  'DISPONIVEL' | 'INDISPONIVEL' | 'SEM_METRICAS' | 'REMOVIDO' | 'DESCONHECIDO';

const ESTADOS_MONITORAMENTO_VALIDOS = new Set<EstadoMonitoramentoSse>([
  'DISPONIVEL',
  'INDISPONIVEL',
  'SEM_METRICAS',
  'REMOVIDO',
  'DESCONHECIDO',
]);

export type ColetaEventoSse = {
  id: number | null;
  servicoId: number;
  iniciadaEm: string;
  intervaloColetaSegundos: number | null;
  estadoColeta: string;
  estadoCalculo: string;
  cpuPercent: number | null;
  memoryGb: number | null;
  diskGb: number | null;
  networkGb: number | null;
  intensidadeCarbonoGCo2ePorKwh: number | null;
  energiaKwh: number | null;
  emissaoGCo2e: number | null;
};

export type EventoColetaRegistradaSse = {
  tipo: 'coleta-registrada';
  servicoId: number;
  coleta: ColetaEventoSse;
};

export type EventoEstadoAlteradoSse = {
  tipo: 'estado-alterado';
  servicoId: number;
  estadoAtual: EstadoMonitoramentoSse;
  atualizadoEm: string;
};

export type EventoTempoRealSse =
  EventoColetaRegistradaSse | EventoEstadoAlteradoSse;

function decodificarObjetoJson(
  dadoBruto: unknown,
): Record<string, unknown> | null {
  if (typeof dadoBruto === 'string') {
    try {
      const parsed = JSON.parse(dadoBruto) as unknown;
      return typeof parsed === 'object' &&
        parsed !== null &&
        !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : null;
    } catch {
      return null;
    }
  }

  if (
    typeof dadoBruto === 'object' &&
    dadoBruto !== null &&
    !Array.isArray(dadoBruto)
  ) {
    return dadoBruto as Record<string, unknown>;
  }

  return null;
}

function ehIdServicoValido(valor: unknown): valor is number {
  return typeof valor === 'number' && Number.isSafeInteger(valor) && valor > 0;
}

export function ehEstadoMonitoramentoSse(
  valor: unknown,
): valor is EstadoMonitoramentoSse {
  return (
    typeof valor === 'string' &&
    ESTADOS_MONITORAMENTO_VALIDOS.has(valor as EstadoMonitoramentoSse)
  );
}

export function interpretarEventoColetaRegistrada(
  dadoBruto: unknown,
): EventoColetaRegistradaSse | null {
  const obj = decodificarObjetoJson(dadoBruto);
  if (!obj) {
    return null;
  }

  if (obj.tipo !== undefined && obj.tipo !== 'coleta-registrada') {
    return null;
  }

  const rawColeta =
    typeof obj.coleta === 'object' &&
    obj.coleta !== null &&
    !Array.isArray(obj.coleta)
      ? (obj.coleta as Record<string, unknown>)
      : null;

  if (!rawColeta) {
    return null;
  }

  const servicoId = ehIdServicoValido(obj.servicoId)
    ? obj.servicoId
    : ehIdServicoValido(rawColeta.servicoId)
      ? rawColeta.servicoId
      : null;

  if (servicoId === null) {
    return null;
  }

  const iniciadaEm =
    typeof rawColeta.iniciadaEm === 'string' &&
    rawColeta.iniciadaEm.trim() !== ''
      ? rawColeta.iniciadaEm
      : new Date().toISOString();

  return {
    tipo: 'coleta-registrada',
    servicoId,
    coleta: {
      id: ehIdServicoValido(rawColeta.id) ? rawColeta.id : null,
      servicoId,
      iniciadaEm,
      intervaloColetaSegundos: toFiniteNumber(
        rawColeta.intervaloColetaSegundos,
      ),
      estadoColeta:
        typeof rawColeta.estadoColeta === 'string' &&
        rawColeta.estadoColeta.trim() !== ''
          ? rawColeta.estadoColeta
          : 'SUCESSO',
      estadoCalculo:
        typeof rawColeta.estadoCalculo === 'string' &&
        rawColeta.estadoCalculo.trim() !== ''
          ? rawColeta.estadoCalculo
          : 'CONCLUIDO',
      cpuPercent: toFiniteNumber(rawColeta.cpuPercent),
      memoryGb: toFiniteNumber(rawColeta.memoryGb),
      diskGb: toFiniteNumber(rawColeta.diskGb),
      networkGb: toFiniteNumber(rawColeta.networkGb),
      intensidadeCarbonoGCo2ePorKwh: toFiniteNumber(
        rawColeta.intensidadeCarbonoGCo2ePorKwh,
      ),
      energiaKwh: toFiniteNumber(rawColeta.energiaKwh),
      emissaoGCo2e: toFiniteNumber(rawColeta.emissaoGCo2e),
    },
  };
}

export function interpretarEventoEstadoAlterado(
  dadoBruto: unknown,
): EventoEstadoAlteradoSse | null {
  const obj = decodificarObjetoJson(dadoBruto);
  if (!obj) {
    return null;
  }

  if (obj.tipo !== undefined && obj.tipo !== 'estado-alterado') {
    return null;
  }

  if (
    !ehIdServicoValido(obj.servicoId) ||
    !ehEstadoMonitoramentoSse(obj.estadoAtual)
  ) {
    return null;
  }

  const atualizadoEm =
    typeof obj.atualizadoEm === 'string' && obj.atualizadoEm.trim() !== ''
      ? obj.atualizadoEm
      : new Date().toISOString();

  return {
    tipo: 'estado-alterado',
    servicoId: obj.servicoId,
    estadoAtual: obj.estadoAtual,
    atualizadoEm,
  };
}

export function interpretarEventoTempoReal(
  dadoBruto: unknown,
): EventoTempoRealSse | null {
  return (
    interpretarEventoColetaRegistrada(dadoBruto) ??
    interpretarEventoEstadoAlterado(dadoBruto)
  );
}

export function aplicarEventoSseEmServicos(
  servicos: LiveService[],
  evento: EventoTempoRealSse,
): {
  servicos: LiveService[];
  servicoAtualizadoId: number | null;
} {
  const indice = servicos.findIndex(
    (servico) => servico.id === evento.servicoId,
  );
  if (indice < 0) {
    return {
      servicos,
      servicoAtualizadoId: null,
    };
  }

  const atual = servicos[indice];
  let proximoServico: LiveService;

  if (evento.tipo === 'estado-alterado') {
    proximoServico = {
      ...atual,
      estadoAtual: evento.estadoAtual,
    };
  } else {
    const { coleta } = evento;
    if (coleta.estadoColeta === 'SUCESSO') {
      const possuiAlgumaMetrica =
        coleta.cpuPercent !== null ||
        coleta.memoryGb !== null ||
        coleta.diskGb !== null ||
        coleta.networkGb !== null;

      const componentes = possuiAlgumaMetrica
        ? calcularComponentesPorMetricas({
            cpuPercent: coleta.cpuPercent ?? 0,
            memoryGb: coleta.memoryGb ?? 0,
            diskGb: coleta.diskGb ?? 0,
            networkGb: coleta.networkGb ?? 0,
          })
        : (atual.componentes ?? null);

      proximoServico = {
        ...atual,
        energiaKwh: coleta.energiaKwh ?? atual.energiaKwh,
        emissaoGCo2e: coleta.emissaoGCo2e ?? atual.emissaoGCo2e,
        componentes,
        latestCollection: {
          iniciadaEm: coleta.iniciadaEm,
          intervaloColetaSegundos: coleta.intervaloColetaSegundos,
          cpuPercent: coleta.cpuPercent,
          memoryGb: coleta.memoryGb,
          diskGb: coleta.diskGb,
          networkGb: coleta.networkGb,
          intensidadeCarbonoGCo2ePorKwh: coleta.intensidadeCarbonoGCo2ePorKwh,
          energiaKwh: coleta.energiaKwh,
          emissaoGCo2e: coleta.emissaoGCo2e,
        },
      };
    } else {
      proximoServico = {
        ...atual,
      };
    }
  }

  const proximosServicos = servicos.map((servico, idx) =>
    idx === indice ? proximoServico : servico,
  );

  return {
    servicos: proximosServicos,
    servicoAtualizadoId: evento.servicoId,
  };
}
