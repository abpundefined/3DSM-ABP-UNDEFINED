import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";

export interface ServicoCadastradoOportunidade {
  id: number;
  nome: string;
  estadoAtual: string;
  regiaoCodigo: string;
}

export interface MetricasServicoNoPeriodo {
  servicoId: number;
  energiaKwh: number | null;
  emissaoGCo2e: number | null;
  cpuMediaPercent: number | null;
}

export interface RegiaoMonitoradaOportunidade {
  codigo: string;
  pais: string;
  regiao: string;
  cidade: string | null;
}

export interface IntensidadeMediaRegiao {
  regiaoCodigo: string;
  intensidadeMedia: number | null;
}

export interface CelulaHorarioPorRegiao {
  regiaoCodigo: string;
  diaSemana: number;
  hora: number;
  media: number;
  quantidadeAmostras: number;
}

@Injectable()
export class OportunidadesRepository {
  constructor(private readonly prisma: PrismaService) {}

  listarServicos(): Promise<ServicoCadastradoOportunidade[]> {
    return this.prisma.servico.findMany({
      select: {
        id: true,
        nome: true,
        estadoAtual: true,
        regiaoCodigo: true,
      },
      orderBy: { id: "asc" },
    });
  }

  async agregarMetricasPorServico(
    inicio: Date,
    fim: Date,
  ): Promise<MetricasServicoNoPeriodo[]> {
    const grupos = await this.prisma.coleta.groupBy({
      by: ["servicoId"],
      where: {
        estadoCalculo: "CONCLUIDO",
        iniciadaEm: { gte: inicio, lte: fim },
      },
      _sum: { energiaKwh: true, emissaoGCo2e: true },
      _avg: { cpuPercent: true },
    });

    return grupos.map((grupo) => ({
      servicoId: grupo.servicoId,
      energiaKwh: grupo._sum.energiaKwh,
      emissaoGCo2e: grupo._sum.emissaoGCo2e,
      cpuMediaPercent: grupo._avg.cpuPercent,
    }));
  }

  listarRegioesMonitoradas(): Promise<RegiaoMonitoradaOportunidade[]> {
    return this.prisma.regiao.findMany({
      where: { servicos: { some: {} } },
      select: { codigo: true, pais: true, regiao: true, cidade: true },
      orderBy: { codigo: "asc" },
    });
  }

  async mediaIntensidadePorRegiao(
    inicio: Date,
    fim: Date,
  ): Promise<IntensidadeMediaRegiao[]> {
    const linhas = await this.prisma.$queryRaw<
      Array<{
        regiaoCodigo: string;
        intensidadeMedia: number | null;
      }>
    >`
      SELECT
        COALESCE(c."regiaoCodigoNaColeta", s."regiaoCodigo") AS "regiaoCodigo",
        AVG(c."intensidadeCarbonoGCo2ePorKwh")::double precision AS "intensidadeMedia"
      FROM "Coleta" c
      INNER JOIN "Servico" s ON s."id" = c."servicoId"
      WHERE c."iniciadaEm" >= ${inicio}
        AND c."iniciadaEm" <= ${fim}
        AND COALESCE(c."regiaoCodigoNaColeta", s."regiaoCodigo") IS NOT NULL
        AND c."intensidadeCarbonoGCo2ePorKwh" IS NOT NULL
      GROUP BY 1
    `;

    return linhas.map((linha) => ({
      regiaoCodigo: linha.regiaoCodigo,
      intensidadeMedia:
        linha.intensidadeMedia === null ? null : Number(linha.intensidadeMedia),
    }));
  }

  async obterMatrizHorariaPorRegiao(
    inicio: Date,
    fim: Date,
  ): Promise<CelulaHorarioPorRegiao[]> {
    const linhas = await this.prisma.$queryRaw<
      Array<{
        regiaoCodigo: string;
        diaSemana: number;
        hora: number;
        media: number;
        quantidadeAmostras: bigint | number;
      }>
    >`
      SELECT
        COALESCE(c."regiaoCodigoNaColeta", s."regiaoCodigo") AS "regiaoCodigo",
        EXTRACT(DOW FROM c."iniciadaEm" AT TIME ZONE 'America/Sao_Paulo')::int AS "diaSemana",
        EXTRACT(HOUR FROM c."iniciadaEm" AT TIME ZONE 'America/Sao_Paulo')::int AS "hora",
        AVG(c."intensidadeCarbonoGCo2ePorKwh")::double precision AS "media",
        COUNT(*)::int AS "quantidadeAmostras"
      FROM "Coleta" c
      INNER JOIN "Servico" s ON s."id" = c."servicoId"
      WHERE c."iniciadaEm" >= ${inicio}
        AND c."iniciadaEm" <= ${fim}
        AND COALESCE(c."regiaoCodigoNaColeta", s."regiaoCodigo") IS NOT NULL
        AND c."intensidadeCarbonoGCo2ePorKwh" IS NOT NULL
      GROUP BY 1, 2, 3
    `;

    return linhas.map((linha) => ({
      regiaoCodigo: linha.regiaoCodigo,
      diaSemana: Number(linha.diaSemana),
      hora: Number(linha.hora),
      media: Number(linha.media),
      quantidadeAmostras: Number(linha.quantidadeAmostras),
    }));
  }
}
