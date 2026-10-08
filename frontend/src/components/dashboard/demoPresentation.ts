import type { ServiceStatus } from '../../types/dashboard';
import type { IconName } from '../common/Icon';

export function formatNumber(value: number, digits = 2) {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

export const serviceStatusPresentation: Record<
  ServiceStatus,
  { label: string; icon: IconName }
> = {
  active: { label: 'Ativo', icon: 'check' },
  unavailable: { label: 'Indisponível', icon: 'alert' },
  noMetrics: { label: 'Sem métricas', icon: 'info' },
};
