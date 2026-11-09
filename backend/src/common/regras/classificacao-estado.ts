import type { EstadoMonitoramento } from "../../generated/prisma/enums";
import { EstadoColetaEnum } from "../../modules/coletas/estados-coleta.enum";

export interface MedicoesColeta {
  cpuPercent?: number | null;
  memoryGb?: number | null;
  diskGb?: number | null;
  networkGb?: number | null;
}

export interface ClassificacaoEstado {
  estadoServico: EstadoMonitoramento;
  estadoColeta: EstadoColetaEnum;
  codigoErro?: string;
}

const HTTP_NAO_ENCONTRADO = 404;

const ehMedicaoUtil = (valor: number | null | undefined): boolean =>
  typeof valor === "number" && Number.isFinite(valor) && valor > 0;

export const possuiMedicoes = (medicoes: MedicoesColeta): boolean =>
  [
    medicoes.cpuPercent,
    medicoes.memoryGb,
    medicoes.diskGb,
    medicoes.networkGb,
  ].some(ehMedicaoUtil);

export const classificarMedicoes = (
  medicoes: MedicoesColeta,
): ClassificacaoEstado =>
  possuiMedicoes(medicoes)
    ? {
        estadoServico: "DISPONIVEL",
        estadoColeta: EstadoColetaEnum.SUCESSO,
      }
    : {
        estadoServico: "SEM_METRICAS",
        estadoColeta: EstadoColetaEnum.SEM_METRICAS,
      };

export const classificarRespostaHttp = (status: number): ClassificacaoEstado =>
  status === HTTP_NAO_ENCONTRADO
    ? {
        estadoServico: "SEM_METRICAS",
        estadoColeta: EstadoColetaEnum.SEM_METRICAS,
        codigoErro: String(status),
      }
    : {
        estadoServico: "INDISPONIVEL",
        estadoColeta: EstadoColetaEnum.FALHA,
        codigoErro: String(status),
      };

export const classificarFalhaDeConexao = (
  tempoEsgotado: boolean,
): ClassificacaoEstado => ({
  estadoServico: "INDISPONIVEL",
  estadoColeta: EstadoColetaEnum.FALHA,
  codigoErro: tempoEsgotado ? "TIMEOUT" : "FETCH_ERROR",
});
