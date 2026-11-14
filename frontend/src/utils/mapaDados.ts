import type {
  EstadoMonitoramento,
  RespostaMapa,
  ServicoNoMapa,
  TotaisAmbientais,
} from '../types/mapa';

export type Limites = [[number, number], [number, number]];

const ESTADOS: readonly EstadoMonitoramento[] = [
  'DISPONIVEL',
  'INDISPONIVEL',
  'SEM_METRICAS',
  'REMOVIDO',
  'DESCONHECIDO',
];

const ROTULOS_ESTADO: Record<EstadoMonitoramento, string> = {
  DISPONIVEL: 'Disponível',
  INDISPONIVEL: 'Indisponível',
  SEM_METRICAS: 'Sem métricas',
  REMOVIDO: 'Removido',
  DESCONHECIDO: 'Desconhecido',
};

const formatoEnergia = new Intl.NumberFormat('pt-BR', {
  maximumSignificantDigits: 3,
});

function ehObjeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === 'object' && valor !== null;
}

function ehNumeroOuNulo(valor: unknown) {
  return (
    valor === null || (typeof valor === 'number' && Number.isFinite(valor))
  );
}

function ehEstado(valor: unknown): valor is EstadoMonitoramento {
  return ESTADOS.includes(valor as EstadoMonitoramento);
}

function ehTotais(valor: unknown) {
  return (
    ehObjeto(valor) &&
    ehNumeroOuNulo(valor.energiaKwh) &&
    ehNumeroOuNulo(valor.emissaoGCo2e)
  );
}

function ehServicoBase(valor: unknown): valor is Record<string, unknown> {
  return (
    ehObjeto(valor) &&
    Number.isInteger(valor.servicoId) &&
    typeof valor.nome === 'string' &&
    ehEstado(valor.estado) &&
    typeof valor.regiaoCodigo === 'string' &&
    ehTotais(valor.totais)
  );
}

function ehCoordenada(valor: unknown, limite: number) {
  return (
    typeof valor === 'number' &&
    Number.isFinite(valor) &&
    Math.abs(valor) <= limite
  );
}

export function ehRespostaMapa(valor: unknown): valor is RespostaMapa {
  if (
    !ehObjeto(valor) ||
    !ehObjeto(valor.periodo) ||
    typeof valor.periodo.inicio !== 'string' ||
    typeof valor.periodo.fim !== 'string' ||
    (valor.granularidade !== 'hora' && valor.granularidade !== 'dia') ||
    !Array.isArray(valor.intervalos) ||
    !valor.intervalos.every((intervalo) => typeof intervalo === 'string') ||
    !Array.isArray(valor.servicos) ||
    !Array.isArray(valor.semCoordenadas)
  ) {
    return false;
  }

  const totalIntervalos = valor.intervalos.length;

  return (
    valor.servicos.every(
      (servico) =>
        ehServicoBase(servico) &&
        ehCoordenada(servico.latitude, 90) &&
        ehCoordenada(servico.longitude, 180) &&
        typeof servico.local === 'string' &&
        Array.isArray(servico.serie) &&
        servico.serie.length === totalIntervalos &&
        servico.serie.every(ehNumeroOuNulo),
    ) && valor.semCoordenadas.every(ehServicoBase)
  );
}

export function rotuloEstado(estado: EstadoMonitoramento) {
  return ROTULOS_ESTADO[estado];
}

export function formatarEnergia(kwh: number | null) {
  return kwh === null ? 'Sem dados' : `${formatoEnergia.format(kwh)} kWh`;
}

export function limitesDosServicos(
  servicos: Pick<ServicoNoMapa, 'latitude' | 'longitude'>[],
): Limites | null {
  if (servicos.length === 0) {
    return null;
  }

  const latitudes = servicos.map(({ latitude }) => latitude);
  const longitudes = servicos.map(({ longitude }) => longitude);

  return [
    [Math.min(...latitudes), Math.min(...longitudes)],
    [Math.max(...latitudes), Math.max(...longitudes)],
  ];
}

export function ordenarPorEmissao<
  T extends { nome: string; totais: TotaisAmbientais },
>(servicos: T[]): T[] {
  return [...servicos].sort((a, b) => {
    const emissaoA = a.totais.emissaoGCo2e;
    const emissaoB = b.totais.emissaoGCo2e;

    if (emissaoA === emissaoB) {
      return a.nome.localeCompare(b.nome, 'pt-BR');
    }
    if (emissaoA === null) {
      return 1;
    }
    if (emissaoB === null) {
      return -1;
    }
    return emissaoB - emissaoA;
  });
}
