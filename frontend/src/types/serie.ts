import type { Granularidade, PeriodoConsultado } from './mapa';

export type { Granularidade };

export type PontoDaSerie = {
  inicio: string;
  energiaKwh: number | null;
  emissaoGCo2e: number | null;
};

export type SerieDoServico = {
  servicoId: number;
  nome: string;
  serie: PontoDaSerie[];
};

export type RespostaSerie = {
  periodo: PeriodoConsultado;
  granularidade: Granularidade;
  intervalos: string[];
  global: PontoDaSerie[];
  servicos: SerieDoServico[];
};
