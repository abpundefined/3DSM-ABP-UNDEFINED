import { Injectable } from "@nestjs/common";
import { CarbonApiService } from "./carbon-api.service";

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
    const intensidadeCarbonoGCo2ePorKwh =
      await this.carbonApi.obterIntensidadeCarbono(regionCode);

    return {
      intensidadeCarbonoGCo2ePorKwh,
      emissaoGCo2e: energiaKwh * intensidadeCarbonoGCo2ePorKwh,
    };
  }

  calcularEnergia(
    cpuPercent: number,
    memoryGb: number,
    diskGb: number,
    networkGb: number,
    intervaloSegundos: number,
  ): number {
    const consumoCpu = (cpuPercent / 100) * 0.375; // Valores do Item 1 do backlog
    const consumoMemoria = memoryGb * 0.05; // Ajuste para a constante real da sua documentação
    const consumoDisco = diskGb * 0.01;
    const consumoRede = networkGb * 0.02;

    const potenciaWatts =
      consumoCpu + consumoMemoria + consumoDisco + consumoRede;
    const horas = intervaloSegundos / 3600;

    return (potenciaWatts * horas) / 1000;
  }
}
