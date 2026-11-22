import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";

export interface ServicoDaSimulacao {
  id: number;
  nome: string;
  regiaoCodigo: string;
}

export interface RegiaoMonitorada {
  codigo: string;
  pais: string;
  regiao: string;
  cidade: string | null;
}

export interface IntensidadeMedia {
  regiaoCodigo: string;
  intensidadeMedia: number | null;
  amostras: number;
}

@Injectable()
export class SimulacaoRepository {
  constructor(private readonly prisma: PrismaService) {}

  buscarServico(id: number): Promise<ServicoDaSimulacao | null> {
    return this.prisma.servico.findUnique({
      where: { id },
      select: { id: true, nome: true, regiaoCodigo: true },
    });
  }

  async somarEnergia(servicoId: number, inicio: Date, fim: Date) {
    const resultado = await this.prisma.coleta.aggregate({
      where: {
        servicoId,
        estadoCalculo: "CONCLUIDO",
        iniciadaEm: { gte: inicio, lte: fim },
      },
      _sum: { energiaKwh: true },
      _count: { _all: true },
    });

    return {
      energiaKwh: resultado._sum.energiaKwh,
      coletas: resultado._count._all,
    };
  }

  listarRegioes(): Promise<RegiaoMonitorada[]> {
    return this.prisma.regiao.findMany({
      where: { servicos: { some: {} } },
      select: { codigo: true, pais: true, regiao: true, cidade: true },
      orderBy: { codigo: "asc" },
    });
  }

  async mediaIntensidadePorRegiao(
    inicio: Date,
    fim: Date,
  ): Promise<IntensidadeMedia[]> {
    const grupos = await this.prisma.coleta.groupBy({
      by: ["regiaoCodigoNaColeta"],
      where: {
        iniciadaEm: { gte: inicio, lte: fim },
        regiaoCodigoNaColeta: { not: null },
        intensidadeCarbonoGCo2ePorKwh: { not: null },
      },
      _avg: { intensidadeCarbonoGCo2ePorKwh: true },
      _count: { intensidadeCarbonoGCo2ePorKwh: true },
    });

    return grupos.flatMap((grupo) =>
      grupo.regiaoCodigoNaColeta === null
        ? []
        : [
            {
              regiaoCodigo: grupo.regiaoCodigoNaColeta,
              intensidadeMedia: grupo._avg.intensidadeCarbonoGCo2ePorKwh,
              amostras: grupo._count.intensidadeCarbonoGCo2ePorKwh,
            },
          ],
    );
  }
}
