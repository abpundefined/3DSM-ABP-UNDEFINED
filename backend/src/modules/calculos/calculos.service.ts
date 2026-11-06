import { Injectable } from "@nestjs/common";

export interface MetricasColeta {
  cpuPercent: number;
  cpuMaxWatts: number;
  memoriaGb: number;
  discoGb: number;
  redeGb: number;
  intervaloSegundos: number;
}

@Injectable()
export class CalculosService {
  // Constantes oficiais do desafio (W/GB)
  private readonly FATOR_MEMORIA = 0.375;
  private readonly FATOR_DISCO = 0.01;
  private readonly FATOR_REDE = 0.02;

  // Fallback de emissão (gCO2e/kWh)
  private readonly CARBONO_FALLBACK = 85.0;

  calcularPotenciaTotal(metricas: MetricasColeta): number {
    const potenciaCpu = (metricas.cpuPercent / 100) * metricas.cpuMaxWatts;
    const potenciaMemoria = metricas.memoriaGb * this.FATOR_MEMORIA;
    const potenciaDisco = metricas.discoGb * this.FATOR_DISCO;
    const potenciaRede = metricas.redeGb * this.FATOR_REDE;

    return potenciaCpu + potenciaMemoria + potenciaDisco + potenciaRede;
  }

  calcularEnergiaKwh(potenciaWatts: number, intervaloSegundos: number): number {
    // Conversão direta de segundos para horas sem arredondamento prematuro
    const tempoEmHoras = intervaloSegundos / 3600;
    return (potenciaWatts * tempoEmHoras) / 1000;
  }

  calcularEmissaoGco2e(
    energiaKwh: number,
    intensidadeCarbono: number = this.CARBONO_FALLBACK,
  ): number {
    return energiaKwh * intensidadeCarbono;
  }

  processarImpactoAmbiental(
    metricas: MetricasColeta,
    intensidadeCarbono?: number,
  ) {
    const potencia = this.calcularPotenciaTotal(metricas);
    const energia = this.calcularEnergiaKwh(
      potencia,
      metricas.intervaloSegundos,
    );

    const fatorCarbono = intensidadeCarbono ?? this.CARBONO_FALLBACK;
    const emissao = this.calcularEmissaoGco2e(energia, fatorCarbono);

    return {
      potenciaWatts: potencia,
      energiaKwh: energia,
      emissaoGco2e: emissao,
    };
  }
}
