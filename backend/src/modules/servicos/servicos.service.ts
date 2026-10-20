import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../../database/prisma.service";
import { normalizeServicePayload } from "../../common/utils/external-api.util";

@Injectable()
export class ServicosService {
  private readonly logger = new Logger(ServicosService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async discoverServices() {
    const baseUrl = this.configService.get<string>("METRICS_API_URL");
    if (!baseUrl) {
      throw new Error("METRICS_API_URL não configurada.");
    }

    const url = `${baseUrl.replace(/\/+$/, "")}/services`;
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(
        `Falha ao consultar serviços externos: ${response.status} ${response.statusText}`,
      );
    }

    const payload: unknown = await response.json();
    const container =
      payload && typeof payload === "object"
        ? (payload as Record<string, unknown>)
        : null;
    const servicePayloads: unknown = Array.isArray(payload)
      ? payload
      : ["items", "data", "services", "results", "value", "records"]
          .map((key) => container?.[key])
          .find(Array.isArray);

    if (
      !Array.isArray(servicePayloads) ||
      container?.error ||
      container?.success === false
    ) {
      throw new Error("Resposta inválida da descoberta de serviços.");
    }

    // Valida toda a descoberta antes de alterar estados no banco.
    const records = servicePayloads.map((item: unknown) => {
      const service = normalizeServicePayload(item);
      if (!service) {
        throw new Error("Serviço inválido na resposta de descoberta.");
      }
      return service;
    });

    return records;
  }

  async syncServices() {
    const services = await this.discoverServices();

    const discoveredIds = new Set<string>();

    for (const service of services) {
      discoveredIds.add(service.idExterno);

      const regiaoCodigo =
        service.regiaoCodigo || this.buildRegiaoCodigo(service);

      const country = service.pais || "Desconhecida";
      const region = service.regiao || service.localizacao || "Desconhecida";
      const city = service.cidade || null;

      const latitude = service.latitude;
      const longitude = service.longitude;

      await this.prisma.regiao.upsert({
        where: { codigo: regiaoCodigo },
        update: {
          pais: country,
          regiao: region,
          cidade: city,
          latitude,
          longitude,
          atualizadaEm: new Date(),
        },
        create: {
          codigo: regiaoCodigo,
          pais: country,
          regiao: region,
          cidade: city,
          latitude,
          longitude,
          atualizadaEm: new Date(),
        },
      });

      await this.prisma.servico.upsert({
        where: { idExterno: service.idExterno },
        update: {
          nome: service.nome,
          regiaoCodigo: regiaoCodigo,
          caminhoMetricas: service.caminhoMetricas,
          // A descoberta só confirma que o serviço existe; quem confirma disponibilidade é a coleta de métricas.
          // Preservamos o estado atual para a sincronização não apagar uma falha antes da próxima coleta.
          ultimaVezListadoEm: new Date(),
          atualizadoEm: new Date(),
        },
        create: {
          idExterno: service.idExterno,
          nome: service.nome,
          regiaoCodigo: regiaoCodigo,
          caminhoMetricas: service.caminhoMetricas,
          estadoAtual: "DESCONHECIDO",
          descobertoEm: new Date(),
          ultimaVezListadoEm: new Date(),
          atualizadoEm: new Date(),
        },
      });
    }

    // Apenas serviços removidos que reapareceram aguardam uma nova coleta.
    // Os demais preservam o estado determinado pela última coleta.
    if (discoveredIds.size > 0) {
      await this.prisma.servico.updateMany({
        where: {
          idExterno: { in: [...discoveredIds] },
          estadoAtual: "REMOVIDO",
        },
        data: {
          estadoAtual: "DESCONHECIDO",
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
          estadoAtual: "REMOVIDO",
          atualizadoEm: new Date(),
        },
      });
    }

    return services;
  }

  async listarServicos() {
    return this.prisma.servico.findMany({
      orderBy: { atualizadoEm: "desc" },
    });
  }

  private buildRegiaoCodigo(service: {
    localizacao: string;
    cidade?: string | null;
    pais?: string | null;
    regiao?: string | null;
  }) {
    const source = [
      service.pais,
      service.regiao,
      service.cidade,
      service.localizacao,
    ]
      .filter(Boolean)
      .join("-")
      .replace(/[^a-zA-Z0-9-]/g, "-")
      .replace(/-+/g, "-")
      .toLowerCase();

    return (
      source ||
      `regiao-${service.localizacao.slice(0, 24) || "desconhecida"}`.toLowerCase()
    );
  }
}
