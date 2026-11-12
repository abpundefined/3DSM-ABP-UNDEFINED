import { BadRequestException, Injectable } from "@nestjs/common";
import type { EstadoMonitoramento } from "../../generated/prisma/enums";
import { intervaloMesCalendarioAnterior } from "./date-conversion.helper";
import { PeriodoPredefinido } from "./dto/periodo.dto";
import {
  ContagemPorEstado,
  IndicadoresRepository,
} from "./indicadores.repository";

export interface ResumoServicos {
  monitorados: number;
  disponiveis: number;
  indisponiveis: number;
  semMetricas: number;
  desconhecidos: number;
  removidos: number;
}

export interface IndicadoresConsolidados {
  periodo: { inicio: string; fim: string };
  variacao?: {
    energiaTotalKwh: VariacaoIndicador;
    emissaoTotalGCo2e: VariacaoIndicador;
    coletasCalculadas: VariacaoIndicador;
  };
  energiaTotalKwh: number;
  emissaoTotalGCo2e: number;
  coletasCalculadas: number;
  servicos: ResumoServicos;
  ultimaColetaEm: Date | null;
  geradoEm: Date;
}

export interface VariacaoIndicador {
  absoluta: number;
  percentual: number | null;
}

@Injectable()
export class IndicadoresService {
  constructor(private readonly indicadoresRepository: IndicadoresRepository) {}

  async obter(
    inicio: Date,
    fim: Date,
    tipoPeriodo?: PeriodoPredefinido,
  ): Promise<IndicadoresConsolidados> {
    const geradoEm = new Date();

    if (
      !Number.isFinite(inicio.getTime()) ||
      !Number.isFinite(fim.getTime()) ||
      inicio.getTime() >= fim.getTime()
    ) {
      throw new BadRequestException("inicio deve ser anterior a fim.");
    }

    const periodoComparacao =
      tipoPeriodo === PeriodoPredefinido.MES_ANTERIOR
        ? intervaloMesCalendarioAnterior(inicio)
        : null;

    const [totais, contagens, ultimaColetaEm, totaisComparacao] =
      await Promise.all([
        this.indicadoresRepository.somarImpactoNoPeriodo(inicio, fim),
        this.indicadoresRepository.contarServicosPorEstado(),
        this.indicadoresRepository.buscarUltimaColetaEm(),
        periodoComparacao
          ? this.indicadoresRepository.somarImpactoNoPeriodo(
              periodoComparacao.inicio,
              periodoComparacao.fim,
            )
          : Promise.resolve(null),
      ]);

    const energiaTotalKwh = totais.energiaKwh ?? 0;
    const emissaoTotalGCo2e = totais.emissaoGCo2e ?? 0;
    const variacao = totaisComparacao
      ? {
          energiaTotalKwh: this.calcularVariacao(
            energiaTotalKwh,
            totaisComparacao.energiaKwh ?? 0,
          ),
          emissaoTotalGCo2e: this.calcularVariacao(
            emissaoTotalGCo2e,
            totaisComparacao.emissaoGCo2e ?? 0,
          ),
          coletasCalculadas: this.calcularVariacao(
            totais.coletasCalculadas,
            totaisComparacao.coletasCalculadas,
          ),
        }
      : undefined;

    return {
      periodo: { inicio: inicio.toISOString(), fim: fim.toISOString() },
      ...(variacao ? { variacao } : {}),
      energiaTotalKwh,
      emissaoTotalGCo2e,
      coletasCalculadas: totais.coletasCalculadas,
      servicos: this.resumirServicos(contagens),
      ultimaColetaEm,
      geradoEm,
    };
  }

  private calcularVariacao(
    valorAtual: number,
    valorComparacao: number,
  ): VariacaoIndicador {
    const absoluta = valorAtual - valorComparacao;

    return {
      absoluta,
      percentual:
        valorComparacao === 0
          ? valorAtual === 0
            ? 0
            : null
          : (absoluta / valorComparacao) * 100,
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
