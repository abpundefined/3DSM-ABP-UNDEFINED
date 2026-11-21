import type { PeriodoConsultado } from './mapa';
import type { VariacaoPercentual, VariacaoPorServico } from './variacao';

export type MetricaRanking = 'energia' | 'emissao';

export type ItemRanking = {
  posicao: number;
  servicoId: number;
  nome: string;
  energiaKwh: number;
  emissaoGCo2e: number;
  coletasValidas: number;
  selo: string;
};

export type ServicoSemDados = {
  servicoId: number;
  nome: string;
  selo: string;
};

export type RespostaRanking = {
  periodo: PeriodoConsultado;
  periodoAnterior?: PeriodoConsultado;
  variacaoPercentual?: VariacaoPercentual;
  variacaoPorServico?: VariacaoPorServico[];
  metrica: MetricaRanking;
  itens: ItemRanking[];
  semDados: ServicoSemDados[];
};
