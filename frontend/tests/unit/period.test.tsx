import { fireEvent, render, renderHook, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router';
import { describe, expect, it } from 'vitest';
import PeriodSelector from '../../src/components/common/PeriodSelector';
import usePeriod from '../../src/hooks/usePeriod';
import PeriodProvider from '../../src/providers/PeriodProvider';

function LocationAndPeriod() {
  const { search } = useLocation();
  const { apiQuery } = usePeriod();
  return (
    <>
      <output data-testid="location">{search}</output>
      <output data-testid="api-query">{apiQuery}</output>
    </>
  );
}

function renderSelector(search = '') {
  return render(
    <MemoryRouter initialEntries={[`/${search}`]}>
      <PeriodProvider>
        <PeriodSelector />
        <LocationAndPeriod />
      </PeriodProvider>
    </MemoryRouter>,
  );
}

describe('PeriodSelector e usePeriod', () => {
  it('lê o período da URL e atualiza-o sem perder parâmetros alheios', async () => {
    const user = userEvent.setup();
    renderSelector('?demo=1&periodo=7d');

    expect(screen.getByLabelText('Período')).toHaveValue('7d');
    expect(screen.getByTestId('api-query')).toHaveTextContent('?periodo=7d');
    await user.selectOptions(screen.getByLabelText('Período'), '30d');
    expect(screen.getByTestId('location')).toHaveTextContent(
      '?demo=1&periodo=30d',
    );
    expect(screen.getByTestId('api-query')).toHaveTextContent('?periodo=30d');
  });

  it('valida o intervalo personalizado antes de atualizar a URL', async () => {
    const user = userEvent.setup();
    renderSelector('?demo=1');

    await user.selectOptions(screen.getByLabelText('Período'), 'personalizado');
    fireEvent.change(screen.getByLabelText('Início'), {
      target: { value: '2026-11-15' },
    });
    fireEvent.change(screen.getByLabelText('Fim'), {
      target: { value: '2026-11-10' },
    });
    await user.click(screen.getByRole('button', { name: 'Aplicar' }));

    expect(screen.getByRole('alert')).toHaveTextContent(
      'A data de fim precisa ser igual ou posterior',
    );
    expect(screen.getByTestId('location')).toHaveTextContent('?demo=1');

    fireEvent.change(screen.getByLabelText('Fim'), {
      target: { value: '2026-11-16' },
    });
    await user.click(screen.getByRole('button', { name: 'Aplicar' }));

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent(
      '?demo=1&inicio=2026-11-15&fim=2026-11-16',
    );
    expect(screen.getByTestId('api-query')).toHaveTextContent(
      'inicio=2026-11-15T00%3A00%3A00.000-03%3A00',
    );
  });

  it('retorna ao período padrão quando a URL é inválida', () => {
    renderSelector('?periodo=invalido');
    expect(screen.getByLabelText('Período')).toHaveValue('24h');
    expect(screen.getByTestId('api-query')).toBeEmptyDOMElement();
  });

  it('restaura datas personalizadas da URL', () => {
    renderSelector('?inicio=2026-11-01&fim=2026-11-10');
    expect(screen.getByLabelText('Período')).toHaveValue('personalizado');
    expect(screen.getByLabelText('Início')).toHaveValue('2026-11-01');
    expect(screen.getByLabelText('Fim')).toHaveValue('2026-11-10');
  });

  it('rejeita uso fora do provider', () => {
    expect(() => renderHook(() => usePeriod())).toThrow(
      'usePeriod deve ser usado dentro de PeriodProvider.',
    );
  });
});
