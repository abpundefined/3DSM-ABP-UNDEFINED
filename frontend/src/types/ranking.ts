import type { PeriodoConsultado } from './mapa';

export type MetricaRanking = 'energia' | 'emissao';

export type ItemRanking = {
  posicao: number;
  servicoId: number;
  nome: string;
  energiaKwh: number;
  emissaoGCo2e: number;
  coletasValidas: number;
};

export type ServicoSemDados = {
  servicoId: number;
  nome: string;
};

export type RespostaRanking = {
  periodo: PeriodoConsultado;
  metrica: MetricaRanking;
  itens: ItemRanking[];
  semDados: ServicoSemDados[];
};
