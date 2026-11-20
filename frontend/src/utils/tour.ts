export const TOUR_STORAGE_KEY = 'greener-tour-visto';

export type PassoTour = {
  id: string;
  titulo: string;
  descricao: string;
  seletor: string;
};

export const PASSOS_TOUR: readonly PassoTour[] = [
  {
    id: 'periodo',
    titulo: 'Seletor de período',
    descricao:
      'Escolha 24 horas, 7 dias, 30 dias, mês ou um intervalo personalizado para recalcular todos os indicadores juntos.',
    seletor: '.period-selector, [aria-label="Seletor de período"]',
  },
  {
    id: 'cards-selo',
    titulo: 'Indicadores, cards e selo',
    descricao:
      'Acompanhe o consumo total, emissões de CO₂e, meta mensal e o estado de cada serviço monitorado — incluindo o selo de eficiência quando disponível.',
    seletor: '[aria-label="Indicadores gerais"], .metrics-grid',
  },
  {
    id: 'tendencia-composicao',
    titulo: 'Tendência e composição',
    descricao:
      'Visualize a evolução das emissões no período e quanto do consumo vem de CPU, memória, disco e rede.',
    seletor: '.tendencia-painel, .composicao-energia, .demo-chart-grid',
  },
  {
    id: 'oportunidades',
    titulo: 'Oportunidades de redução',
    descricao:
      'Veja sugestões estimadas para reduzir emissões, como migração de região, ajuste de horário ou revisão de recursos.',
    seletor:
      '[data-tour="oportunidades"], [aria-label="Oportunidades de redução"]',
  },
  {
    id: 'mapa',
    titulo: 'Mapa de emissões',
    descricao:
      'Explore no mapa onde cada serviço opera e como a intensidade de carbono muda entre regiões monitoradas.',
    seletor: 'a[href^="/mapa"]',
  },
  {
    id: 'metodologia',
    titulo: 'Como calculamos',
    descricao:
      'Consulte a qualquer momento as fórmulas, fontes de intensidade de carbono e limites das estimativas do GreenER.',
    seletor: 'a[href^="/metodologia"]',
  },
];

export type ArmazenamentoLeitura = {
  getItem: (key: string) => string | null;
};

export type ArmazenamentoEscrita = {
  setItem: (key: string, value: string) => void;
};

function obterLocalStorageSeguro(): Storage | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
}

export function jaViuTour(
  storage: ArmazenamentoLeitura | null = obterLocalStorageSeguro(),
): boolean {
  try {
    return storage?.getItem(TOUR_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export function marcarTourComoVisto(
  storage: ArmazenamentoEscrita | null = obterLocalStorageSeguro(),
): boolean {
  try {
    storage?.setItem(TOUR_STORAGE_KEY, '1');
    return true;
  } catch {
    return false;
  }
}

export function filtrarPassosDisponiveis(
  passos: readonly PassoTour[],
  existeElemento: (seletor: string) => boolean,
): PassoTour[] {
  return passos.filter((passo) => {
    try {
      return existeElemento(passo.seletor);
    } catch {
      return false;
    }
  });
}

export function proximoIndiceTour(
  indiceAtual: number,
  totalPassos: number,
): number | null {
  if (totalPassos <= 0 || indiceAtual + 1 >= totalPassos) {
    return null;
  }
  return indiceAtual + 1;
}

export function anteriorIndiceTour(indiceAtual: number): number {
  return Math.max(0, indiceAtual - 1);
}
