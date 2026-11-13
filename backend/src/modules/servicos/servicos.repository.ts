import { Injectable } from "@nestjs/common";
import type { EstadoMonitoramento } from "../../generated/prisma/enums";
import type { Prisma, Servico } from "../../generated/prisma/client";
import { PrismaService } from "../../database/prisma.service";

type RegiaoDescoberta = {
  codigo: string;
  pais: string;
  regiao: string;
  cidade: string | null;
  latitude: number | null;
  longitude: number | null;
};

type ServicoDescoberto = {
  idExterno: string;
  nome: string;
  regiaoCodigo: string;
  caminhoMetricas: string;
};

type ServicoComRegiao = Prisma.ServicoGetPayload<{
  include: { regiao: true };
}>;

@Injectable()
export class ServicosRepository {
  constructor(private readonly prisma: PrismaService) {}

  async upsertRegiao(regiao: RegiaoDescoberta) {
    const atualizadaEm = new Date();
    return this.prisma.regiao.upsert({
      where: { codigo: regiao.codigo },
      update: {
        ...regiao,
        atualizadaEm,
      },
      create: {
        ...regiao,
        atualizadaEm,
      },
    });
  }

  async upsertServicoDescoberto(servico: ServicoDescoberto) {
    const agora = new Date();
    return this.prisma.servico.upsert({
      where: { idExterno: servico.idExterno },
      update: {
        nome: servico.nome,
        regiaoCodigo: servico.regiaoCodigo,
        caminhoMetricas: servico.caminhoMetricas,
        ultimaVezListadoEm: agora,
        atualizadoEm: agora,
      },
      create: {
        idExterno: servico.idExterno,
        nome: servico.nome,
        regiaoCodigo: servico.regiaoCodigo,
        caminhoMetricas: servico.caminhoMetricas,
        estadoAtual: "DESCONHECIDO",
        descobertoEm: agora,
        ultimaVezListadoEm: agora,
        atualizadoEm: agora,
      },
    });
  }

  async restaurarServicosRemovidos(idsExternos: string[]) {
    if (idsExternos.length === 0) return;

    await this.prisma.servico.updateMany({
      where: {
        idExterno: { in: idsExternos },
        estadoAtual: "REMOVIDO",
      },
      data: {
        estadoAtual: "DESCONHECIDO",
        atualizadoEm: new Date(),
      },
    });
  }

  async listarIdsExternos(): Promise<string[]> {
    const servicos = await this.prisma.servico.findMany({
      select: { idExterno: true },
    });
    return servicos.map((servico) => servico.idExterno);
  }

  async marcarServicosComoRemovidos(idsExternos: string[]) {
    if (idsExternos.length === 0) return;

    await this.prisma.servico.updateMany({
      where: { idExterno: { in: idsExternos } },
      data: {
        estadoAtual: "REMOVIDO",
        atualizadoEm: new Date(),
      },
    });
  }

  async verificarSchema() {
    return this.prisma.verifySchema();
  }

  async listarParaMonitoramento() {
    return this.prisma.servico.findMany({
      where: {
        estadoAtual: {
          not: "REMOVIDO",
        },
      },
      orderBy: { atualizadoEm: "desc" },
    });
  }

  async atualizarEstadoMonitoramento(
    id: number,
    estadoAtual: EstadoMonitoramento,
  ) {
    return this.prisma.servico.update({
      where: { id },
      data: {
        estadoAtual,
        atualizadoEm: new Date(),
      },
    });
  }

  async listarComLocalizacao(): Promise<ServicoComRegiao[]> {
    return this.prisma.servico.findMany({
      orderBy: { atualizadoEm: "desc" },
      include: { regiao: true },
    });
  }

  async findById(id: number): Promise<Servico | null> {
    return this.prisma.servico.findUnique({
      where: { id },
    });
  }
}
