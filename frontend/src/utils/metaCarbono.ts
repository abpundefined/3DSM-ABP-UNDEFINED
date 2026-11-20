export type RespostaMetaCarbono = {
  metaMensal: number | null;
  acumuladoMes: number;
  diasDecorridos: number;
  diasNoMes: number;
  projecaoMes: number;
};

export type ResumoMetaCarbono = {
  temMeta: boolean;
  percentualConsumido: number | null;
  percentualBarra: number;
  ultrapassouMeta: boolean;
  projecaoUltrapassaMeta: boolean;
  excessoProjetadoKg: number;
  textoProjecao: string;
};

export const META_CARBONO_DEMO: RespostaMetaCarbono = {
  metaMensal: 35,
  acumuladoMes: 24.5,
  diasDecorridos: 20,
  diasNoMes: 30,
  projecaoMes: 36.75,
};

function isFiniteNonNegative(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

export function isRespostaMetaCarbono(
  value: unknown,
): value is RespostaMetaCarbono {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const record = value as Record<string, unknown>;
  const metaValida =
    record.metaMensal === null || isFiniteNonNegative(record.metaMensal);

  return (
    metaValida &&
    isFiniteNonNegative(record.acumuladoMes) &&
    isFiniteNonNegative(record.projecaoMes) &&
    typeof record.diasDecorridos === 'number' &&
    Number.isInteger(record.diasDecorridos) &&
    record.diasDecorridos >= 1 &&
    typeof record.diasNoMes === 'number' &&
    Number.isInteger(record.diasNoMes) &&
    record.diasNoMes >= record.diasDecorridos &&
    record.diasNoMes <= 31
  );
}

export function formatarKgCo2e(valorKg: number): string {
  if (!Number.isFinite(valorKg) || valorKg < 0) {
    return '—';
  }
  const casas = valorKg > 0 && valorKg < 0.01 ? 3 : 2;
  const formatado = new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  }).format(valorKg);
  return `${formatado} kgCO₂e`;
}

export function formatarPercentualMeta(valor: number): string {
  if (!Number.isFinite(valor) || valor < 0) {
    return '—';
  }
  const formatado = new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(valor);
  return `${formatado}%`;
}

export function calcularResumoMeta(
  dados: RespostaMetaCarbono,
): ResumoMetaCarbono {
  const temMeta = dados.metaMensal !== null && dados.metaMensal > 0;
  const meta = temMeta ? dados.metaMensal! : null;
  const percentualConsumido =
    meta !== null ? (dados.acumuladoMes / meta) * 100 : null;
  const percentualBarra =
    percentualConsumido === null
      ? 0
      : Math.min(100, Math.max(0, percentualConsumido));
  const ultrapassouMeta = meta !== null && dados.acumuladoMes > meta;
  const projecaoUltrapassaMeta = meta !== null && dados.projecaoMes > meta;
  const excessoProjetadoKg =
    projecaoUltrapassaMeta && meta !== null ? dados.projecaoMes - meta : 0;

  return {
    temMeta,
    percentualConsumido,
    percentualBarra,
    ultrapassouMeta,
    projecaoUltrapassaMeta,
    excessoProjetadoKg,
    textoProjecao: `No ritmo atual: ${formatarKgCo2e(dados.projecaoMes)} este mês`,
  };
}
