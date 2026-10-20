import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';
import { ServicosService } from '../servicos/servicos.service';
import { normalizeMetricPayload } from '../../common/utils/external-api.util';

@Injectable()
export class MonitoramentoService implements OnModuleInit {
  private readonly logger = new Logger(MonitoramentoService.name);
  private pollingInterval?: NodeJS.Timeout;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly servicosService: ServicosService,
  ) {}

  async onModuleInit() {
    await this.prisma.verifySchema();

    const configuredInterval = this.configService.get<string>('METRICS_POLL_INTERVAL_MS');
    const intervalMs = Number(configuredInterval ?? 30000);
    this.startPolling(intervalMs);
  }

  private startPolling(intervalMs: number) {
    if (Number.isNaN(intervalMs) || intervalMs <= 0) {
      this.logger.warn('METRICS_POLL_INTERVAL_MS inválido. Usando 30.000ms.');
      intervalMs = 30000;
    }

    this.pollOnce();
    this.pollingInterval = setInterval(() => {
      void this.pollOnce();
    }, intervalMs);
  }

  async pollOnce() {
    try {
      await this.servicosService.syncServices();
      await this.collectMetricsForAllServices();
    } catch (error) {
      this.logger.error('Erro ao executar monitoramento de serviços', error instanceof Error ? error.stack : error);
    }
  }

  async collectMetricsForAllServices() {
    const services = await this.prisma.servico.findMany({
      where: {
        estadoAtual: {
          not: 'REMOVIDO',
        },
      },
      orderBy: { atualizadoEm: 'desc' },
    });

    for (const service of services) {
      await this.collectMetricsForService(service.idExterno, service.id);
    }
  }

  private async collectMetricsForService(serviceIdExterno: string, servicoId: number) {
    const baseUrl = this.configService.get<string>('METRICS_API_URL');
    if (!baseUrl) {
      throw new Error('METRICS_API_URL não configurada.');
    }

    const url = `${baseUrl.replace(/\/+$/, '')}/metrics/${encodeURIComponent(serviceIdExterno)}`;

    try {
      const response = await fetch(url, {
        headers: { Accept: 'application/json' },
      });

      if (!response.ok) {
        await this.prisma.servico.update({
          where: { id: servicoId },
          data: {
            estadoAtual: 'INDISPONIVEL',
            atualizadoEm: new Date(),
          },
        });

        await this.prisma.coleta.create({
          data: {
            servicoId,
            estadoColeta: 'FALHA',
            codigoErro: String(response.status),
            mensagemErro: `Falha ao consultar métricas do serviço ${serviceIdExterno}`,
            iniciadaEm: new Date(),
            finalizadaEm: new Date(),
          },
        });

        return;
      }

      const payload = await response.json();
      const metrics = normalizeMetricPayload(payload);
      const hasMetrics = metrics && Object.values(metrics).some((value) => value != null && Number.isFinite(value) && value !== 0);

      if (!hasMetrics) {
        await this.prisma.servico.update({
          where: { id: servicoId },
          data: {
            estadoAtual: 'SEM_METRICAS',
            atualizadoEm: new Date(),
          },
        });

        await this.prisma.coleta.create({
          data: {
            servicoId,
            estadoColeta: 'SEM_METRICAS',
            mensagemErro: 'Serviço respondeu, mas não retornou métricas válidas.',
            iniciadaEm: new Date(),
            finalizadaEm: new Date(),
          },
        });

        return;
      }

      await this.prisma.servico.update({
        where: { id: servicoId },
        data: {
          estadoAtual: 'DISPONIVEL',
          atualizadoEm: new Date(),
        },
      });

      await this.prisma.coleta.create({
        data: {
          servicoId,
          estadoColeta: 'SUCESSO',
          iniciadaEm: new Date(),
          finalizadaEm: new Date(),
          cpuPercent: metrics.cpuPercent,
          memoryGb: metrics.memoryGb,
          diskGb: metrics.diskGb,
          networkGb: metrics.networkGb,
          intervaloColetaSegundos: Number(this.configService.get<number>('METRICS_POLL_INTERVAL_MS') ?? 30000) / 1000,
        },
      });
    } catch (error) {
      this.logger.error(`Erro ao coletar métricas do serviço ${serviceIdExterno}`, error instanceof Error ? error.stack : error);

      await this.prisma.servico.update({
        where: { id: servicoId },
        data: {
          estadoAtual: 'INDISPONIVEL',
          atualizadoEm: new Date(),
        },
      });

      await this.prisma.coleta.create({
        data: {
          servicoId,
          estadoColeta: 'FALHA',
          codigoErro: 'FETCH_ERROR',
          mensagemErro: error instanceof Error ? error.message : 'Erro ao consultar métricas.',
          iniciadaEm: new Date(),
          finalizadaEm: new Date(),
        },
      });
    }
  }
}
