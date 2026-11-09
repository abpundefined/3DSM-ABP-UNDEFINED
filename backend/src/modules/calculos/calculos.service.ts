import { Injectable } from '@nestjs/common';
import { CarbonApiService } from './carbon-api.service';

const CPU_MAX_WATTS = 0.5;

export interface ResultadoCalculoEmissao {
  intensidadeCarbonoGCo2ePorKwh: number;
  emissaoGCo2e: number;
}

@Injectable()
export class CalculosService {
  constructor(private readonly carbonApi: CarbonApiService) {}

  async calcularEmissao(
    energiaKwh: number,
    regionCode: string,
  ): Promise<ResultadoCalculoEmissao> {
    if (!Number.isFinite(energiaKwh) || energiaKwh < 0) {
      throw new RangeError('A energia deve ser um valor finito não negativo.');
    }

    const intensidadeCarbonoGCo2ePorKwh =
      await this.carbonApi.obterIntensidadeCarbono(regionCode);
    if (
      !Number.isFinite(intensidadeCarbonoGCo2ePorKwh) ||
      intensidadeCarbonoGCo2ePorKwh < 0
    ) {
      throw new RangeError('A intensidade de carbono retornada é inválida.');
    }

    const emissaoGCo2e = energiaKwh * intensidadeCarbonoGCo2ePorKwh;
    if (!Number.isFinite(emissaoGCo2e)) {
      throw new RangeError('A emissão calculada não é um valor finito.');
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
        'As métricas devem ser finitas e não negativas; CPU deve estar entre 0 e 100%.',
      );
    }
    if (!Number.isFinite(intervaloSegundos) || intervaloSegundos <= 0) {
      throw new RangeError('O intervalo de coleta deve ser finito e positivo.');
    }

    const consumoCpu = (cpuPercent / 100) * CPU_MAX_WATTS;
    const consumoMemoria = memoryGb * 0.375;
    const consumoDisco = diskGb * 0.01;
    const consumoRede = networkGb * 0.02;

    const potenciaWatts =
      consumoCpu + consumoMemoria + consumoDisco + consumoRede;
    const horas = intervaloSegundos / 3600;

    const energiaKwh = (potenciaWatts * horas) / 1000;
    if (!Number.isFinite(energiaKwh)) {
      throw new RangeError('A energia calculada não é um valor finito.');
    }

    return energiaKwh;
  }
}
