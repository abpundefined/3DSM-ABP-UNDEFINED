import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import PainelOportunidadesDashboard from '../../src/components/oportunidades/PainelOportunidadesDashboard';
import { oportunidadesDemo } from '../../src/mocks/oportunidades';
import Oportunidades from '../../src/pages/Oportunidades';
import PeriodProvider from '../../src/providers/PeriodProvider';

describe('Oportunidades de redução de emissão', () => {
  it('exibe indicador Redução potencial no período, 4 maiores cartões e link Ver todas no dashboard', () => {
    render(
      <MemoryRouter>
        <PainelOportunidadesDashboard
          estado={{ status: 'pronto', dados: oportunidadesDemo }}
          linkSearch="?periodo=7d"
        />
      </MemoryRouter>,
    );

    expect(screen.getByText('Redução potencial no período')).toBeVisible();
    expect(screen.getByText('28,45 gCO₂e')).toBeVisible();
    expect(screen.getByRole('link', { name: /Ver todas/i })).toHaveAttribute(
      'href',
      '/oportunidades?periodo=7d',
    );
    expect(
      screen.getByText(/não representam garantia de economia/i),
    ).toBeVisible();
    // Mostra exatamente os 4 maiores cartões (dos 5 existentes no demo)
    expect(screen.getAllByRole('article')).toHaveLength(4);
  });

  it('filtra oportunidades por tipo na página /oportunidades em modo demo', () => {
    render(
      <MemoryRouter initialEntries={['/oportunidades?demo=1']}>
        <PeriodProvider>
          <Oportunidades />
        </PeriodProvider>
      </MemoryRouter>,
    );

    expect(
      screen.getByRole('heading', { name: 'Oportunidades de redução' }),
    ).toBeVisible();
    expect(screen.getAllByRole('article')).toHaveLength(5);

    fireEvent.click(
      screen.getByRole('button', { name: /Superdimensionamento \(1\)/i }),
    );
    expect(screen.getAllByRole('article')).toHaveLength(1);
    expect(screen.getByText('Search API')).toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: /Todos \(5\)/i }));
    expect(screen.getAllByRole('article')).toHaveLength(5);
  });
});
