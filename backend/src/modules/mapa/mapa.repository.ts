import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import type { EstadoMonitoramento } from "../../generated/prisma/enums";
import {
  Granularidade,
  parametrosDeTruncamento,
} from "../../common/utils/intervalos-periodo";

export interface ServicoComRegiao {
  id: number;
  nome: string;
  estadoAtual: EstadoMonitoramento;
  regiaoCodigo: string;
  regiao: {
    pais: string;
    regiao: string;
    cidade: string | null;
    latitude: number | null;
    longitude: number | null;
  };
}

export interface ImpactoPorIntervalo {
  servicoId: number;
  inicioIntervalo: Date;
  energiaKwh: number | null;
  emissaoGCo2e: number | null;
}

@Injectable()
export class MapaRepository {
  constructor(private readonly prisma: PrismaService) {}

  listarServicosComRegiao(): Promise<ServicoComRegiao[]> {
    return this.prisma.servico.findMany({
      select: {
        id: true,
        nome: true,
        estadoAtual: true,
        regiaoCodigo: true,
        regiao: {
          select: {
            pais: true,
            regiao: true,
            cidade: true,
            latitude: true,
            longitude: true,
          },
        },
      },
      orderBy: [{ nome: "asc" }, { id: "asc" }],
    });
  }

  somarImpactoPorIntervalo(
    inicio: Date,
    fim: Date,
    granularidade: Granularidade,
  ): Promise<ImpactoPorIntervalo[]> {
    const { unidade, fuso } = parametrosDeTruncamento(granularidade);

    return this.prisma.$queryRaw<ImpactoPorIntervalo[]>`
      SELECT
        c."servicoId" AS "servicoId",
        date_trunc(${unidade}::text, c."iniciadaEm" AT TIME ZONE ${fuso}::text)
          AT TIME ZONE ${fuso}::text AS "inicioIntervalo",
        SUM(c."energiaKwh") AS "energiaKwh",
        SUM(c."emissaoGCo2e") AS "emissaoGCo2e"
      FROM "Coleta" c
      WHERE c."estadoCalculo" = 'CONCLUIDO'
        AND c."iniciadaEm" >= ${inicio}
        AND c."iniciadaEm" <= ${fim}
      GROUP BY 1, 2
      ORDER BY 1, 2
    `;
  }
}
