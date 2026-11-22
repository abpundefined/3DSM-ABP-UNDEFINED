import type { PeriodoConsultado } from './mapa';

export type RegiaoSimulada = {
  codigo: string;
  pais: string;
  regiao: string;
  cidade: string | null;
  intensidadeGCo2ePorKwh: number | null;
  amostrasIntensidade: number;
  emissaoEstimadaGCo2e: number | null;
  diferencaGCo2e: number | null;
  diferencaPercentual: number | null;
  atual: boolean;
  menorEmissao: boolean;
};

export type RespostaSimulacao = {
  periodo: PeriodoConsultado;
  servico: { servicoId: number; nome: string; regiaoCodigo: string };
  energiaKwh: number | null;
  coletasConsideradas: number;
  emissaoAtualGCo2e: number | null;
  melhorRegiaoCodigo: string | null;
  regioes: RegiaoSimulada[];
};
