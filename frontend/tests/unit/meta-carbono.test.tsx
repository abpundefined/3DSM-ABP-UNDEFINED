import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import PainelMetaCarbono from '../../src/components/dashboard/PainelMetaCarbono';

describe('PainelMetaCarbono', () => {
  it('exibe medidor com role="meter", percentual e aviso quando a projeção ultrapassa a meta', () => {
    render(
      <MemoryRouter>
        <PainelMetaCarbono
          estado={{
            status: 'pronto',
            dados: {
              metaMensal: 35,
              acumuladoMes: 24.5,
              diasDecorridos: 20,
              diasNoMes: 30,
              projecaoMes: 36.75,
            },
          }}
        />
      </MemoryRouter>,
    );

    const meter = screen.getByRole('meter', {
      name: 'Consumo mensal em relação à meta de carbono',
    });
    expect(meter).toHaveAttribute('aria-valuenow', '24.5');
    expect(meter).toHaveAttribute('aria-valuemax', '35');
    expect(screen.getByText('70,0% da meta')).toBeInTheDocument();
    expect(
      screen.getByText('No ritmo atual: 36,75 kgCO₂e este mês'),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /Atenção: a projeção do mês ultrapassa a meta em 1,75 kgCO₂e/,
      ),
    ).toBeInTheDocument();
  });

  it('mostra apenas a projeção quando não há meta definida', () => {
    render(
      <MemoryRouter>
        <PainelMetaCarbono
          estado={{
            status: 'pronto',
            dados: {
              metaMensal: null,
              acumuladoMes: 12.5,
              diasDecorridos: 10,
              diasNoMes: 30,
              projecaoMes: 37.5,
            },
          }}
        />
      </MemoryRouter>,
    );

    expect(screen.queryByRole('meter')).not.toBeInTheDocument();
    expect(
      screen.getByText('No ritmo atual: 37,50 kgCO₂e este mês'),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Nenhuma meta mensal definida/),
    ).toBeInTheDocument();
  });

  it('exibe estados de carregamento e erro com botão para recarregar', async () => {
    const user = userEvent.setup();
    const recarregar = vi.fn();

    const { rerender } = render(
      <MemoryRouter>
        <PainelMetaCarbono estado={{ status: 'carregando' }} />
      </MemoryRouter>,
    );
    expect(
      screen.getByText(/Carregando a meta mensal e a projeção/),
    ).toBeInTheDocument();

    rerender(
      <MemoryRouter>
        <PainelMetaCarbono
          estado={{ status: 'erro', mensagem: 'Servidor indisponível.' }}
          onRecarregar={recarregar}
        />
      </MemoryRouter>,
    );
    expect(
      screen.getByText(/Não foi possível carregar a meta mensal/),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Recarregar a meta' }));
    expect(recarregar).toHaveBeenCalledTimes(1);
  });
});
