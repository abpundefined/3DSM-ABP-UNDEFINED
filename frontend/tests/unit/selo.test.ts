import { describe, expect, it } from 'vitest';
import { getSeloColor, getSeloTooltip } from '../../src/utils/selo';

describe('getSeloColor', () => {
  it.each([
    ['A', '#15803d'],
    ['B', '#4d7c0f'],
    ['C', '#a16207'],
    ['D', '#c2410c'],
    ['E', '#dc2626'],
    ['F', '#991b1b'],
    ['—', '#6b7280'],
  ] as const)('retorna a cor do selo %s', (selo, cor) => {
    expect(getSeloColor(selo)).toBe(cor);
  });

  it.each([null, undefined, '', 'G', 42])(
    'usa a cor do selo sem dados para valores inválidos (%s)',
    (selo) => {
      expect(getSeloColor(selo)).toBe(getSeloColor('—'));
    },
  );
});

describe('getSeloTooltip', () => {
  it.each([
    ['A', 'Melhor eficiência: <= 10g CO2e/h'],
    ['B', '> 10 e <= 20g CO2e/h'],
    ['C', '> 20 e <= 30g CO2e/h'],
    ['D', '> 30 e <= 40g CO2e/h'],
    ['E', '> 40 e <= 50g CO2e/h'],
    ['F', '> 50g CO2e/h'],
    ['—', 'Sem coleta válida no período'],
  ] as const)('retorna a explicação do selo %s', (selo, tooltip) => {
    expect(getSeloTooltip(selo)).toBe(tooltip);
  });

  it.each([null, undefined, '', 'G', 42])(
    'usa a explicação do selo sem dados para valores inválidos (%s)',
    (selo) => {
      expect(getSeloTooltip(selo)).toBe(getSeloTooltip('—'));
    },
  );
});
