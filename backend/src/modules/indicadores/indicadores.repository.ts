import { Injectable } from "@nestjs/common";
import type { EstadoMonitoramento } from "../../generated/prisma/enums";
import { PrismaService } from "../../database/prisma.service";

export interface TotaisAmbientais {
  energiaKwh: number | null;
  emissaoGCo2e: number | null;
  coletasCalculadas: number;
}

export interface ContagemPorEstado {
  estado: EstadoMonitoramento;
  quantidade: number;
}

@Injectable()
export class IndicadoresRepository {
  constructor(private readonly prisma: PrismaService) {}

  async somarImpactoNoPeriodo(
    inicio: Date,
    fim: Date,
  ): Promise<TotaisAmbientais> {
    const resultado = await this.prisma.coleta.aggregate({
      where: {
        estadoCalculo: "CONCLUIDO",
        iniciadaEm: { gte: inicio, lte: fim },
      },
      _sum: { energiaKwh: true, emissaoGCo2e: true },
      _count: { _all: true },
    });

    return {
      energiaKwh: resultado._sum.energiaKwh,
      emissaoGCo2e: resultado._sum.emissaoGCo2e,
      coletasCalculadas: resultado._count._all,
    };
  }

  async contarServicosPorEstado(): Promise<ContagemPorEstado[]> {
    const grupos = await this.prisma.servico.groupBy({
      by: ["estadoAtual"],
      _count: { _all: true },
    });

    return grupos.map((grupo) => ({
      estado: grupo.estadoAtual,
      quantidade: grupo._count._all,
    }));
  }

  async buscarUltimaColetaEm(): Promise<Date | null> {
    const resultado = await this.prisma.coleta.aggregate({
      _max: { iniciadaEm: true },
    });

    return resultado._max.iniciadaEm;
  }
}
