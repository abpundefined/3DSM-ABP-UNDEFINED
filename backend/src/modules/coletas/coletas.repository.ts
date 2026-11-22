import { Injectable } from "@nestjs/common";
import type { Coleta, Prisma } from "../../generated/prisma/client";
import { PrismaService } from "../../database/prisma.service";
import { CreateColetaDto } from "./dto/create-coleta.dto";
import { FilterColetasDto } from "./dto/filter-coleta.dto";

type ColetaComServico = Prisma.ColetaGetPayload<{
  include: { servico: { select: { idExterno: true; nome: true } } };
}>;

export interface HistoricoColetasPaginado {
  itens: ColetaComServico[];
  pagina: number;
  tamanho: number;
  total: number;
  totalPaginas: number;
}

export interface IColetasRepository {
  create(data: CreateColetaDto): Promise<Coleta>;
  findMany(filters: FilterColetasDto): Promise<HistoricoColetasPaginado>;
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

  async findMany(filters: FilterColetasDto): Promise<HistoricoColetasPaginado> {
    const pagina = filters.pagina ?? 1;
    const tamanho = filters.tamanho ?? 20;
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

    const [itens, total] = await this.prisma.$transaction(
      [
        this.prisma.coleta.findMany({
          where,
          orderBy: [{ iniciadaEm: "desc" }, { id: "desc" }],
          skip: (pagina - 1) * tamanho,
          take: tamanho,
          include: {
            servico: {
              select: { idExterno: true, nome: true },
            },
          },
        }),
        this.prisma.coleta.count({ where }),
      ],
      { isolationLevel: "RepeatableRead" },
    );

    return {
      itens,
      pagina,
      tamanho,
      total,
      totalPaginas: Math.ceil(total / tamanho),
    };
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
