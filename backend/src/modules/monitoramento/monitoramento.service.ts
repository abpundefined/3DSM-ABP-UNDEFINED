import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ServicosService } from "../servicos/servicos.service";
import { ColetasService } from "../coletas/coletas.service";
import { EstadoColetaEnum } from "../coletas/dto/create-coleta.dto";
import { normalizeMetricPayload } from "../../common/utils/external-api.util";

const METRICS_FETCH_TIMEOUT_MS = 8000;

@Injectable()
export class MonitoramentoService implements OnModuleInit {
  private readonly logger = new Logger(MonitoramentoService.name);
  private pollingInterval?: NodeJS.Timeout;
  private isCollecting = false;

  constructor(
    private readonly configService: ConfigService,
    private readonly servicosService: ServicosService,
    private readonly coletasService: ColetasService,
  ) {}

  async onModuleInit() {
    await this.servicosService.verificarSchema();

    const configuredInterval = this.configService.get<string>(
      "METRICS_POLL_INTERVAL_MS",
    );
    const intervalMs = Number(configuredInterval ?? 30000);
    this.startPolling(intervalMs);
  }

  private startPolling(intervalMs: number) {
    if (Number.isNaN(intervalMs) || intervalMs <= 0) {
      this.logger.warn("METRICS_POLL_INTERVAL_MS inválido. Usando 30.000ms.");
      intervalMs = 30000;
    }

    this.pollOnce();
    this.pollingInterval = setInterval(() => {
      void this.pollOnce();
    }, intervalMs);
  }

  async pollOnce() {
    if (this.isCollecting) {
      this.logger.debug(
        "Ciclo de monitoramento ignorado: já existe um ciclo em execução.",
      );
      return;
    }

    this.isCollecting = true;
    try {
      await this.servicosService.syncServices();
      await this.collectMetricsForAllServices();
    } catch (error) {
      this.logger.error(
        "Erro ao executar monitoramento de serviços",
        error instanceof Error ? error.stack : error,
      );
    } finally {
      this.isCollecting = false;
    }
  }

  async collectMetricsForAllServices() {
    const services =
      await this.servicosService.listarServicosParaMonitoramento();

    for (const service of services) {
      await this.collectMetricsForService(service.idExterno, service.id);
    }
  }

  private async collectMetricsForService(
    serviceIdExterno: string,
    servicoId: number,
  ) {
    const baseUrl = this.configService.get<string>("METRICS_API_URL");
    if (!baseUrl) {
      throw new Error("METRICS_API_URL não configurada.");
    }

    const url = `${baseUrl.replace(/\/+$/, "")}/metrics/${encodeURIComponent(serviceIdExterno)}`;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(
        () => controller.abort(),
        METRICS_FETCH_TIMEOUT_MS,
      );
      let response: Response;
      let payload: unknown;

      try {
        response = await fetch(url, {
          headers: { Accept: "application/json" },
          signal: controller.signal,
        });

        if (response.ok) {
          payload = await response.json();
        }
      } finally {
        clearTimeout(timeout);
      }

      if (!response.ok) {
        await this.servicosService.atualizarEstadoMonitoramento(
          servicoId,
          "INDISPONIVEL",
        );

        await this.coletasService.registrarColeta({
          servicoId,
          estadoColeta: EstadoColetaEnum.FALHA,
          codigoErro: String(response.status),
          mensagemErro: `Falha ao consultar métricas do serviço ${serviceIdExterno}`,
          iniciadaEm: new Date(),
          finalizadaEm: new Date(),
        });

        return;
      }

      const metrics = normalizeMetricPayload(payload);
      const hasMetrics =
        metrics &&
        Object.values(metrics).some(
          (value) => value != null && Number.isFinite(value) && value !== 0,
        );

      if (!hasMetrics) {
        await this.servicosService.atualizarEstadoMonitoramento(
          servicoId,
          "SEM_METRICAS",
        );

        await this.coletasService.registrarColeta({
          servicoId,
          estadoColeta: EstadoColetaEnum.SEM_METRICAS,
          mensagemErro: "Serviço respondeu, mas não retornou métricas válidas.",
          iniciadaEm: new Date(),
          finalizadaEm: new Date(),
        });

        return;
      }

      await this.servicosService.atualizarEstadoMonitoramento(
        servicoId,
        "DISPONIVEL",
      );

      await this.coletasService.registrarColeta({
        servicoId,
        estadoColeta: EstadoColetaEnum.SUCESSO,
        iniciadaEm: new Date(),
        finalizadaEm: new Date(),
        cpuPercent: metrics.cpuPercent,
        memoryGb: metrics.memoryGb,
        diskGb: metrics.diskGb,
        networkGb: metrics.networkGb,
        intervaloColetaSegundos:
          Number(
            this.configService.get<number>("METRICS_POLL_INTERVAL_MS") ?? 30000,
          ) / 1000,
      });
    } catch (error) {
      const isTimeout =
        typeof error === "object" &&
        error !== null &&
        "name" in error &&
        error.name === "AbortError";
      const errorMessage = isTimeout
        ? `Tempo limite de ${METRICS_FETCH_TIMEOUT_MS}ms excedido ao consultar métricas do serviço ${serviceIdExterno}.`
        : error instanceof Error
          ? error.message
          : "Erro ao consultar métricas.";

      if (isTimeout) {
        this.logger.warn(errorMessage);
      } else {
        this.logger.error(
          `Erro ao coletar métricas do serviço ${serviceIdExterno}`,
          error instanceof Error ? error.stack : error,
        );
      }

      await this.servicosService.atualizarEstadoMonitoramento(
        servicoId,
        "INDISPONIVEL",
      );

      await this.coletasService.registrarColeta({
        servicoId,
        estadoColeta: EstadoColetaEnum.FALHA,
        codigoErro: isTimeout ? "TIMEOUT" : "FETCH_ERROR",
        mensagemErro: errorMessage,
        iniciadaEm: new Date(),
        finalizadaEm: new Date(),
      });
    }
  }
}
