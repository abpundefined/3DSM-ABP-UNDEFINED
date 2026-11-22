import { Injectable } from "@nestjs/common";
import type { EstadoMonitoramento } from "../../generated/prisma/enums";
import type { ContagemColetas } from "../../common/regras/resumo-coletas";
import { PrismaService } from "../../database/prisma.service";

export interface ContagemServicos {
  estado: EstadoMonitoramento;
  quantidade: number;
}

@Injectable()
export class SaudeRepository {
  constructor(private readonly prisma: PrismaService) {}

  async contarColetasDesde(inicio: Date): Promise<ContagemColetas[]> {
    const grupos = await this.prisma.coleta.groupBy({
      by: ["estadoColeta"],
      where: { iniciadaEm: { gte: inicio } },
      _count: { _all: true },
    });

    return grupos.map((grupo) => ({
      estado: grupo.estadoColeta,
      quantidade: grupo._count._all,
    }));
  }

  async contarServicosPorEstado(): Promise<ContagemServicos[]> {
    const grupos = await this.prisma.servico.groupBy({
      by: ["estadoAtual"],
      _count: { _all: true },
    });

    return grupos.map((grupo) => ({
      estado: grupo.estadoAtual,
      quantidade: grupo._count._all,
    }));
  }
}
