import { Injectable } from "@nestjs/common";
import type { Coleta, Prisma } from "../../generated/prisma/client";
import { PrismaService } from "../../database/prisma.service";
import { CreateColetaDto } from "./dto/create-coleta.dto";
import { FilterColetasDto } from "./dto/filter-coleta.dto";

export interface IColetasRepository {
  create(data: CreateColetaDto): Promise<Coleta>;
  findMany(filters: FilterColetasDto): Promise<Coleta[]>;
  findById(id: number): Promise<Coleta | null>;
  findLatestSuccessful(servicoId: number): Promise<Coleta | null>;
}

@Injectable()
export class ColetasRepository implements IColetasRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateColetaDto): Promise<Coleta> {
    return this.prisma.coleta.create({
      data: {
        servicoId: data.servicoId,
        estadoColeta: data.estadoColeta,
        regiaoCodigoNaColeta: data.regiaoCodigoNaColeta,
        iniciadaEm: data.iniciadaEm ?? new Date(),
        finalizadaEm: data.finalizadaEm,
        intervaloColetaSegundos: data.intervaloColetaSegundos,
        codigoErro: data.codigoErro,
        mensagemErro: data.mensagemErro,
        cpuPercent: data.cpuPercent,
        memoryGb: data.memoryGb,
        diskGb: data.diskGb,
        networkGb: data.networkGb,
        intensidadeCarbonoGCo2ePorKwh: data.intensidadeCarbonoGCo2ePorKwh,
        estadoCalculo: data.estadoCalculo ?? "PENDENTE",
        energiaKwh: data.energiaKwh,
        emissaoGCo2e: data.emissaoGCo2e,
      },
    });
  }

  async findMany(filters: FilterColetasDto): Promise<Coleta[]> {
    const where: Prisma.ColetaWhereInput = {
      ...(filters.servicoId !== undefined
        ? { servicoId: filters.servicoId }
        : {}),
      ...(filters.dataInicio !== undefined || filters.dataFim !== undefined
        ? {
            iniciadaEm: {
              ...(filters.dataInicio !== undefined
                ? { gte: filters.dataInicio }
                : {}),
              ...(filters.dataFim !== undefined
                ? { lte: filters.dataFim }
                : {}),
            },
          }
        : {}),
    };

    return this.prisma.coleta.findMany({
      where,
      orderBy: { iniciadaEm: "desc" },
      include: {
        servico: {
          select: { idExterno: true, nome: true },
        },
      },
    });
  }

  async findById(id: number): Promise<Coleta | null> {
    return this.prisma.coleta.findUnique({
      where: { id },
      include: {
        servico: true,
        regiao: true,
      },
    });
  }
  async findLatestSuccessful(servicoId: number): Promise<Coleta | null> {
    return this.prisma.coleta.findFirst({
      where: {
        servicoId,
        estadoColeta: "SUCESSO",
      },
      orderBy: {
        iniciadaEm: "desc",
      },
    });
  }
}
