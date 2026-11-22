import type {
  EstadoMonitoramento,
  RespostaMapa,
  ServicoNoMapa,
  ServicoSemCoordenadas,
  TotaisAmbientais,
} from '../types/mapa';

export type Limites = [[number, number], [number, number]];

export type RegiaoDoMapa = {
  codigo: string;
  local: string;
};

export type IntensidadePorRegiao = {
  codigo: string;
  local: string;
  intensidadeGCo2ePorKwh: number | null;
  quantidadeServicos: number;
};

type AcumuladoRegional = {
  codigo: string;
  local: string;
  quantidadeServicos: number;
  energiaKwh: number;
  emissaoGCo2e: number;
};

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
const formatoIntensidade = new Intl.NumberFormat('pt-BR', {
  maximumFractionDigits: 1,
});
const formatoComparacao = new Intl.NumberFormat('pt-BR', {
  maximumFractionDigits: 1,
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

export function zoomMinimoDoMapa(largura: number, altura: number) {
  const lado = Math.max(largura, altura);
  return lado > 256 ? Math.ceil(Math.log2(lado / 256)) : 0;
}

export function regioesDoMapa(servicos: ServicoNoMapa[]): RegiaoDoMapa[] {
  const regioes = new Map<string, RegiaoDoMapa>();

  for (const { regiaoCodigo, local } of servicos) {
    if (!regioes.has(regiaoCodigo)) {
      regioes.set(regiaoCodigo, { codigo: regiaoCodigo, local });
    }
  }

  return [...regioes.values()].sort((a, b) =>
    a.local.localeCompare(b.local, 'pt-BR'),
  );
}

export function intensidadesPorRegiao(
  servicos: ServicoNoMapa[],
  semCoordenadas: ServicoSemCoordenadas[] = [],
): IntensidadePorRegiao[] {
  const acumulados = new Map<string, AcumuladoRegional>();
  const adicionarTotais = (
    acumulado: AcumuladoRegional,
    totais: TotaisAmbientais,
  ) => {
    const { energiaKwh, emissaoGCo2e } = totais;
    if (
      energiaKwh === null ||
      emissaoGCo2e === null ||
      energiaKwh <= 0 ||
      emissaoGCo2e < 0
    ) {
      return;
    }

    acumulado.energiaKwh += energiaKwh;
    acumulado.emissaoGCo2e += emissaoGCo2e;
  };

  for (const servico of servicos) {
    let acumulado = acumulados.get(servico.regiaoCodigo);
    if (!acumulado) {
      acumulado = {
        codigo: servico.regiaoCodigo,
        local: servico.local,
        quantidadeServicos: 0,
        energiaKwh: 0,
        emissaoGCo2e: 0,
      };
      acumulados.set(servico.regiaoCodigo, acumulado);
    }

    acumulado.quantidadeServicos += 1;
    adicionarTotais(acumulado, servico.totais);
  }

  for (const servico of semCoordenadas) {
    const codigo = servico.regiaoCodigo.trim();
    if (
      codigo === '' ||
      ['desconhecida', 'desconhecido', 'unknown'].includes(
        codigo.toLocaleLowerCase('pt-BR'),
      )
    ) {
      continue;
    }

    let acumulado = acumulados.get(codigo);
    if (!acumulado) {
      acumulado = {
        codigo,
        local: `Região ${codigo}`,
        quantidadeServicos: 0,
        energiaKwh: 0,
        emissaoGCo2e: 0,
      };
      acumulados.set(codigo, acumulado);
    }

    acumulado.quantidadeServicos += 1;
    adicionarTotais(acumulado, servico.totais);
  }

  return [...acumulados.values()]
    .map(({ codigo, local, quantidadeServicos, energiaKwh, emissaoGCo2e }) => ({
      codigo,
      local,
      quantidadeServicos,
      intensidadeGCo2ePorKwh: energiaKwh > 0 ? emissaoGCo2e / energiaKwh : null,
    }))
    .toSorted((a, b) => {
      const intensidadeA = a.intensidadeGCo2ePorKwh;
      const intensidadeB = b.intensidadeGCo2ePorKwh;
      if (intensidadeA === null) return intensidadeB === null ? 0 : 1;
      if (intensidadeB === null) return -1;
      return (
        intensidadeB - intensidadeA || a.local.localeCompare(b.local, 'pt-BR')
      );
    });
}

export function formatarIntensidadeRegional(valor: number | null) {
  return valor === null
    ? 'Sem dados'
    : `${formatoIntensidade.format(valor)} gCO₂e/kWh`;
}

export function resumoDaIntensidadeRegional(regioes: IntensidadePorRegiao[]) {
  const comparaveis = regioes
    .filter(
      (
        regiao,
      ): regiao is IntensidadePorRegiao & {
        intensidadeGCo2ePorKwh: number;
      } => regiao.intensidadeGCo2ePorKwh !== null,
    )
    .toSorted((a, b) => a.intensidadeGCo2ePorKwh - b.intensidadeGCo2ePorKwh);
  const menor = comparaveis[0];
  const maior = comparaveis.at(-1);

  if (!menor || !maior || menor === maior) {
    return 'Não há dados em pelo menos duas regiões para comparar as intensidades.';
  }
  if (menor.intensidadeGCo2ePorKwh === maior.intensidadeGCo2ePorKwh) {
    return 'As regiões com dados apresentam a mesma intensidade de carbono por kWh.';
  }
  if (menor.intensidadeGCo2ePorKwh === 0) {
    return `${maior.local} tem maior intensidade de carbono que ${menor.local}; como a menor intensidade é zero, não é possível expressar a diferença em vezes.`;
  }

  const vezes = maior.intensidadeGCo2ePorKwh / menor.intensidadeGCo2ePorKwh;
  return `Por kWh consumido, ${maior.local} emite ${formatoComparacao.format(vezes)} vezes mais CO₂e por kWh que ${menor.local}. A diferença ocorre porque a intensidade de carbono da eletricidade varia entre regiões.`;
}

export function filtrarPorRegiao<T extends { regiaoCodigo: string }>(
  itens: T[],
  regiao: string | null,
): T[] {
  return regiao === null
    ? itens
    : itens.filter(({ regiaoCodigo }) => regiaoCodigo === regiao);
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
