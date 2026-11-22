import type { EstadoMonitoramento } from './mapa';

export type EstadoIntegracao = 'OPERACIONAL' | 'FALHA' | 'SEM_CONSULTA';

export type IntegracaoSaude = {
  estado: EstadoIntegracao;
  ultimaConsultaEm: string | null;
  tempoRespostaMs: number | null;
  ultimoSucessoEm: string | null;
  mensagemErro: string | null;
};

export type ColetasUltimaHora = {
  total: number;
  falhas: number;
  taxaFalha: number | null;
};

export type RespostaSaude = {
  geradoEm: string;
  agregador: IntegracaoSaude;
  apiCarbono: IntegracaoSaude;
  ultimaDescobertaEm: string | null;
  coletasUltimaHora: ColetasUltimaHora;
  servicosPorEstado: Record<EstadoMonitoramento, number>;
};
