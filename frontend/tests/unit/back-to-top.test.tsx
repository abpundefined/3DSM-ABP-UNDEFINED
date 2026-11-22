import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import BackToTopButton from '../../src/components/common/BackToTopButton';

function setScrollY(value: number) {
  Object.defineProperty(window, 'scrollY', {
    configurable: true,
    writable: true,
    value,
  });
  fireEvent.scroll(window);
}

describe('BackToTopButton', () => {
  const scrollToMock = vi.fn();

  beforeEach(() => {
    scrollToMock.mockReset();
    vi.stubGlobal('scrollTo', scrollToMock);
    setScrollY(0);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('permanece oculto no topo, aparece após rolar e volta ao topo ao clicar', async () => {
    const user = userEvent.setup();
    render(<BackToTopButton />);

    expect(
      screen.queryByRole('button', { name: 'Voltar ao topo' }),
    ).not.toBeInTheDocument();

    setScrollY(400);
    const button = screen.getByRole('button', { name: 'Voltar ao topo' });
    expect(button).toBeVisible();

    await user.click(button);
    expect(scrollToMock).toHaveBeenCalledWith({
      top: 0,
      behavior: 'smooth',
    });

    setScrollY(0);
    expect(
      screen.queryByRole('button', { name: 'Voltar ao topo' }),
    ).not.toBeInTheDocument();
  });

  it('usa rolagem imediata quando prefers-reduced-motion está ativo', async () => {
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: true }));
    const user = userEvent.setup();
    setScrollY(500);
    render(<BackToTopButton />);

    await user.click(screen.getByRole('button', { name: 'Voltar ao topo' }));
    expect(scrollToMock).toHaveBeenCalledWith({
      top: 0,
      behavior: 'auto',
    });
  });
});
