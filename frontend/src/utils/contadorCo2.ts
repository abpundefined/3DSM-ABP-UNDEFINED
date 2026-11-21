export const INTERVALO_ATUALIZACAO_CONTADOR_MS = 1_000;
export const INTERVALO_CONTADOR_MOVIMENTO_REDUZIDO_MS = 5_000;
export const INTERVALO_ANUNCIO_LEITOR_TELA_MS = 30_000;
export const SEGUNDOS_EM_UM_DIA = 86_400;

export type LeituraEmissaoServico = {
  emissaoGCo2e?: number | null;
  intervaloSegundos?: number | null;
};

export type PeriodoIntervalo = {
  inicio: string;
  fim: string;
};

function numeroPositivoFinito(valor: unknown): valor is number {
  return typeof valor === 'number' && Number.isFinite(valor) && valor > 0;
}

export function calcularTaxaEmissaoGPorSegundo(
  leituras: readonly LeituraEmissaoServico[],
  intervaloPadraoSegundos?: number | null,
): number {
  const intervaloFallback = numeroPositivoFinito(intervaloPadraoSegundos)
    ? intervaloPadraoSegundos
    : null;

  return leituras.reduce((soma, leitura) => {
    if (!numeroPositivoFinito(leitura.emissaoGCo2e)) {
      return soma;
    }

    const intervalo = numeroPositivoFinito(leitura.intervaloSegundos)
      ? leitura.intervaloSegundos
      : intervaloFallback;
    if (!intervalo) {
      return soma;
    }

    return soma + leitura.emissaoGCo2e / intervalo;
  }, 0);
}

export function calcularDuracaoPeriodoSegundos(
  periodo?: PeriodoIntervalo | null,
  duracaoPadraoSegundos = SEGUNDOS_EM_UM_DIA,
): number {
  const padrao = numeroPositivoFinito(duracaoPadraoSegundos)
    ? duracaoPadraoSegundos
    : SEGUNDOS_EM_UM_DIA;

  if (!periodo) {
    return padrao;
  }

  const inicio = Date.parse(periodo.inicio);
  const fim = Date.parse(periodo.fim);
  if (!Number.isFinite(inicio) || !Number.isFinite(fim) || fim <= inicio) {
    return padrao;
  }

  return (fim - inicio) / 1000;
}

export function calcularTaxaPorTotalEPeriodo(
  emissaoTotalGCo2e: number | null | undefined,
  periodo?: PeriodoIntervalo | null,
  duracaoPadraoSegundos = SEGUNDOS_EM_UM_DIA,
): number {
  if (!numeroPositivoFinito(emissaoTotalGCo2e)) {
    return 0;
  }

  const duracao = calcularDuracaoPeriodoSegundos(
    periodo,
    duracaoPadraoSegundos,
  );
  return emissaoTotalGCo2e / duracao;
}

export function calcularAcumuladoCo2(
  taxaGPorSegundo: number,
  segundosDecorridos: number,
): number {
  if (
    !numeroPositivoFinito(taxaGPorSegundo) ||
    !numeroPositivoFinito(segundosDecorridos)
  ) {
    return 0;
  }

  return taxaGPorSegundo * segundosDecorridos;
}

export function formatarGramasContador(valorG: number): string {
  if (!Number.isFinite(valorG) || valorG <= 0) {
    return '0,00';
  }

  let casas = 0;
  if (valorG < 0.01) {
    casas = 4;
  } else if (valorG < 1) {
    casas = 3;
  } else if (valorG < 100) {
    casas = 2;
  } else if (valorG < 1000) {
    casas = 1;
  }

  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  }).format(valorG);
}

export function formatarTaxaGPorSegundo(taxaGPorSegundo: number): string {
  return `${formatarGramasContador(taxaGPorSegundo)} g/s`;
}

export function montarFraseContadorCo2(valorG: number): string {
  return `Desde que você chegou, os serviços emitiram ${formatarGramasContador(valorG)} g de CO₂e`;
}
