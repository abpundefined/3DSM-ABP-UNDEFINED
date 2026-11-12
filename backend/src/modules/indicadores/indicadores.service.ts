import { BadRequestException, Injectable } from "@nestjs/common";
import { subMilliseconds } from "date-fns";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import type { EstadoMonitoramento } from "../../generated/prisma/enums";
import {
  ContagemPorEstado,
  IndicadoresRepository,
} from "./indicadores.repository";

const TIME_ZONE = "America/Sao_Paulo";

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
    tipoPeriodo?: string,
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
      tipoPeriodo === "mes-anterior"
        ? this.intervaloMesComparacao(inicio)
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

  private intervaloMesComparacao(inicio: Date): { inicio: Date; fim: Date } {
    const mesSelecionado = formatInTimeZone(inicio, TIME_ZONE, "yyyy-MM");
    const [anoSelecionado, numeroMesSelecionado] = mesSelecionado
      .split("-")
      .map(Number);
    const anoComparacao =
      numeroMesSelecionado === 1 ? anoSelecionado - 1 : anoSelecionado;
    const numeroMesComparacao =
      numeroMesSelecionado === 1 ? 12 : numeroMesSelecionado - 1;
    const mesComparacao = `${anoComparacao.toString().padStart(4, "0")}-${numeroMesComparacao
      .toString()
      .padStart(2, "0")}`;

    return {
      inicio: fromZonedTime(`${mesComparacao}-01T00:00:00.000`, TIME_ZONE),
      fim: subMilliseconds(inicio, 1),
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
