import type {
  EstadoMonitoramento,
  RespostaMapa,
  ServicoNoMapa,
  TotaisAmbientais,
} from '../types/mapa';

// Fixtures para desenvolvimento e demonstração. Não representam coletas reais.
const INICIO_MS = Date.parse('2026-11-11T03:00:00.000Z');
const HORA_MS = 60 * 60 * 1000;
const TOTAL_INTERVALOS = 24;

const intervalos = Array.from({ length: TOTAL_INTERVALOS }, (_, indice) =>
  new Date(INICIO_MS + indice * HORA_MS).toISOString(),
);

type Regiao = {
  codigo: string;
  local: string;
  latitude: number;
  longitude: number;
  intensidadeGCo2ePorKwh: number;
};

const regioes = {
  saoPaulo: {
    codigo: 'br-sudeste',
    local: 'Brasil · São Paulo',
    latitude: -23.5505,
    longitude: -46.6333,
    intensidadeGCo2ePorKwh: 98,
  },
  virginia: {
    codigo: 'us-east',
    local: 'Estados Unidos · Ashburn',
    latitude: 39.0438,
    longitude: -77.4874,
    intensidadeGCo2ePorKwh: 384,
  },
  dublin: {
    codigo: 'eu-west',
    local: 'Irlanda · Dublin',
    latitude: 53.3498,
    longitude: -6.2603,
    intensidadeGCo2ePorKwh: 296,
  },
  toronto: {
    codigo: 'ca-central',
    local: 'Canadá · Toronto',
    latitude: 43.6532,
    longitude: -79.3832,
    intensidadeGCo2ePorKwh: 41,
  },
  toquio: {
    codigo: 'jp-east',
    local: 'Japão · Tóquio',
    latitude: 35.6762,
    longitude: 139.6503,
    intensidadeGCo2ePorKwh: 471,
  },
} satisfies Record<string, Regiao>;

type PerfilDeConsumo = {
  minimoGCo2e: number;
  picoGCo2e: number;
  horaDoPico: number;
  horasSemColeta?: number[];
};

function arredondar(valor: number, casas = 4) {
  const fator = 10 ** casas;
  return Math.round(valor * fator) / fator;
}

function gerarSerie({
  minimoGCo2e,
  picoGCo2e,
  horaDoPico,
  horasSemColeta = [],
}: PerfilDeConsumo) {
  return intervalos.map((_, hora) => {
    if (horasSemColeta.includes(hora)) {
      return null;
    }

    const fase = (2 * Math.PI * (hora - horaDoPico)) / TOTAL_INTERVALOS;
    const proporcao = (1 + Math.cos(fase)) / 2;
    return arredondar(minimoGCo2e + (picoGCo2e - minimoGCo2e) * proporcao);
  });
}

function somarTotais(
  serie: (number | null)[],
  intensidadeGCo2ePorKwh: number,
): TotaisAmbientais {
  const valores = serie.filter((valor): valor is number => valor !== null);

  if (valores.length === 0) {
    return { energiaKwh: null, emissaoGCo2e: null };
  }

  const emissaoGCo2e = valores.reduce((soma, valor) => soma + valor, 0);
  return {
    energiaKwh: arredondar(emissaoGCo2e / intensidadeGCo2ePorKwh, 6),
    emissaoGCo2e: arredondar(emissaoGCo2e),
  };
}

function criarServico(
  servicoId: number,
  nome: string,
  estado: EstadoMonitoramento,
  regiao: Regiao,
  serie: (number | null)[],
): ServicoNoMapa {
  return {
    servicoId,
    nome,
    estado,
    regiaoCodigo: regiao.codigo,
    latitude: regiao.latitude,
    longitude: regiao.longitude,
    local: regiao.local,
    totais: somarTotais(serie, regiao.intensidadeGCo2ePorKwh),
    serie,
  };
}

const semColeta = intervalos.map(() => null);

export const mapaDemo: RespostaMapa = {
  periodo: {
    inicio: intervalos[0],
    fim: new Date(INICIO_MS + TOTAL_INTERVALOS * HORA_MS - 1).toISOString(),
  },
  granularidade: 'hora',
  intervalos,
  servicos: [
    criarServico(
      1,
      'Auth Service',
      'DISPONIVEL',
      regioes.saoPaulo,
      gerarSerie({ minimoGCo2e: 0.02, picoGCo2e: 0.09, horaDoPico: 14 }),
    ),
    criarServico(
      2,
      'Catalog API',
      'DISPONIVEL',
      regioes.saoPaulo,
      gerarSerie({ minimoGCo2e: 0.01, picoGCo2e: 0.05, horaDoPico: 11 }),
    ),
    criarServico(
      3,
      'Billing Service',
      'INDISPONIVEL',
      regioes.saoPaulo,
      gerarSerie({
        minimoGCo2e: 0.01,
        picoGCo2e: 0.04,
        horaDoPico: 10,
        horasSemColeta: [17, 18, 19, 20, 21, 22, 23],
      }),
    ),
    criarServico(
      4,
      'Search API',
      'DISPONIVEL',
      regioes.virginia,
      gerarSerie({ minimoGCo2e: 0.12, picoGCo2e: 0.41, horaDoPico: 16 }),
    ),
    criarServico(
      5,
      'Video Processor',
      'DISPONIVEL',
      regioes.virginia,
      gerarSerie({ minimoGCo2e: 0.25, picoGCo2e: 0.86, horaDoPico: 21 }),
    ),
    criarServico(
      6,
      'Notification Worker',
      'SEM_METRICAS',
      regioes.dublin,
      semColeta,
    ),
    criarServico(
      7,
      'Reports Engine',
      'DISPONIVEL',
      regioes.toronto,
      gerarSerie({ minimoGCo2e: 0.004, picoGCo2e: 0.02, horaDoPico: 3 }),
    ),
    criarServico(
      8,
      'Media CDN',
      'DISPONIVEL',
      regioes.toquio,
      gerarSerie({ minimoGCo2e: 0.18, picoGCo2e: 0.52, horaDoPico: 8 }),
    ),
  ],
  semCoordenadas: [
    {
      servicoId: 9,
      nome: 'Email Worker',
      estado: 'DISPONIVEL',
      regiaoCodigo: 'desconhecida',
      totais: { energiaKwh: 0.0021, emissaoGCo2e: 0.62 },
    },
    {
      servicoId: 10,
      nome: 'Legacy Batch',
      estado: 'DESCONHECIDO',
      regiaoCodigo: 'desconhecida',
      totais: { energiaKwh: null, emissaoGCo2e: null },
    },
  ],
};
