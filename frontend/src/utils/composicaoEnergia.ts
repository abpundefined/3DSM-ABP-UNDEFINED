import { CONSTANTES_CALCULO } from './metodologia.ts';

export type ComponentesEnergia = {
  cpuW: number;
  memoriaW: number;
  discoW: number;
  redeW: number;
  totalW: number;
};

export type ComponenteChave = 'cpu' | 'memoria' | 'disco' | 'rede';

export type DefinicaoComponente = {
  chave: ComponenteChave;
  campo: 'cpuW' | 'memoriaW' | 'discoW' | 'redeW';
  nome: string;
  cor: string;
};

export const COMPONENTES_ENERGIA: readonly DefinicaoComponente[] = [
  { chave: 'cpu', campo: 'cpuW', nome: 'CPU', cor: 'var(--serie-0)' },
  {
    chave: 'memoria',
    campo: 'memoriaW',
    nome: 'Memória',
    cor: 'var(--serie-1)',
  },
  { chave: 'disco', campo: 'discoW', nome: 'Disco', cor: 'var(--serie-2)' },
  { chave: 'rede', campo: 'redeW', nome: 'Rede', cor: 'var(--serie-3)' },
] as const;

export type ItemComposicaoEnergia = DefinicaoComponente & {
  watts: number;
  percentual: number;
};

export type ResumoComposicaoEnergia = {
  totalW: number;
  possuiConsumo: boolean;
  itens: ItemComposicaoEnergia[];
  principal: ItemComposicaoEnergia | null;
  fraseResumo: string;
};

function isFiniteNonNegative(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

export function isComponentesEnergia(
  value: unknown,
): value is ComponentesEnergia {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const record = value as Record<string, unknown>;
  return (
    isFiniteNonNegative(record.cpuW) &&
    isFiniteNonNegative(record.memoriaW) &&
    isFiniteNonNegative(record.discoW) &&
    isFiniteNonNegative(record.redeW) &&
    isFiniteNonNegative(record.totalW)
  );
}

export function somarComponentes(
  lista: ReadonlyArray<ComponentesEnergia | null | undefined>,
): ComponentesEnergia | null {
  const validos = lista.filter(isComponentesEnergia);
  if (validos.length === 0) {
    return null;
  }

  let cpuW = 0;
  let memoriaW = 0;
  let discoW = 0;
  let redeW = 0;

  for (const item of validos) {
    cpuW += item.cpuW;
    memoriaW += item.memoriaW;
    discoW += item.discoW;
    redeW += item.redeW;
  }

  return {
    cpuW,
    memoriaW,
    discoW,
    redeW,
    totalW: cpuW + memoriaW + discoW + redeW,
  };
}

export function mediarComponentes(
  lista: ReadonlyArray<ComponentesEnergia | null | undefined>,
): ComponentesEnergia | null {
  const validos = lista.filter(isComponentesEnergia);
  if (validos.length === 0) {
    return null;
  }

  const soma = somarComponentes(validos);
  if (!soma) {
    return null;
  }

  const quantidade = validos.length;
  const cpuW = soma.cpuW / quantidade;
  const memoriaW = soma.memoriaW / quantidade;
  const discoW = soma.discoW / quantidade;
  const redeW = soma.redeW / quantidade;

  return {
    cpuW,
    memoriaW,
    discoW,
    redeW,
    totalW: cpuW + memoriaW + discoW + redeW,
  };
}

export function resolverComposicaoServico(
  historico: ReadonlyArray<{ componentes?: ComponentesEnergia | null }>,
  fallbackServico?: ComponentesEnergia | null,
): ComponentesEnergia | null {
  const mediaHistorico = mediarComponentes(
    historico.map((ponto) => ponto.componentes),
  );
  if (mediaHistorico) {
    return mediaHistorico;
  }

  return isComponentesEnergia(fallbackServico) ? fallbackServico : null;
}

export function formatarWatts(valor: number): string {
  if (!Number.isFinite(valor) || valor < 0) {
    return '—';
  }
  const casas = valor > 0 && valor < 0.01 ? 3 : 2;
  const formatado = new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  }).format(valor);
  return `${formatado} W`;
}

export function formatarPercentualComposicao(valor: number): string {
  if (!Number.isFinite(valor) || valor < 0) {
    return '—';
  }
  const formatado = new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(valor);
  return `${formatado}%`;
}

export function formatarPercentualInteiro(valor: number): string {
  if (!Number.isFinite(valor) || valor < 0) {
    return '0%';
  }
  const arredondado = Math.round(valor);
  if (valor > 0 && arredondado === 0) {
    return '< 1%';
  }
  return `${arredondado}%`;
}

export function calcularComposicaoEnergia(
  componentes: ComponentesEnergia | null | undefined,
): ResumoComposicaoEnergia | null {
  if (!isComponentesEnergia(componentes)) {
    return null;
  }

  const totalW =
    componentes.cpuW +
    componentes.memoriaW +
    componentes.discoW +
    componentes.redeW;

  if (totalW <= 0) {
    return {
      totalW: 0,
      possuiConsumo: false,
      itens: COMPONENTES_ENERGIA.map((definicao) => ({
        ...definicao,
        watts: 0,
        percentual: 0,
      })),
      principal: null,
      fraseResumo: 'Nenhum consumo de energia registrado para os componentes.',
    };
  }

  const itens: ItemComposicaoEnergia[] = COMPONENTES_ENERGIA.map(
    (definicao) => {
      const watts = componentes[definicao.campo];
      return {
        ...definicao,
        watts,
        percentual: (watts / totalW) * 100,
      };
    },
  );

  let principal = itens[0];
  for (const item of itens) {
    if (item.watts > principal.watts) {
      principal = item;
    }
  }

  const fraseResumo = `${principal.nome} responde por ${formatarPercentualInteiro(principal.percentual)} do consumo.`;

  return {
    totalW,
    possuiConsumo: true,
    itens,
    principal,
    fraseResumo,
  };
}

export function calcularComponentesPorMetricas(metricas: {
  cpuPercent: number;
  memoryGb: number;
  diskGb: number;
  networkGb: number;
}): ComponentesEnergia {
  const cpuW = (metricas.cpuPercent / 100) * CONSTANTES_CALCULO.cpuMaxWatts;
  const memoriaW = metricas.memoryGb * CONSTANTES_CALCULO.memoriaWattsPorGb;
  const discoW = metricas.diskGb * CONSTANTES_CALCULO.discoWattsPorGb;
  const redeW = metricas.networkGb * CONSTANTES_CALCULO.redeWattsPorGb;

  return {
    cpuW,
    memoriaW,
    discoW,
    redeW,
    totalW: cpuW + memoriaW + discoW + redeW,
  };
}
