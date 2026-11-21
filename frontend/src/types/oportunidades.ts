export type TipoOportunidade =
  'MIGRAR_REGIAO' | 'SUPERDIMENSIONAMENTO' | 'MUDAR_HORARIO';

export type FiltroTipoOportunidade = 'TODOS' | TipoOportunidade;

export type LimiaresOportunidades = {
  reducaoMinimaMigrarRegiaoPercentual: number;
  cpuMaximaSuperdimensionamentoPercentual: number;
  reducaoEstimadaSuperdimensionamentoPercentual: number;
  reducaoMinimaMudarHorarioPercentual: number;
  duracaoJanelaHorarioHoras: number;
};

export type OportunidadeReducao = {
  id: string;
  servicoId: number;
  servicoNome: string;
  regiaoCodigo: string;
  tipo: TipoOportunidade;
  titulo: string;
  explicacao: string;
  economiaEstimadaGCo2e: number;
  economiaPercentual: number;
  emissaoAtualGCo2e: number;
  linkDetalhe: string;
};

export type RespostaOportunidades = {
  periodo: { inicio: string; fim: string };
  resumo: {
    totalOportunidades: number;
    reducaoPotencialGCo2e: number;
    porTipo: Record<TipoOportunidade, number>;
  };
  limiares: LimiaresOportunidades;
  aviso: string;
  oportunidades: OportunidadeReducao[];
};
