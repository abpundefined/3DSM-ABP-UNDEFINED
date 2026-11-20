import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import GuidedTour from '../../src/components/tour/GuidedTour';
import type { PassoTour } from '../../src/utils/tour';

const passosTeste: PassoTour[] = [
  {
    id: 'periodo',
    titulo: 'Seletor de período',
    descricao: 'Escolha o período desejado.',
    seletor: '.alvo-periodo',
  },
  {
    id: 'ausente',
    titulo: 'Elemento ausente',
    descricao: 'Deve ser pulado automaticamente.',
    seletor: '.alvo-inexistente',
  },
  {
    id: 'mapa',
    titulo: 'Mapa de emissões',
    descricao: 'Explore as regiões no mapa.',
    seletor: '.alvo-mapa',
  },
];

describe('GuidedTour', () => {
  it('pula passos ausentes sem erro, navega entre passos e fecha com Esc devolvendo o foco', async () => {
    const user = userEvent.setup();
    const onFechar = vi.fn();
    const trigger = document.createElement('button');
    trigger.textContent = 'Fazer tour';
    document.body.appendChild(trigger);

    render(
      <div>
        <div className="alvo-periodo">Período</div>
        <div className="alvo-mapa">Mapa</div>
        <GuidedTour
          aberto
          focarAoAbrir
          returnFocusTo={trigger}
          onFechar={onFechar}
          passos={passosTeste}
        />
      </div>,
    );

    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveFocus();
    expect(screen.getByText(/Passo 1 de 2/)).toBeVisible();
    expect(
      screen.getByRole('heading', { name: 'Seletor de período' }),
    ).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Próximo' }));
    expect(screen.getByText(/Passo 2 de 2/)).toBeVisible();
    expect(
      screen.getByRole('heading', { name: 'Mapa de emissões' }),
    ).toBeVisible();
    expect(screen.queryByText('Elemento ausente')).not.toBeInTheDocument();

    await user.keyboard('{Escape}');
    await waitFor(() => expect(onFechar).toHaveBeenCalledTimes(1));
    expect(trigger).toHaveFocus();
    trigger.remove();
  });

  it('permite pular o tour a qualquer momento', async () => {
    const user = userEvent.setup();
    const onFechar = vi.fn();

    render(
      <div>
        <div className="alvo-periodo">Período</div>
        <GuidedTour
          aberto
          focarAoAbrir={false}
          returnFocusTo={null}
          onFechar={onFechar}
          passos={passosTeste}
        />
      </div>,
    );

    await screen.findByRole('dialog');
    await user.click(screen.getByRole('button', { name: 'Pular tour' }));
    expect(onFechar).toHaveBeenCalledTimes(1);
  });
});
