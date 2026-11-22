import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import LinhaDoTempoEstado from '../../src/components/servico/LinhaDoTempoEstado';

const historico = [
  {
    inicio: '2026-11-15T13:00:00.000Z',
    coletas: 992,
    ativo: 992,
    indisponivel: 0,
    semMetricas: 0,
  },
  {
    inicio: '2026-11-15T14:00:00.000Z',
    coletas: 5,
    ativo: 0,
    indisponivel: 5,
    semMetricas: 0,
  },
  {
    inicio: '2026-11-15T15:00:00.000Z',
    coletas: 3,
    ativo: 0,
    indisponivel: 0,
    semMetricas: 3,
  },
];

describe('LinhaDoTempoEstado', () => {
  it('exibe disponibilidade percentual, legenda textual, tooltips e detalhe ao clicar no segmento', async () => {
    const user = userEvent.setup();
    render(<LinhaDoTempoEstado history={historico} />);

    expect(
      screen.getByRole('heading', { name: 'Linha do tempo de estado' }),
    ).toBeVisible();
    expect(screen.getByText('99,2% disponível')).toBeVisible();

    const legenda = within(
      screen.getByRole('list', {
        name: 'Legenda dos estados da linha do tempo',
      }),
    );
    expect(legenda.getByText('Ativo')).toBeVisible();
    expect(legenda.getByText('Indisponível')).toBeVisible();
    expect(legenda.getByText('Sem métricas')).toBeVisible();

    const segmentos = within(
      screen.getByRole('group', { name: 'Segmentos de estado por intervalo' }),
    ).getAllByRole('button');
    expect(segmentos).toHaveLength(3);
    expect(segmentos[1]).toHaveAttribute(
      'title',
      expect.stringContaining('Estado predominante: Indisponível'),
    );

    await user.click(segmentos[1]);
    expect(segmentos[1]).toHaveAttribute('aria-pressed', 'true');
    expect(
      screen.getByRole('heading', { name: '15/11/2026, 11:00 – 12:00' }),
    ).toBeVisible();
    expect(screen.getByText('Predominante: Indisponível')).toBeVisible();

    const detalhe = segmentos[1].closest('section')!;
    const contagens = within(detalhe).getAllByRole('definition');
    expect(contagens.map((el) => el.textContent)).toEqual(['0', '5', '0', '5']);

    await user.click(screen.getByRole('button', { name: 'Fechar detalhe' }));
    expect(segmentos[1]).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByText(/Clique em um segmento da barra/i)).toBeVisible();
  });

  it('mostra aviso claro quando não há coletas de estado no período', () => {
    render(
      <LinhaDoTempoEstado history={[{ inicio: '2026-11-15T13:00:00.000Z' }]} />,
    );

    expect(screen.getByText('Sem coletas no período')).toBeVisible();
    expect(
      screen.getByText(/Não há coletas de estado registradas/i),
    ).toBeVisible();
  });
});
