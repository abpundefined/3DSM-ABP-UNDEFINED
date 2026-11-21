import { formatarPercentualMeta } from './metaCarbono.ts';

export type EstadoPlanetaMeta = 'abaixo' | 'perto' | 'acima';

export const LIMIAR_PERTO_DA_META_PERCENT = 80;

export type EntradaEstadoPlaneta = {
  percentualConsumido: number;
  ultrapassouMeta: boolean;
  projecaoUltrapassaMeta: boolean;
};

export function resolverEstadoPlanetaMeta({
  percentualConsumido,
  ultrapassouMeta,
  projecaoUltrapassaMeta,
}: EntradaEstadoPlaneta): EstadoPlanetaMeta {
  if (
    ultrapassouMeta ||
    (Number.isFinite(percentualConsumido) && percentualConsumido > 100)
  ) {
    return 'acima';
  }

  if (
    projecaoUltrapassaMeta ||
    (Number.isFinite(percentualConsumido) &&
      percentualConsumido >= LIMIAR_PERTO_DA_META_PERCENT)
  ) {
    return 'perto';
  }

  return 'abaixo';
}

export function rotuloEstadoPlaneta(estado: EstadoPlanetaMeta): string {
  switch (estado) {
    case 'abaixo':
      return 'Abaixo da meta';
    case 'perto':
      return 'Perto da meta';
    case 'acima':
      return 'Acima da meta';
  }
}

export function descreverPlanetaMeta(
  estado: EstadoPlanetaMeta,
  percentualConsumido: number,
): string {
  const percentual = formatarPercentualMeta(percentualConsumido);
  switch (estado) {
    case 'abaixo':
      return `Planeta florescendo: abaixo da meta de carbono (${percentual} da meta utilizada).`;
    case 'perto':
      return `Planeta em atenção: perto da meta de carbono (${percentual} da meta utilizada).`;
    case 'acima':
      return `Planeta murcho: acima da meta de carbono (${percentual} da meta utilizada).`;
  }
}
