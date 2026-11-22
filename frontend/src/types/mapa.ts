export type EstadoMonitoramento =
  'DISPONIVEL' | 'INDISPONIVEL' | 'SEM_METRICAS' | 'REMOVIDO' | 'DESCONHECIDO';

export type Granularidade = 'hora' | 'dia';

export type PeriodoConsultado = {
  inicio: string;
  fim: string;
};

export type TotaisAmbientais = {
  energiaKwh: number | null;
  emissaoGCo2e: number | null;
};

export type ServicoNoMapa = {
  servicoId: number;
  nome: string;
  estado: EstadoMonitoramento;
  regiaoCodigo: string;
  latitude: number;
  longitude: number;
  local: string;
  totais: TotaisAmbientais;
  serie: (number | null)[];
};

export type ServicoSemCoordenadas = {
  servicoId: number;
  nome: string;
  estado: EstadoMonitoramento;
  regiaoCodigo: string;
  totais: TotaisAmbientais;
};

export type RespostaMapa = {
  periodo: PeriodoConsultado;
  granularidade: Granularidade;
  intervalos: string[];
  servicos: ServicoNoMapa[];
  semCoordenadas: ServicoSemCoordenadas[];
};
