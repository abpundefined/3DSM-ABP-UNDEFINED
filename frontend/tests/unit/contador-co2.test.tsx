import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ContadorCo2AoVivo from '../../src/components/common/ContadorCo2AoVivo';

function mockReducedMotion(matches: boolean, isDesktop = true) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: query.includes('prefers-reduced-motion')
        ? matches
        : query.includes('min-width')
          ? isDesktop
          : false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  });
}

describe('ContadorCo2AoVivo', () => {
  afterEach(() => {
    vi.useRealTimers();
    mockReducedMotion(false);
  });

  it('aumenta a cada segundo, anuncia para leitor de tela só a cada 30 s e zera ao clicar em Recomeçar', () => {
    vi.useFakeTimers();
    mockReducedMotion(false);

    render(<ContadorCo2AoVivo taxaGPorSegundo={1} />);

    const status = screen.getByRole('status');
    const texto = () =>
      screen.getByText(/Desde que você chegou/i, { selector: 'p' });
    expect(status).toHaveTextContent('');
    expect(texto()).toHaveTextContent(
      'Desde que você chegou, os serviços emitiram 0,00 g de CO₂e',
    );

    act(() => {
      vi.advanceTimersByTime(3_000);
    });
    expect(texto()).toHaveTextContent(
      'Desde que você chegou, os serviços emitiram 3,00 g de CO₂e',
    );
    // Sem aria-live a cada segundo
    expect(status).toHaveTextContent('');

    act(() => {
      vi.advanceTimersByTime(27_000);
    });
    expect(status).toHaveTextContent(
      'Desde que você chegou, os serviços emitiram 30,00 g de CO₂e',
    );

    fireEvent.click(screen.getByRole('button', { name: 'Recomeçar' }));
    expect(texto()).toHaveTextContent(
      'Desde que você chegou, os serviços emitiram 0,00 g de CO₂e',
    );
  });

  it('com movimento reduzido atualiza a cada 5 s sem animação', () => {
    vi.useFakeTimers();
    mockReducedMotion(true);

    const { container } = render(<ContadorCo2AoVivo taxaGPorSegundo={1} />);
    expect(
      container.querySelector('.contador-co2-pulso--estatico'),
    ).not.toBeNull();

    act(() => {
      vi.advanceTimersByTime(4_000);
    });
    expect(screen.getByText(/Desde que você chegou/i)).toHaveTextContent(
      'Desde que você chegou, os serviços emitiram 0,00 g de CO₂e',
    );

    act(() => {
      vi.advanceTimersByTime(1_000);
    });
    expect(screen.getByText(/Desde que você chegou/i)).toHaveTextContent(
      'Desde que você chegou, os serviços emitiram 5,00 g de CO₂e',
    );
  });
});
