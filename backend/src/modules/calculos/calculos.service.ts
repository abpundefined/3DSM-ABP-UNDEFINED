import { Injectable, Logger } from "@nestjs/common";
import {
  CarbonApiService,
  DEFAULT_CARBON_INTENSITY_GCO2E_PER_KWH,
} from "./carbon-api.service";

export interface ResultadoCalculoEmissao {
  intensidadeCarbonoGCo2ePorKwh: number;
  emissaoGCo2e: number;
}

@Injectable()
export class CalculosService {
  private readonly logger = new Logger(CalculosService.name);

  constructor(private readonly carbonApi: CarbonApiService) {}

  async calcularEmissao(
    energiaKwh: number,
    regionCode: string,
  ): Promise<ResultadoCalculoEmissao> {
    if (!Number.isFinite(energiaKwh) || energiaKwh < 0) {
      throw new RangeError("A energia deve ser um valor finito não negativo.");
    }

    let intensidadeCarbonoGCo2ePorKwh: number = Number(
      DEFAULT_CARBON_INTENSITY_GCO2E_PER_KWH,
    );
    try {
      const intensity =
        await this.carbonApi.obterIntensidadeCarbono(regionCode);
      if (!Number.isFinite(intensity) || intensity < 0) {
        throw new RangeError("A intensidade de carbono retornada é inválida.");
      }
      intensidadeCarbonoGCo2ePorKwh = intensity;
    } catch (error) {
      this.logger.warn(
        `Usando intensidade de carbono padrão para ${regionCode}: ${
          error instanceof Error ? error.message : "resposta inválida"
        }`,
      );
    }

    const emissaoGCo2e = energiaKwh * intensidadeCarbonoGCo2ePorKwh;
    if (!Number.isFinite(emissaoGCo2e)) {
      throw new RangeError("A emissão calculada não é um valor finito.");
    }

    return { intensidadeCarbonoGCo2ePorKwh, emissaoGCo2e };
  }

  calcularEnergia(
    cpuPercent: number,
    memoryGb: number,
    diskGb: number,
    networkGb: number,
    intervaloSegundos: number,
  ): number {
    const measurements = [cpuPercent, memoryGb, diskGb, networkGb];
    if (
      measurements.some((value) => !Number.isFinite(value) || value < 0) ||
      cpuPercent > 100
    ) {
      throw new RangeError(
        "As métricas devem ser finitas e não negativas; CPU deve estar entre 0 e 100%.",
      );
    }
    if (!Number.isFinite(intervaloSegundos) || intervaloSegundos <= 0) {
      throw new RangeError("O intervalo de coleta deve ser finito e positivo.");
    }

    const consumoCpu = (cpuPercent / 100) * 0.375;
    const consumoMemoria = memoryGb * 0.375;
    const consumoDisco = diskGb * 0.01;
    const consumoRede = networkGb * 0.02;

    const potenciaWatts =
      consumoCpu + consumoMemoria + consumoDisco + consumoRede;
    const horas = intervaloSegundos / 3600;

    const energiaKwh = (potenciaWatts * horas) / 1000;
    if (!Number.isFinite(energiaKwh)) {
      throw new RangeError("A energia calculada não é um valor finito.");
    }

    return energiaKwh;
  }
}
