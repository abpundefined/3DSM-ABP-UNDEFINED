export type FaixaCpu = 'baixo' | 'moderado' | 'alto' | 'sem-dados';

export type DadosAnelCpu = {
  percentual: number | null;
  percentualLimitado: number;
  faixa: FaixaCpu;
  rotuloFaixa: string;
  textoCentro: string;
  textoAcessivel: string;
  circunferencia: number;
  dashOffset: number;
};

export const TAMANHO_ANEL_CPU = 60;
export const ESPESSURA_ANEL_CPU = 5;
export const RAIO_ANEL_CPU = (TAMANHO_ANEL_CPU - ESPESSURA_ANEL_CPU) / 2;
export const CIRCUNFERENCIA_ANEL_CPU = 2 * Math.PI * RAIO_ANEL_CPU;

export const LIMITE_CPU_MODERADO = 50;
export const LIMITE_CPU_ALTO = 80;

const formatoPercentual = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

function normalizarNumero(valor: unknown): number | null {
  if (typeof valor === 'number') {
    return Number.isFinite(valor) ? valor : null;
  }
  if (typeof valor === 'string' && valor.trim() !== '') {
    const convertido = Number(valor);
    return Number.isFinite(convertido) ? convertido : null;
  }
  return null;
}

export function classificarFaixaCpu(percentual: number | null): {
  faixa: FaixaCpu;
  rotuloFaixa: string;
} {
  if (percentual === null) {
    return { faixa: 'sem-dados', rotuloFaixa: 'Sem dados' };
  }
  if (percentual >= LIMITE_CPU_ALTO) {
    return { faixa: 'alto', rotuloFaixa: 'Alto' };
  }
  if (percentual >= LIMITE_CPU_MODERADO) {
    return { faixa: 'moderado', rotuloFaixa: 'Moderado' };
  }
  return { faixa: 'baixo', rotuloFaixa: 'Baixo' };
}

export function calcularAnelCpu(cpuPercent: unknown): DadosAnelCpu {
  const bruto = normalizarNumero(cpuPercent);
  const percentual = bruto === null || bruto < 0 ? null : bruto;
  const percentualLimitado =
    percentual === null ? 0 : Math.min(100, Math.max(0, percentual));
  const { faixa, rotuloFaixa } = classificarFaixaCpu(percentual);

  if (percentual === null) {
    return {
      percentual: null,
      percentualLimitado: 0,
      faixa,
      rotuloFaixa,
      textoCentro: '—',
      textoAcessivel: 'Sem dados de uso de CPU',
      circunferencia: CIRCUNFERENCIA_ANEL_CPU,
      dashOffset: CIRCUNFERENCIA_ANEL_CPU,
    };
  }

  const textoCentro = `${formatoPercentual.format(percentual)} %`;
  const dashOffset = CIRCUNFERENCIA_ANEL_CPU * (1 - percentualLimitado / 100);

  return {
    percentual,
    percentualLimitado,
    faixa,
    rotuloFaixa,
    textoCentro,
    textoAcessivel: `${textoCentro} (${rotuloFaixa.toLocaleLowerCase('pt-BR')})`,
    circunferencia: CIRCUNFERENCIA_ANEL_CPU,
    dashOffset,
  };
}
