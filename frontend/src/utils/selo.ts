export type Selo = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | '—';

export function isSelo(value: unknown): value is Selo {
  return (
    value === 'A' ||
    value === 'B' ||
    value === 'C' ||
    value === 'D' ||
    value === 'E' ||
    value === 'F' ||
    value === '—'
  );
}

export function normalizarSelo(value: unknown): Selo {
  return isSelo(value) ? value : '—';
}

export function getSeloColor(value: unknown): string {
  switch (normalizarSelo(value)) {
    case 'A':
      return '#15803d';
    case 'B':
      return '#4d7c0f';
    case 'C':
      return '#a16207';
    case 'D':
      return '#c2410c';
    case 'E':
      return '#dc2626';
    case 'F':
      return '#991b1b';
    case '—':
      return '#6b7280';
    default:
      return '#6b7280';
  }
}

export function getSeloTooltip(value: unknown): string {
  switch (normalizarSelo(value)) {
    case 'A':
      return 'Melhor eficiência: <= 10g CO2e/h';
    case 'B':
      return '> 10 e <= 20g CO2e/h';
    case 'C':
      return '> 20 e <= 30g CO2e/h';
    case 'D':
      return '> 30 e <= 40g CO2e/h';
    case 'E':
      return '> 40 e <= 50g CO2e/h';
    case 'F':
      return '> 50g CO2e/h';
    case '—':
      return 'Sem coleta válida no período';
    default:
      return 'Sem coleta válida no período';
  }
}
