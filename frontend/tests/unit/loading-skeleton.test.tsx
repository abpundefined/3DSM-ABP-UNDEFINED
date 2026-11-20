import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import FeedbackPanel from '../../src/components/common/FeedbackPanel';
import LoadingSkeleton from '../../src/components/common/LoadingSkeleton';
import PainelDaTendencia from '../../src/components/tendencia/PainelDaTendencia';

describe('LoadingSkeleton e estados de carregamento', () => {
  it.each(['cards', 'chart', 'table', 'detail', 'page'] as const)(
    'renderiza esqueleto com shimmer e papel acessível para a variante %s',
    (variant) => {
      const { container } = render(
        <LoadingSkeleton
          variant={variant}
          title="Carregando dados"
          description="Aguarde um instante."
        />,
      );

      const status = screen.getByRole('status');
      expect(status).toHaveAttribute('aria-busy', 'true');
      expect(
        screen.getByRole('heading', { name: 'Carregando dados' }),
      ).toHaveClass('skeleton-sr-only');
      expect(
        container.querySelectorAll('.skeleton-block').length,
      ).toBeGreaterThan(0);
    },
  );

  it('usa LoadingSkeleton no FeedbackPanel em modo loading sem spinner genérico', () => {
    const { container } = render(
      <FeedbackPanel
        kind="loading"
        skeleton="table"
        title="Carregando o ranking"
        description="Somando energia e emissão."
      />,
    );

    expect(container.querySelector('.spinner')).toBeNull();
    expect(container.querySelector('.loading-skeleton--table')).not.toBeNull();
    expect(
      screen.getByRole('heading', { name: 'Carregando o ranking' }),
    ).toHaveClass('skeleton-sr-only');
  });

  it('exibe esqueleto de gráfico no PainelDaTendencia enquanto carrega', () => {
    const { container } = render(
      <PainelDaTendencia
        estado={{ status: 'carregando' }}
        onRecarregar={() => {}}
      />,
    );

    expect(container.querySelector('.loading-skeleton--chart')).not.toBeNull();
    expect(container.querySelectorAll('.skeleton-bar')).toHaveLength(7);
  });
});
