import { Injectable, Logger, Optional } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Servico } from "../../generated/prisma/client";
import type { EstadoMonitoramento } from "../../generated/prisma/enums";
import { comTimeout } from "../../common/utils/com-timeout";
import { normalizeServicePayload } from "../../common/utils/external-api.util";
import {
  CalculosService,
  ComponentesPotencia,
} from "../calculos/calculos.service";
import { calcularSeloEficiencia } from "../indicadores/ranking.service";
import { EventosService } from "../eventos/eventos.service";
import { RegistroIntegracoesService } from "../saude/registro-integracoes.service";
import { ServicosRepository } from "./servicos.repository";

const DISCOVERY_FETCH_TIMEOUT_MS = 8000;

export interface LocalizacaoServico {
  codigo: string;
  pais: string;
  regiao: string;
  cidade: string | null;
  latitude: number | null;
  longitude: number | null;
}

export type ServicoComLocalizacao = Servico & {
  localizacao: LocalizacaoServico;
  componentes: ComponentesPotencia | null;
  selo: string;
};

@Injectable()
export class ServicosService {
  private readonly logger = new Logger(ServicosService.name);

  constructor(
    private readonly servicosRepository: ServicosRepository,
    private readonly configService: ConfigService,
    private readonly registro: RegistroIntegracoesService,
    private readonly calculosService: CalculosService,
    @Optional() private readonly eventosService?: EventosService,
  ) {}

  discoverServices() {
    return this.registro.medir("agregador", () => this.consultarAgregador());
  }

  private async consultarAgregador() {
    const baseUrl = this.configService.get<string>("METRICS_API_URL");
    if (!baseUrl) {
      throw new Error("METRICS_API_URL não configurada.");
    }

    const url = `${baseUrl.replace(/\/+$/, "")}/services`;
    const payload = await comTimeout(
      DISCOVERY_FETCH_TIMEOUT_MS,
      "a lista de serviços externos",
      async (signal): Promise<unknown> => {
        const response = await fetch(url, {
          headers: {
            Accept: "application/json",
          },
          signal,
        });

        if (!response.ok) {
          throw new Error(
            `Falha ao consultar serviços externos: ${response.status} ${response.statusText}`,
          );
        }

        return response.json();
      },
    );
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

      await this.servicosRepository.upsertRegiao({
        codigo: regiaoCodigo,
        pais: country,
        regiao: region,
        cidade: city,
        latitude,
        longitude,
      });

      await this.servicosRepository.upsertServicoDescoberto({
        idExterno: service.idExterno,
        nome: service.nome,
        regiaoCodigo: regiaoCodigo,
        caminhoMetricas: service.caminhoMetricas,
      });
    }

    // Apenas serviços removidos que reapareceram aguardam uma nova coleta.
    // Os demais preservam o estado determinado pela última coleta.
    await this.servicosRepository.restaurarServicosRemovidos([
      ...discoveredIds,
    ]);

    const removedServices = (
      await this.servicosRepository.listarIdsExternos()
    ).filter((idExterno) => !discoveredIds.has(idExterno));

    await this.servicosRepository.marcarServicosComoRemovidos(removedServices);

    return services;
  }

  async verificarSchema() {
    return this.servicosRepository.verificarSchema();
  }

  async listarServicosParaMonitoramento() {
    return this.servicosRepository.listarParaMonitoramento();
  }

  async atualizarEstadoMonitoramento(
    id: number,
    estadoAtual: EstadoMonitoramento,
  ) {
    const atualizado =
      await this.servicosRepository.atualizarEstadoMonitoramento(
        id,
        estadoAtual,
      );
    this.eventosService?.emitirEstadoAlterado(id, estadoAtual);
    return atualizado;
  }

  async listarServicos(): Promise<ServicoComLocalizacao[]> {
    const servicos = await this.servicosRepository.listarComLocalizacao();

    return servicos.map(({ regiao, coletas, ...servico }) => {
      const coleta = coletas[0];
      const coletaSemDadosValidos =
        !coleta ||
        coleta.estadoColeta === "SEM_METRICAS" ||
        coleta.estadoColeta === "FALHA" ||
        coleta.estadoCalculo === "FALHA";
      const componentes = coletaSemDadosValidos
        ? null
        : this.calculosService.calcularPotencia(
            coleta.cpuPercent ?? 0,
            coleta.memoryGb ?? 0,
            coleta.diskGb ?? 0,
            coleta.networkGb ?? 0,
          );
      const emissaoMediaPorHora =
        !coletaSemDadosValidos &&
        coleta.estadoCalculo === "CONCLUIDO" &&
        coleta.emissaoGCo2e != null &&
        coleta.intervaloColetaSegundos != null &&
        coleta.intervaloColetaSegundos > 0
          ? (coleta.emissaoGCo2e / coleta.intervaloColetaSegundos) * 3600
          : null;

      return {
        ...servico,
        localizacao: {
          codigo: regiao.codigo,
          pais: regiao.pais,
          regiao: regiao.regiao,
          cidade: regiao.cidade,
          latitude: regiao.latitude,
          longitude: regiao.longitude,
        },
        componentes,
        selo: calcularSeloEficiencia(emissaoMediaPorHora),
      };
    });
  }

  async findById(id: number) {
    return this.servicosRepository.findById(id);
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
