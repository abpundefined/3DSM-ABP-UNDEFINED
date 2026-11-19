export type PeriodoRelatorio = {
  inicio: string;
  fim: string;
};

export type ResumoServicosRelatorio = {
  monitorados: number;
  disponiveis: number;
  indisponiveis: number;
  semMetricas: number;
  desconhecidos: number;
  removidos: number;
};

export type IndicadoresRelatorio = {
  periodo: PeriodoRelatorio | null;
  energiaTotalKwh: number;
  emissaoTotalGCo2e: number;
  coletasCalculadas: number;
  servicos: ResumoServicosRelatorio;
  geradoEm: string | null;
  versaoCalculo: string | null;
};

export type PontoSerieRelatorio = {
  inicio: string;
  energiaKwh: number | null;
  emissaoGCo2e: number | null;
  energia: number | null;
  emissao: number | null;
};

export type EscalaRelatorio = {
  unidade: string;
  fator: number;
};

export type ResumoSerieRelatorio = {
  periodo: PeriodoRelatorio;
  granularidade: 'hora' | 'dia';
  granularidadeHoraria: boolean;
  escalaEnergia: EscalaRelatorio;
  escalaEmissao: EscalaRelatorio;
  possuiDados: boolean;
  pontos: PontoSerieRelatorio[];
};

export type ItemTopEmissorRelatorio = {
  posicao: number;
  servicoId: number;
  nome: string;
  energiaKwh: number;
  emissaoGCo2e: number;
  coletasValidas: number;
  selo: string | null;
};

export type OportunidadeRelatorio = {
  servicoId: number | null;
  servicoNome: string;
  tipo: string;
  explicacao: string;
  economiaGCo2e: number | null;
  economiaPercentual: number | null;
};

export type DadosRelatorio = {
  indicadores: IndicadoresRelatorio;
  serie: ResumoSerieRelatorio;
  topEmissores: ItemTopEmissorRelatorio[];
  oportunidades: OportunidadeRelatorio[] | null;
};
