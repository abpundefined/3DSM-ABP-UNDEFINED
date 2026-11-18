import { Injectable } from "@nestjs/common";
import type { EstadoMonitoramento } from "../../generated/prisma/enums";
import { PrismaService } from "../../database/prisma.service";
import {
  Granularidade,
  parametrosDeTruncamento,
} from "../../common/utils/intervalos-periodo";

export interface ImpactoPorServico {
  servicoId: number;
  energiaKwh: number | null;
  emissaoGCo2e: number | null;
  coletasValidas: number;
}

export interface ServicoParaRanking {
  id: number;
  nome: string;
  estadoAtual: EstadoMonitoramento;
}

export interface TotaisAmbientais {
  energiaKwh: number | null;
  emissaoGCo2e: number | null;
  coletasCalculadas: number;
}

export interface ContagemPorEstado {
  estado: EstadoMonitoramento;
  quantidade: number;
}

export interface PontoHistoricoServico {
  inicio: Date;
  energiaKwh: number | null;
  emissaoGCo2e: number | null;
  cpuMedia: number | null;
  memoriaMediaMb: number | null;
  coletas: number;
  ativo: number;
  indisponivel: number;
  semMetricas: number;
}

export interface PontoSerieTemporal {
  inicio: Date;
  energiaKwh: number | null;
  emissaoGCo2e: number | null;
}

export interface PontoSerieTemporalPorServico extends PontoSerieTemporal {
  servicoId: number;
  nome: string;
}

export interface DadoMatrizIntensidade {
  diaSemana: number;
  hora: number;
  media: number;
  quantidadeAmostras: number;
}

interface PontoHistoricoServicoRaw extends Omit<
  PontoHistoricoServico,
  "coletas" | "ativo" | "indisponivel" | "semMetricas"
> {
  coletas: bigint;
  ativo: bigint;
  indisponivel: bigint;
  semMetricas: bigint;
}

@Injectable()
export class IndicadoresRepository {
  constructor(private readonly prisma: PrismaService) {}

  buscarServicoPorId(id: string): Promise<{ id: number } | null> {
    const servicoId = Number(id);
    if (!Number.isSafeInteger(servicoId) || servicoId < 1) {
      return Promise.resolve(null);
    }

    return this.prisma.servico.findUnique({
      where: { id: servicoId },
      select: { id: true },
    });
  }

  obterAgregacaoSerieTemporal(
    dataInicio: Date,
    dataFim: Date,
    granularidade: Granularidade,
  ): Promise<PontoSerieTemporal[]> {
    const { unidade, fuso } = parametrosDeTruncamento(granularidade);

    return this.prisma.$queryRaw<PontoSerieTemporal[]>`
      SELECT
        date_trunc(
          ${unidade}::text,
          c."iniciadaEm" AT TIME ZONE ${fuso}::text
        ) AT TIME ZONE ${fuso}::text AS "inicio",
        SUM(c."energiaKwh") AS "energiaKwh",
        SUM(c."emissaoGCo2e") AS "emissaoGCo2e"
      FROM "Coleta" c
      WHERE c."estadoCalculo" = 'CONCLUIDO'
        AND c."iniciadaEm" >= ${dataInicio}
        AND c."iniciadaEm" <= ${dataFim}
      GROUP BY 1
      ORDER BY 1
    `;
  }

  obterSerieAgrupadaPorServico(
    dataInicio: Date,
    dataFim: Date,
    granularidade: Granularidade,
  ): Promise<PontoSerieTemporalPorServico[]> {
    const { unidade, fuso } = parametrosDeTruncamento(granularidade);

    return this.prisma.$queryRaw<PontoSerieTemporalPorServico[]>`
      SELECT
        c."servicoId" AS "servicoId",
        s."nome" AS "nome",
        date_trunc(
          ${unidade}::text,
          c."iniciadaEm" AT TIME ZONE ${fuso}::text
        ) AT TIME ZONE ${fuso}::text AS "inicio",
        SUM(c."energiaKwh") AS "energiaKwh",
        SUM(c."emissaoGCo2e") AS "emissaoGCo2e"
      FROM "Coleta" c
      INNER JOIN "Servico" s ON s."id" = c."servicoId"
      WHERE c."estadoCalculo" = 'CONCLUIDO'
        AND c."iniciadaEm" >= ${dataInicio}
        AND c."iniciadaEm" <= ${dataFim}
      GROUP BY c."servicoId", s."nome", 3
      ORDER BY c."servicoId", 3
    `;
  }

  obterDadosMatrizIntensidade(
    dataInicio: Date,
    dataFim: Date,
    regiao?: string,
  ): Promise<DadoMatrizIntensidade[]> {
    const codigoRegiao = regiao ?? null;

    return this.prisma.$queryRaw<DadoMatrizIntensidade[]>`
      SELECT
        EXTRACT(DOW FROM c."iniciadaEm" AT TIME ZONE 'America/Sao_Paulo')::int AS "diaSemana",
        EXTRACT(HOUR FROM c."iniciadaEm" AT TIME ZONE 'America/Sao_Paulo')::int AS "hora",
        AVG(c."intensidadeCarbonoGCo2ePorKwh")::double precision AS "media",
        COUNT(*)::int AS "quantidadeAmostras"
      FROM "Coleta" c
      WHERE c."estadoCalculo" = 'CONCLUIDO'
        AND c."intensidadeCarbonoGCo2ePorKwh" IS NOT NULL
        AND c."iniciadaEm" >= ${dataInicio}
        AND c."iniciadaEm" <= ${dataFim}
        AND (${codigoRegiao}::text IS NULL OR c."regiaoCodigoNaColeta" = ${codigoRegiao})
      GROUP BY 1, 2
      ORDER BY 1, 2
    `;
  }

  async obterSerieTemporal(
    id: string,
    dataInicio: Date,
    dataFim: Date,
    granularidade: Granularidade,
  ): Promise<PontoHistoricoServico[]> {
    const servicoId = Number(id);
    const { unidade, fuso } = parametrosDeTruncamento(granularidade);
    const pontos = await this.prisma.$queryRaw<PontoHistoricoServicoRaw[]>`
      SELECT
        date_trunc(
          ${unidade}::text,
          c."iniciadaEm" AT TIME ZONE ${fuso}::text
        ) AT TIME ZONE ${fuso}::text AS "inicio",
        SUM(c."energiaKwh") FILTER (WHERE c."estadoCalculo" = 'CONCLUIDO') AS "energiaKwh",
        SUM(c."emissaoGCo2e") FILTER (WHERE c."estadoCalculo" = 'CONCLUIDO') AS "emissaoGCo2e",
        AVG(c."cpuPercent") AS "cpuMedia",
        AVG(c."memoryGb") * 1024 AS "memoriaMediaMb",
        COUNT(*) AS "coletas",
        SUM(CASE WHEN c."estadoColeta" = 'SUCESSO' THEN 1 ELSE 0 END) AS "ativo",
        SUM(CASE WHEN c."estadoColeta" = 'FALHA' THEN 1 ELSE 0 END) AS "indisponivel",
        SUM(CASE WHEN c."estadoColeta" = 'SEM_METRICAS' THEN 1 ELSE 0 END) AS "semMetricas"
      FROM "Coleta" c
      WHERE c."servicoId" = ${servicoId}
        AND c."iniciadaEm" >= ${dataInicio}
        AND c."iniciadaEm" <= ${dataFim}
      GROUP BY 1
      ORDER BY 1
    `;

    return pontos.map((ponto) => ({
      ...ponto,
      coletas: Number(ponto.coletas),
      ativo: Number(ponto.ativo),
      indisponivel: Number(ponto.indisponivel),
      semMetricas: Number(ponto.semMetricas),
    }));
  }

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

  async somarImpactoPorServico(
    inicio: Date,
    fim: Date,
  ): Promise<ImpactoPorServico[]> {
    const grupos = await this.prisma.coleta.groupBy({
      by: ["servicoId"],
      where: {
        estadoCalculo: "CONCLUIDO",
        iniciadaEm: { gte: inicio, lte: fim },
      },
      _sum: { energiaKwh: true, emissaoGCo2e: true },
      _count: { id: true },
    });

    return grupos.map((grupo) => ({
      servicoId: grupo.servicoId,
      energiaKwh: grupo._sum.energiaKwh,
      emissaoGCo2e: grupo._sum.emissaoGCo2e,
      coletasValidas: grupo._count.id,
    }));
  }

  listarServicosParaRanking(): Promise<ServicoParaRanking[]> {
    return this.prisma.servico.findMany({
      select: { id: true, nome: true, estadoAtual: true },
    });
  }
}
