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

export function getSeloColor(selo: string): string {
  switch (selo) {
    case 'A':
      return '#16a34a';
    case 'B':
      return '#65a30d';
    case 'C':
      return '#ca8a04';
    case 'D':
      return '#ea580c';
    case 'E':
      return '#dc2626';
    case 'F':
      return '#991b1b';
    case '—':
      return '#6b7280';
    default:
      throw new Error(`Selo de eficiência inválido: ${selo}`);
  }
}

export function getSeloTooltip(selo: string): string {
  switch (selo) {
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
      throw new Error(`Selo de eficiência inválido: ${selo}`);
  }
}
