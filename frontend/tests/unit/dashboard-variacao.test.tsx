import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import LiveDashboard from '../../src/components/dashboard/LiveDashboard';
import ComparisonSelectionProvider from '../../src/providers/ComparisonSelectionProvider';
import PeriodProvider from '../../src/providers/PeriodProvider';

describe('Variação no dashboard', () => {
  afterEach(() => vi.unstubAllGlobals());
  it.each([12, -5, null])(
    'mostra a variação de emissão %s',
    async (emissao) => {
      vi.stubGlobal(
        'fetch',
        vi.fn(async (path: string) => {
          if (path === '/api/servicos') return Response.json([]);
          if (path === '/api/configuracao')
            return Response.json({ intervaloColetaSegundos: 60 });
          if (path === '/api/indicadores?periodo=7d')
            return Response.json({
              periodo: {
                inicio: '2026-11-01T00:00:00Z',
                fim: '2026-11-08T00:00:00Z',
              },
              energiaTotalKwh: 2,
              emissaoTotalGCo2e: 80,
              variacaoPercentual: { energiaKwh: 12, emissaoGCo2e: emissao },
              servicos: {
                disponiveis: 0,
                indisponiveis: 0,
                semMetricas: 0,
                removidos: 0,
              },
            });
          throw new Error(`Consulta inesperada: ${path}`);
        }),
      );
      render(
        <MemoryRouter>
          <PeriodProvider>
            <ComparisonSelectionProvider>
              <LiveDashboard periodQuery="?periodo=7d" />
            </ComparisonSelectionProvider>
          </PeriodProvider>
        </MemoryRouter>,
      );
      const texto =
        emissao === null
          ? 'sem base de comparação'
          : emissao > 0
            ? '▲ 12% em relação aos 7 dias anteriores'
            : '▼ 5% em relação aos 7 dias anteriores';
      const cartao = screen
        .getByText('Emissão total de CO₂e')
        .closest<HTMLElement>('.metric-card');
      if (cartao === null) throw new Error('Cartão de emissão não encontrado.');
      expect(await within(cartao).findByText(texto)).toHaveClass(
        `variacao--${emissao === null ? 'sem-base' : emissao > 0 ? 'alerta' : 'melhoria'}`,
      );
    },
  );
});
