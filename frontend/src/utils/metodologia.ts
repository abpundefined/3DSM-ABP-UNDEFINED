export const CONSTANTES_CALCULO = {
  cpuMaxWatts: 0.5,
  memoriaWattsPorGb: 0.375,
  discoWattsPorGb: 0.01,
  redeWattsPorGb: 0.02,
} as const;

export type EntradaCalculoExemplo = {
  cpuPercent: number;
  memoryGb: number;
  diskGb: number;
  networkGb: number;
  intervaloSegundos: number;
  intensidadeCarbonoGCo2ePorKwh: number;
};

export type ResultadoCalculoExemplo = {
  consumoCpuW: number;
  consumoMemoriaW: number;
  consumoDiscoW: number;
  consumoRedeW: number;
  potenciaTotalW: number;
  energiaKwh: number;
  energiaWh: number;
  emissaoGCo2e: number;
};

export function calcularEstimativaExemplo(
  entrada: EntradaCalculoExemplo,
): ResultadoCalculoExemplo {
  const medicoes = [
    entrada.cpuPercent,
    entrada.memoryGb,
    entrada.diskGb,
    entrada.networkGb,
  ];
  if (
    medicoes.some((valor) => !Number.isFinite(valor) || valor < 0) ||
    entrada.cpuPercent > 100
  ) {
    throw new RangeError(
      'As métricas devem ser finitas e não negativas; CPU deve estar entre 0 e 100%.',
    );
  }
  if (
    !Number.isFinite(entrada.intervaloSegundos) ||
    entrada.intervaloSegundos <= 0
  ) {
    throw new RangeError('O intervalo de coleta deve ser finito e positivo.');
  }
  if (
    !Number.isFinite(entrada.intensidadeCarbonoGCo2ePorKwh) ||
    entrada.intensidadeCarbonoGCo2ePorKwh < 0
  ) {
    throw new RangeError('A intensidade de carbono deve ser não negativa.');
  }

  const consumoCpuW =
    (entrada.cpuPercent / 100) * CONSTANTES_CALCULO.cpuMaxWatts;
  const consumoMemoriaW =
    entrada.memoryGb * CONSTANTES_CALCULO.memoriaWattsPorGb;
  const consumoDiscoW = entrada.diskGb * CONSTANTES_CALCULO.discoWattsPorGb;
  const consumoRedeW = entrada.networkGb * CONSTANTES_CALCULO.redeWattsPorGb;
  const potenciaTotalW =
    consumoCpuW + consumoMemoriaW + consumoDiscoW + consumoRedeW;

  const horas = entrada.intervaloSegundos / 3600;
  const energiaKwh = (potenciaTotalW * horas) / 1000;
  const energiaWh = energiaKwh * 1000;
  const emissaoGCo2e = energiaKwh * entrada.intensidadeCarbonoGCo2ePorKwh;

  return {
    consumoCpuW,
    consumoMemoriaW,
    consumoDiscoW,
    consumoRedeW,
    potenciaTotalW,
    energiaKwh,
    energiaWh,
    emissaoGCo2e,
  };
}

const ENTRADA_EXEMPLO: EntradaCalculoExemplo = {
  cpuPercent: 60,
  memoryGb: 8,
  diskGb: 50,
  networkGb: 10,
  intervaloSegundos: 3600,
  intensidadeCarbonoGCo2ePorKwh: 100,
};

export const EXEMPLO_CALCULO_REAL = {
  entrada: ENTRADA_EXEMPLO,
  resultado: calcularEstimativaExemplo(ENTRADA_EXEMPLO),
};
