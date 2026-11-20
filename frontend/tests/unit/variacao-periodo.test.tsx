import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import VariacaoPeriodo from '../../src/components/common/VariacaoPeriodo';

const periodo = {
  inicio: '2026-11-01T00:00:00Z',
  fim: '2026-11-08T00:00:00Z',
};

describe('Variação do período', () => {
  it.each([
    [12, '▲ 12% em relação aos 7 dias anteriores', 'alerta'],
    [-5, '▼ 5% em relação aos 7 dias anteriores', 'melhoria'],
    [0, '— 0% em relação aos 7 dias anteriores', 'estavel'],
    [null, 'sem base de comparação', 'sem-base'],
  ] as const)(
    'explica a variação %s sem depender da cor',
    (valor, texto, estado) => {
      render(<VariacaoPeriodo valor={valor} periodo={periodo} />);
      expect(screen.getByText(texto)).toHaveClass(`variacao--${estado}`);
    },
  );

  it('descreve uma janela personalizada com horas em vez de assumir sete dias', () => {
    render(
      <VariacaoPeriodo
        valor={10}
        periodo={{ ...periodo, fim: '2026-11-01T12:00:00Z' }}
      />,
    );
    expect(
      screen.getByText('▲ 10% em relação às 12 horas anteriores'),
    ).toBeVisible();
  });
});
