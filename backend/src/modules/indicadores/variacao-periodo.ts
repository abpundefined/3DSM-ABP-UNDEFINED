export interface VariacaoPercentual {
  energiaKwh: number | null;
  emissaoGCo2e: number | null;
}

export function periodoAnterior(inicio: Date, fim: Date) {
  const fimAnterior = inicio.getTime() - 1;
  return {
    inicio: new Date(fimAnterior - (fim.getTime() - inicio.getTime())),
    fim: new Date(fimAnterior),
  };
}

export function calcularVariacaoPercentual(
  atual: number | null,
  anterior: number | null,
): number | null {
  return atual === null || anterior === null || anterior === 0
    ? null
    : ((atual - anterior) / anterior) * 100;
}
