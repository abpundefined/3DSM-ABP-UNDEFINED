import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateColetaDto } from './dto/create-coleta.dto';
import { FilterColetasDto } from './dto/filter-coleta.dto';

export interface IColetasRepository {
    create(data: CreateColetaDto): Promise<any>;
    findMany(filters: FilterColetasDto): Promise<any[]>;
    findById(id: number): Promise<any | null>;
}

@Injectable()
export class ColetasRepository implements IColetasRepository {
    constructor(private readonly prisma: PrismaService) { }

    async create(data: CreateColetaDto) {
        return this.prisma.coleta.create({
            data: {
                servicoId: data.servicoId,
                estadoColeta: data.estadoColeta as any,
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
                energiaKwh: data.energiaKwh,
                emissaoGCo2e: data.emissaoGCo2e,
            },
        });
    }

    async findMany(filters: FilterColetasDto) {
        const where: any = {};

        if (filters.servicoId) {
            where.servicoId = filters.servicoId;
        }

        if (filters.dataInicio || filters.dataFim) {
            where.iniciadaEm = {};
            if (filters.dataInicio) where.iniciadaEm.gte = filters.dataInicio;
            if (filters.dataFim) where.iniciadaEm.lte = filters.dataFim;
        }

        return this.prisma.coleta.findMany({
            where,
            orderBy: { iniciadaEm: 'desc' },
            include: {
                servico: {
                    select: { idExterno: true, nome: true },
                },
            },
        });
    }

    async findById(id: number) {
        return this.prisma.coleta.findUnique({
            where: { id },
            include: {
                servico: true,
                regiao: true,
            },
        });
    }
    async findLatestSuccessful(servicoId: number) {
        return this.prisma.coleta.findFirst({
            where: {
                servicoId,
                estadoColeta: 'SUCESSO',
            },
            orderBy: {
                iniciadaEm: 'desc',
            },
        });
    }
}

