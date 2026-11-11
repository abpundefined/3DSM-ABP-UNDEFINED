import { Injectable } from "@nestjs/common";
import type { ConfiguracaoMonitoramento } from "../../generated/prisma/client";
import { PrismaService } from "../../database/prisma.service";
import { AtualizarConfiguracaoDto } from "./dto/atualizar-configuracao.dto";

@Injectable()
export class ConfiguracaoRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAtual(): Promise<ConfiguracaoMonitoramento | null> {
    return this.prisma.configuracaoMonitoramento.findFirst({
      orderBy: { id: "asc" },
    });
  }

  async salvar(
    data: AtualizarConfiguracaoDto,
  ): Promise<ConfiguracaoMonitoramento> {
    const atual = await this.findAtual();

    if (atual) {
      return this.prisma.configuracaoMonitoramento.update({
        where: { id: atual.id },
        data,
      });
    }

    return this.prisma.configuracaoMonitoramento.create({ data });
  }
}
