import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ServicosService } from "../servicos/servicos.service";
import { ColetasService } from "../coletas/coletas.service";
import { ConfiguracaoService } from "../configuracao/configuracao.service";
import { normalizeMetricPayload } from "../../common/utils/external-api.util";
import {
  classificarFalhaDeConexao,
  classificarMedicoes,
  classificarRespostaHttp,
} from "../../common/regras/classificacao-estado";

const METRICS_FETCH_TIMEOUT_MS = 8000;

const getCollectionIntervalSeconds = (payload: unknown): number | undefined => {
  if (
    typeof payload !== "object" ||
    payload === null ||
    !("collection_interval_seconds" in payload)
  ) {
    return undefined;
  }

  const interval = payload.collection_interval_seconds;
  return typeof interval === "number" &&
    Number.isSafeInteger(interval) &&
    interval > 0
    ? interval
    : undefined;
};

@Injectable()
export class MonitoramentoService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MonitoramentoService.name);
  private pollingInterval?: NodeJS.Timeout;
  private isCollecting = false;
  private destroyed = false;
  private ultimaDescobertaEm?: number;

  constructor(
    private readonly configService: ConfigService,
    private readonly servicosService: ServicosService,
    private readonly coletasService: ColetasService,
    private readonly configuracaoService: ConfiguracaoService,
  ) {}

  async onModuleInit() {
    await this.servicosService.verificarSchema();

    void this.runScheduledCycle();
  }

  onModuleDestroy() {
    this.destroyed = true;
    if (this.pollingInterval) {
      clearTimeout(this.pollingInterval);
      this.pollingInterval = undefined;
    }
  }

  private async obterIntervalos() {
    try {
      const configuracao = await this.configuracaoService.obter();
      if (
        !Number.isFinite(configuracao.intervaloColetaSegundos) ||
        configuracao.intervaloColetaSegundos <= 0 ||
        !Number.isFinite(configuracao.intervaloDescobertaSegundos) ||
        configuracao.intervaloDescobertaSegundos <= 0
      ) {
        throw new Error("Intervalos de monitoramento inválidos.");
      }
      return {
        coletaMs: configuracao.intervaloColetaSegundos * 1000,
        descobertaMs: configuracao.intervaloDescobertaSegundos * 1000,
      };
    } catch (error) {
      this.logger.warn(
        `Não foi possível ler a configuração de monitoramento; usando o intervalo padrão. ${error instanceof Error ? error.message : String(error)}`,
      );
      const configured = Number(
        this.configService.get<string>("METRICS_POLL_INTERVAL_MS") ?? 30000,
      );
      const intervalMs =
        Number.isFinite(configured) && configured > 0 ? configured : 30000;
      return { coletaMs: intervalMs, descobertaMs: intervalMs };
    }
  }

  private async runScheduledCycle() {
    if (this.destroyed) return;
    await this.pollOnce();
    if (this.destroyed) return;
    const intervalos = await this.obterIntervalos();
    if (this.destroyed) return;
    this.logger.debug(
      `Próximo ciclo de monitoramento em ${intervalos.coletaMs}ms.`,
    );
    this.pollingInterval = setTimeout(() => {
      void this.runScheduledCycle();
    }, intervalos.coletaMs);
  }

  async pollOnce() {
    if (this.destroyed) return;
    if (this.isCollecting) {
      this.logger.debug(
        "Ciclo de monitoramento ignorado: já existe um ciclo em execução.",
      );
      return;
    }

    this.isCollecting = true;
    try {
      const intervalos = await this.obterIntervalos();
      if (this.destroyed) return;
      if (
        this.ultimaDescobertaEm === undefined ||
        Date.now() - this.ultimaDescobertaEm >= intervalos.descobertaMs
      ) {
        await this.servicosService.syncServices();
        this.ultimaDescobertaEm = Date.now();
      }
      if (this.destroyed) return;
      this.logger.debug("Iniciando coleta de métricas dos serviços.");
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
      await this.collectMetricsForService(
        service.idExterno,
        service.id,
        service.regiaoCodigo,
      );
    }
  }

  private async collectMetricsForService(
    serviceIdExterno: string,
    servicoId: number,
    regiaoCodigo: string,
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
        const classificacao = classificarRespostaHttp(response.status);

        await this.servicosService.atualizarEstadoMonitoramento(
          servicoId,
          classificacao.estadoServico,
        );

        await this.coletasService.registrarColeta({
          servicoId,
          regiaoCodigoNaColeta: regiaoCodigo,
          estadoColeta: classificacao.estadoColeta,
          codigoErro: classificacao.codigoErro,
          mensagemErro:
            classificacao.estadoServico === "SEM_METRICAS"
              ? `O serviço ${serviceIdExterno} está listado, mas não expõe métricas (HTTP ${response.status}).`
              : `Falha ao consultar métricas do serviço ${serviceIdExterno} (HTTP ${response.status}).`,
          iniciadaEm: new Date(),
          finalizadaEm: new Date(),
        });

        return;
      }

      const metrics = normalizeMetricPayload(payload);
      const intervaloColetaSegundos = getCollectionIntervalSeconds(payload);
      const classificacao = classificarMedicoes(metrics ?? {});

      if (
        classificacao.estadoServico === "DISPONIVEL" &&
        intervaloColetaSegundos === undefined
      ) {
        this.logger.warn(
          `A API de métricas não retornou um collection_interval_seconds válido para ${serviceIdExterno}; o cálculo ficará pendente.`,
        );
      }

      await this.servicosService.atualizarEstadoMonitoramento(
        servicoId,
        classificacao.estadoServico,
      );

      if (!metrics || classificacao.estadoServico === "SEM_METRICAS") {
        await this.coletasService.registrarColeta({
          servicoId,
          regiaoCodigoNaColeta: regiaoCodigo,
          estadoColeta: classificacao.estadoColeta,
          mensagemErro: "Serviço respondeu, mas não retornou métricas válidas.",
          iniciadaEm: new Date(),
          finalizadaEm: new Date(),
        });

        return;
      }

      await this.coletasService.registrarColeta({
        servicoId,
        regiaoCodigoNaColeta: regiaoCodigo,
        estadoColeta: classificacao.estadoColeta,
        iniciadaEm: new Date(),
        finalizadaEm: new Date(),
        cpuPercent: metrics.cpuPercent,
        memoryGb: metrics.memoryGb,
        diskGb: metrics.diskGb,
        networkGb: metrics.networkGb,
        intervaloColetaSegundos,
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

      const classificacao = classificarFalhaDeConexao(isTimeout);

      await this.servicosService.atualizarEstadoMonitoramento(
        servicoId,
        classificacao.estadoServico,
      );

      await this.coletasService.registrarColeta({
        servicoId,
        regiaoCodigoNaColeta: regiaoCodigo,
        estadoColeta: classificacao.estadoColeta,
        codigoErro: classificacao.codigoErro,
        mensagemErro: errorMessage,
        iniciadaEm: new Date(),
        finalizadaEm: new Date(),
      });
    }
  }
}
