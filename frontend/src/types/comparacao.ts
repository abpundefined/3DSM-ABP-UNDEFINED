import type { BackendService } from '../components/dashboard/liveTypes';
import type { PeriodoConsultado } from './mapa';

export type TotaisComparacao = {
  energiaKwh: number | null;
  emissaoGCo2e: number | null;
  cpuMedia: number | null;
  memoriaMediaMb: number | null;
  coletasValidas: number;
};

export type PontoComparacao = {
  inicio: string;
  energiaKwh: number | null;
  emissaoGCo2e: number | null;
};

export type ServicoComparacao = {
  servicoId: number;
  nome: string;
  totais: TotaisComparacao;
  serie: PontoComparacao[];
};

export type RespostaComparacao = {
  periodo: PeriodoConsultado;
  granularidade: 'hora' | 'dia';
  servicos: ServicoComparacao[];
};

export type ServicoSelecionavel = Pick<
  BackendService,
  'id' | 'nome' | 'regiaoCodigo' | 'estadoAtual' | 'localizacao'
>;
