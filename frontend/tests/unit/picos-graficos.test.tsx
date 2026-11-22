import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import ListaPicosIncomuns from '../../src/components/common/ListaPicosIncomuns';
import Metodologia from '../../src/pages/Metodologia';
import { detectarPicosIncomuns } from '../../src/utils/picos';

describe('ListaPicosIncomuns e explicação em Como calculamos', () => {
  it('renderiza lista acessível abaixo do gráfico com anotação de horário e limiar', () => {
    const base = Date.parse('2026-11-15T05:00:00.000Z');
    const pontos = [
      10, 10, 11, 10, 9, 10, 11, 10, 10, 11, 10, 10, 500, 10, 11,
    ].map((valor, index) => ({
      inicio: new Date(base + index * 60 * 60 * 1000).toISOString(),
      valor,
    }));

    const resumo = detectarPicosIncomuns(pontos, true);
    render(
      <ListaPicosIncomuns
        picos={resumo.picos}
        limiar={resumo.limiar}
        unidade="Wh"
        rotulo="Energia"
      />,
    );

    const regiao = screen.getByRole('region', {
      name: 'Picos incomuns de energia',
    });
    expect(within(regiao).getByText('1 pico incomum de energia')).toBeVisible();
    expect(within(regiao).getByText('pico incomum às 14h')).toBeVisible();
    expect(within(regiao).getByText('500 Wh')).toBeVisible();
    expect(
      within(regiao).getByRole('list', {
        name: 'Lista de picos incomuns de energia',
      }),
    ).toBeVisible();
  });

  it('documenta o critério de média + 3 desvios-padrão e mínimo de 12 pontos em /metodologia', () => {
    render(
      <MemoryRouter initialEntries={['/metodologia']}>
        <Metodologia />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole('heading', { name: /Detecção de picos incomuns/i }),
    ).toBeVisible();
    expect(screen.getByText(/média \+ 3 × desvio-padrão/i)).toBeVisible();
    expect(screen.getByText(/12 pontos válidos/i)).toBeVisible();
  });
});
