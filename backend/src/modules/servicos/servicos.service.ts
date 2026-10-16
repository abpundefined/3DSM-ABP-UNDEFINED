import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';
import { normalizeServicePayload, safeArrayFromResponse } from '../../common/utils/external-api.util';

@Injectable()
export class ServicosService {
  private readonly logger = new Logger(ServicosService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async discoverServices() {
    const baseUrl = this.configService.get<string>('METRICS_API_URL');
    if (!baseUrl) {
      throw new Error('METRICS_API_URL não configurada.');
    }

    const url = `${baseUrl.replace(/\/+$/, '')}/services`;
    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Falha ao consultar serviços externos: ${response.status} ${response.statusText}`);
    }

    const payload = await response.json();
    const records = safeArrayFromResponse(payload)
      .map((item) => normalizeServicePayload(item))
      .filter(Boolean) as {
      idExterno: string;
      nome: string;
      localizacao: string;
      cidade: string | null;
      pais: string | null;
      regiao: string | null;
    }[];

    return records;
  }

  async syncServices() {
    const services = await this.discoverServices();

    if (services.length === 0) {
      return [];
    }

    const discoveredIds = new Set<string>();

    for (const service of services) {
      discoveredIds.add(service.idExterno);

      const regiaoCodigo = this.buildRegiaoCodigo(service);
      const country = service.pais || 'Desconhecida';
      const region = service.regiao || service.localizacao || 'Desconhecida';
      const city = service.cidade || null;

      await this.prisma.regiao.upsert({
        where: { codigo: regiaoCodigo },
        update: {
          pais: country,
          regiao: region,
          cidade: city,
          atualizadaEm: new Date(),
        },
        create: {
          codigo: regiaoCodigo,
          pais: country,
          regiao: region,
          cidade: city,
          atualizadaEm: new Date(),
        },
      });

      await this.prisma.servico.upsert({
        where: { idExterno: service.idExterno },
        update: {
          nome: service.nome,
          regiaoCodigo: regiaoCodigo,
          caminhoMetricas: `/metrics/${service.idExterno}`,
          // A descoberta só confirma que o serviço existe; quem confirma disponibilidade é a coleta de métricas.
          // Preservamos o estado atual para a sincronização não apagar uma falha antes da próxima coleta.
          ultimaVezListadoEm: new Date(),
          atualizadoEm: new Date(),
        },
        create: {
          idExterno: service.idExterno,
          nome: service.nome,
          regiaoCodigo: regiaoCodigo,
          caminhoMetricas: `/metrics/${service.idExterno}`,
          estadoAtual: 'DISPONIVEL',
          descobertoEm: new Date(),
          ultimaVezListadoEm: new Date(),
          atualizadoEm: new Date(),
        },
      });
    }

    const existingServices = await this.prisma.servico.findMany({
      select: { idExterno: true },
    });

    const removedServices = existingServices
      .map((service) => service.idExterno)
      .filter((idExterno) => !discoveredIds.has(idExterno));

    if (removedServices.length > 0) {
      await this.prisma.servico.updateMany({
        where: { idExterno: { in: removedServices } },
        data: {
          estadoAtual: 'REMOVIDO',
          atualizadoEm: new Date(),
        },
      });
    }

    return services;
  }

  async listarServicos() {
    return this.prisma.servico.findMany({
      orderBy: { atualizadoEm: 'desc' },
    });
  }

  private buildRegiaoCodigo(service: { localizacao: string; cidade?: string | null; pais?: string | null; regiao?: string | null }) {
    const source = [service.pais, service.regiao, service.cidade, service.localizacao]
      .filter(Boolean)
      .join('-')
      .replace(/[^a-zA-Z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .toLowerCase();

    return source || `regiao-${service.localizacao.slice(0, 24) || 'desconhecida'}`.toLowerCase();
  }
}
