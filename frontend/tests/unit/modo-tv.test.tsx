import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import ModoTvBarra from '../../src/components/layout/ModoTvBarra';

describe('ModoTvBarra', () => {
  it('mostra a tela atual, a próxima tela do ciclo e permite sair ao clicar no botão', async () => {
    const user = userEvent.setup();
    const onSair = vi.fn();

    render(<ModoTvBarra pathname="/" onSair={onSair} />);

    expect(screen.getByText('Modo TV')).toBeVisible();
    expect(screen.getByRole('status')).toHaveTextContent(
      /Tela 1 de 3: Dashboard · Próxima tela: Mapa em 10s/,
    );

    await user.click(screen.getByRole('button', { name: /Sair do modo TV/i }));
    expect(onSair).toHaveBeenCalledTimes(1);
  });
});
