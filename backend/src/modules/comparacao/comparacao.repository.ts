import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import {
  Granularidade,
  parametrosDeTruncamento,
} from "../../common/utils/intervalos-periodo";

export interface TotaisComparacao {
  servicoId: number;
  energiaKwh: number | null;
  emissaoGCo2e: number | null;
  cpuMedia: number | null;
  memoriaMediaMb: number | null;
  coletasValidas: number;
}

export interface IntervaloComparacao {
  servicoId: number;
  inicio: Date;
  energiaKwh: number | null;
  emissaoGCo2e: number | null;
}

@Injectable()
export class ComparacaoRepository {
  constructor(private readonly prisma: PrismaService) {}

  listarServicos(ids: number[]) {
    return this.prisma.servico.findMany({
      where: { id: { in: ids } },
      select: { id: true, nome: true },
    });
  }

  async obterTotais(
    ids: number[],
    inicio: Date,
    fim: Date,
  ): Promise<TotaisComparacao[]> {
    const grupos = await this.prisma.coleta.groupBy({
      by: ["servicoId"],
      where: {
        servicoId: { in: ids },
        estadoCalculo: "CONCLUIDO",
        iniciadaEm: { gte: inicio, lte: fim },
      },
      _sum: { energiaKwh: true, emissaoGCo2e: true },
      _avg: { cpuPercent: true, memoryGb: true },
      _count: { _all: true },
    });
    return grupos.map((grupo) => ({
      servicoId: grupo.servicoId,
      energiaKwh: grupo._sum.energiaKwh,
      emissaoGCo2e: grupo._sum.emissaoGCo2e,
      cpuMedia: grupo._avg.cpuPercent,
      memoriaMediaMb:
        grupo._avg.memoryGb === null ? null : grupo._avg.memoryGb * 1024,
      coletasValidas: grupo._count._all,
    }));
  }

  obterSerie(
    ids: number[],
    inicio: Date,
    fim: Date,
    granularidade: Granularidade,
  ): Promise<IntervaloComparacao[]> {
    const { unidade, fuso } = parametrosDeTruncamento(granularidade);
    return this.prisma.$queryRaw<IntervaloComparacao[]>`
      SELECT
        c."servicoId" AS "servicoId",
        date_trunc(${unidade}::text, c."iniciadaEm" AT TIME ZONE ${fuso}::text)
          AT TIME ZONE ${fuso}::text AS "inicio",
        SUM(c."energiaKwh") AS "energiaKwh",
        SUM(c."emissaoGCo2e") AS "emissaoGCo2e"
      FROM "Coleta" c
      WHERE c."estadoCalculo" = 'CONCLUIDO'
        AND c."servicoId" = ANY(${ids}::int[])
        AND c."iniciadaEm" >= ${inicio}
        AND c."iniciadaEm" <= ${fim}
      GROUP BY 1, 2
      ORDER BY 1, 2
    `;
  }
}
