import { BadRequestException, Injectable } from "@nestjs/common";
import type { EstadoMonitoramento } from "../../generated/prisma/enums";
import { FiltroIndicadoresDto } from "./dto/filtro-indicadores.dto";
import {
  ContagemPorEstado,
  IndicadoresRepository,
} from "./indicadores.repository";

export const PERIODO_PADRAO_HORAS = 24;

const MILISSEGUNDOS_POR_HORA = 60 * 60 * 1000;

export interface ResumoServicos {
  monitorados: number;
  disponiveis: number;
  indisponiveis: number;
  semMetricas: number;
  desconhecidos: number;
  removidos: number;
}

export interface IndicadoresConsolidados {
  periodo: { inicio: Date; fim: Date };
  energiaTotalKwh: number;
  emissaoTotalGCo2e: number;
  coletasCalculadas: number;
  servicos: ResumoServicos;
  ultimaColetaEm: Date | null;
  geradoEm: Date;
}

@Injectable()
export class IndicadoresService {
  constructor(private readonly indicadoresRepository: IndicadoresRepository) {}

  async obter(filtro: FiltroIndicadoresDto): Promise<IndicadoresConsolidados> {
    const geradoEm = new Date();
    const fim = filtro.dataFim ?? geradoEm;
    const inicio =
      filtro.dataInicio ??
      new Date(fim.getTime() - PERIODO_PADRAO_HORAS * MILISSEGUNDOS_POR_HORA);

    if (inicio.getTime() > fim.getTime()) {
      throw new BadRequestException(
        "dataInicio deve ser anterior ou igual a dataFim.",
      );
    }

    const [totais, contagens, ultimaColetaEm] = await Promise.all([
      this.indicadoresRepository.somarImpactoNoPeriodo(inicio, fim),
      this.indicadoresRepository.contarServicosPorEstado(),
      this.indicadoresRepository.buscarUltimaColetaEm(),
    ]);

    return {
      periodo: { inicio, fim },
      energiaTotalKwh: totais.energiaKwh ?? 0,
      emissaoTotalGCo2e: totais.emissaoGCo2e ?? 0,
      coletasCalculadas: totais.coletasCalculadas,
      servicos: this.resumirServicos(contagens),
      ultimaColetaEm,
      geradoEm,
    };
  }

  private resumirServicos(contagens: ContagemPorEstado[]): ResumoServicos {
    const quantidade = (estado: EstadoMonitoramento) =>
      contagens.find((contagem) => contagem.estado === estado)?.quantidade ?? 0;

    const disponiveis = quantidade("DISPONIVEL");
    const indisponiveis = quantidade("INDISPONIVEL");
    const semMetricas = quantidade("SEM_METRICAS");
    const desconhecidos = quantidade("DESCONHECIDO");

    return {
      monitorados: disponiveis + indisponiveis + semMetricas + desconhecidos,
      disponiveis,
      indisponiveis,
      semMetricas,
      desconhecidos,
      removidos: quantidade("REMOVIDO"),
    };
  }
}
