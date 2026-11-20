import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import ComposicaoEnergia from '../../src/components/common/ComposicaoEnergia';

describe('ComposicaoEnergia', () => {
  it('exibe rosca com total no centro, frase resumo, legenda e tabela com W e %', () => {
    render(
      <MemoryRouter>
        <ComposicaoEnergia
          componentes={{
            cpuW: 0.78,
            memoriaW: 0.12,
            discoW: 0.06,
            redeW: 0.04,
            totalW: 1,
          }}
        />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole('heading', { name: 'Composição da energia' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText('CPU responde por 78% do consumo.'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('img', {
        name: /Composição da potência total de 1,00 W/,
      }),
    ).toBeInTheDocument();

    const tabela = screen.getByRole('table');
    expect(
      within(tabela).getByRole('row', { name: /CPU\s+0,78 W\s+78,0%/ }),
    ).toBeInTheDocument();
    expect(
      within(tabela).getByRole('row', { name: /Memória\s+0,12 W\s+12,0%/ }),
    ).toBeInTheDocument();
    expect(
      within(tabela).getByRole('row', { name: /Disco\s+0,06 W\s+6,0%/ }),
    ).toBeInTheDocument();
    expect(
      within(tabela).getByRole('row', { name: /Rede\s+0,04 W\s+4,0%/ }),
    ).toBeInTheDocument();
    expect(
      within(tabela).getByRole('row', { name: /Total\s+1,00 W\s+100,0%/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Como calculamos?' }),
    ).toHaveAttribute('href', '/metodologia');
  });

  it('exibe estado vazio quando não há dados de composição', () => {
    render(
      <MemoryRouter>
        <ComposicaoEnergia componentes={null} />
      </MemoryRouter>,
    );

    expect(
      screen.getByText(
        /Sem medições suficientes para estimar a composição por componente/,
      ),
    ).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });
});
