import type { ServiceLocation } from '../../utils/formatters';

export type BackendService = {
  id: number;
  idExterno: string;
  nome: string;
  regiaoCodigo: string;
  localizacao?: ServiceLocation | null;
  estadoAtual:
    | 'DISPONIVEL'
    | 'INDISPONIVEL'
    | 'SEM_METRICAS'
    | 'REMOVIDO'
    | 'DESCONHECIDO';
  energiaKwh?: number | string | null;
  emissaoGCo2e?: number | string | null;
};

export type BackendCollection = {
  iniciadaEm: string;
  intervaloColetaSegundos?: number | null;
  cpuPercent: number | null;
  memoryGb: number | null;
  diskGb: number | null;
  networkGb: number | null;
  intensidadeCarbonoGCo2ePorKwh?: number | string | null;
  energiaKwh: number | string | null;
  emissaoGCo2e: number | string | null;
};

export type LiveService = BackendService & {
  latestCollection: BackendCollection | null;
};
