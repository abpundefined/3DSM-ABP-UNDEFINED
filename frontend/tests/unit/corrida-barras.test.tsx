import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import CorridaDeBarras from '../../src/components/ranking/CorridaDeBarras';

function mockReducedMotion(matches: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: query.includes('prefers-reduced-motion') ? matches : false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  });
}

describe('CorridaDeBarras', () => {
  afterEach(() => {
    vi.useRealTimers();
    mockReducedMotion(false);
  });

  it('reproduz automaticamente sem movimento reduzido, pausa e permite navegar pelo controle deslizante', () => {
    vi.useFakeTimers();
    mockReducedMotion(false);

    render(
      <MemoryRouter>
        <CorridaDeBarras isDemo apiQuery="" linkSearch="?demo=1" />
      </MemoryRouter>,
    );

    const slider = screen.getByRole('slider', { name: 'Quadro da evolução' });
    expect(slider).toHaveValue('0');
    expect(screen.getByRole('button', { name: 'Pausar' })).toBeVisible();

    act(() => {
      vi.advanceTimersByTime(650);
    });
    expect(slider).toHaveValue('1');

    fireEvent.click(screen.getByRole('button', { name: 'Pausar' }));
    expect(screen.getByRole('button', { name: 'Reproduzir' })).toBeVisible();

    act(() => {
      vi.advanceTimersByTime(2_000);
    });
    expect(slider).toHaveValue('1');

    fireEvent.change(slider, { target: { value: '10' } });
    expect(slider).toHaveValue('10');
  });

  it('com prefers-reduced-motion não reproduz automaticamente, mas mantém o controle deslizante funcional', () => {
    vi.useFakeTimers();
    mockReducedMotion(true);

    render(
      <MemoryRouter>
        <CorridaDeBarras isDemo apiQuery="" linkSearch="?demo=1" />
      </MemoryRouter>,
    );

    const slider = screen.getByRole('slider', { name: 'Quadro da evolução' });
    expect(screen.getByRole('button', { name: 'Reproduzir' })).toBeVisible();

    act(() => {
      vi.advanceTimersByTime(3_000);
    });
    expect(slider).toHaveValue('0');

    fireEvent.change(slider, { target: { value: '5' } });
    expect(slider).toHaveValue('5');
  });
});
