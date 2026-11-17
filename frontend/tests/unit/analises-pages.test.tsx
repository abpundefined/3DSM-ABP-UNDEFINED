import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import Comparacao from '../../src/pages/Comparacao';
import Ranking from '../../src/pages/Ranking';

vi.mock('../../src/hooks/usePrefersReducedMotion', () => ({
  default: () => true,
}));

vi.mock('recharts', async (importOriginal) => ({
  ...(await importOriginal<typeof import('recharts')>()),
  ResponsiveContainer: () => null,
}));

describe('Páginas de análise em construção', () => {
  it('apresenta o aviso de ranking e o gráfico demonstrativo', () => {
    render(<Ranking />);
    expect(screen.getByRole('heading', { name: 'Ranking' })).toBeVisible();
    expect(screen.getByLabelText('Situação da página')).toHaveTextContent(
      '#91',
    );
    expect(screen.getByText(/Exemplo com dados fictícios/)).toBeVisible();
    expect(document.title).toBe('Ranking | GreenER');
  });

  it('apresenta o aviso de comparação', () => {
    render(<Comparacao />);
    expect(
      screen.getByRole('heading', { name: 'Comparar serviços' }),
    ).toBeVisible();
    expect(screen.getByLabelText('Situação da página')).toHaveTextContent(
      '#94',
    );
    expect(document.title).toBe('Comparar serviços | GreenER');
  });
});
