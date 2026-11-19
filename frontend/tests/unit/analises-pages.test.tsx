import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Comparacao from '../../src/pages/Comparacao';
import Ranking from '../../src/pages/Ranking';
import ComparisonSelectionProvider from '../../src/providers/ComparisonSelectionProvider';
import PeriodProvider from '../../src/providers/PeriodProvider';
import { buscarMapa } from '../../src/services/mapa';
import { buscarRanking } from '../../src/services/ranking';
import { mapaDemo } from '../../src/mocks/mapa';
import type { RespostaRanking } from '../../src/types/ranking';

vi.mock('../../src/services/mapa', () => ({ buscarMapa: vi.fn() }));
vi.mock('../../src/services/ranking', () => ({ buscarRanking: vi.fn() }));

vi.mock('../../src/hooks/useComparisonData', () => ({
  default: () => ({
    servicesState: { status: 'pronto', dados: [] },
    comparisonState: { status: 'ocioso' },
    retryServices: vi.fn(),
    retryComparison: vi.fn(),
  }),
}));

vi.mock('../../src/hooks/usePrefersReducedMotion', () => ({
  default: () => true,
}));

vi.mock('recharts', async (importOriginal) => ({
  ...(await importOriginal<typeof import('recharts')>()),
  ResponsiveContainer: () => null,
}));

const resposta: RespostaRanking = {
  periodo: {
    inicio: '2026-11-10T00:00:00Z',
    fim: '2026-11-17T00:00:00Z',
  },
  metrica: 'energia',
  itens: [
    {
      posicao: 1,
      servicoId: 1,
      nome: 'API de pagamentos',
      energiaKwh: 2,
      emissaoGCo2e: 500,
      coletasValidas: 4,
    },
  ],
  semDados: [{ servicoId: 2, nome: 'Worker sem coleta' }],
};

const buscarRankingMock = vi.mocked(buscarRanking);
const buscarMapaMock = vi.mocked(buscarMapa);

function ConsultaAtual() {
  const { search } = useLocation();
  return <output aria-label="Consulta atual">{search}</output>;
}

function renderRanking(url = '/ranking') {
  render(
    <MemoryRouter initialEntries={[url]}>
      <PeriodProvider>
        <ComparisonSelectionProvider>
          <Ranking />
          <ConsultaAtual />
        </ComparisonSelectionProvider>
      </PeriodProvider>
    </MemoryRouter>,
  );
}

function renderComparacao(url = '/comparar') {
  render(
    <MemoryRouter initialEntries={[url]}>
      <PeriodProvider>
        <ComparisonSelectionProvider>
          <Comparacao />
          <ConsultaAtual />
        </ComparisonSelectionProvider>
      </PeriodProvider>
    </MemoryRouter>,
  );
}

describe('Ranking', () => {
  beforeEach(() => {
    buscarRankingMock.mockReset();
    buscarMapaMock.mockReset().mockResolvedValue(mapaDemo);
  });

  it('mostra o carregamento enquanto a consulta não responde', () => {
    buscarRankingMock.mockImplementation(() => new Promise(() => {}));
    renderRanking();

    expect(screen.getByRole('heading', { name: 'Ranking' })).toBeVisible();
    expect(
      screen.getByRole('heading', { name: 'Carregando o ranking' }),
    ).toBeVisible();
    expect(
      screen.queryByRole('region', { name: 'Tabela do ranking' }),
    ).not.toBeInTheDocument();
  });

  it('mostra as métricas na tabela e separa os serviços sem dados', async () => {
    buscarRankingMock.mockResolvedValue(resposta);
    renderRanking('/ranking?periodo=7d');

    const tabela = within(
      await screen.findByRole('region', { name: 'Tabela do ranking' }),
    );
    const servico = tabela.getByRole('link', { name: 'API de pagamentos' });
    expect(servico).toHaveAttribute('href', '/servicos/1?periodo=7d');
    expect(tabela.getByRole('cell', { name: '2,00 kWh' })).toBeVisible();
    expect(tabela.getByRole('cell', { name: '500,00 gCO₂e' })).toBeVisible();
    expect(tabela.queryByText('Worker sem coleta')).not.toBeInTheDocument();
    const semDados = screen.getByRole('region', {
      name: 'Sem dados no período (1)',
    });
    expect(within(semDados).getByText('Worker sem coleta')).toBeVisible();
  });

  it.each([
    [[], 'Nenhum serviço monitorado'],
    [resposta.semDados, 'Nenhuma coleta no período'],
  ] as const)('mostra o estado vazio: %s (%s)', async (semDados, titulo) => {
    buscarRankingMock.mockResolvedValue({
      ...resposta,
      itens: [],
      semDados: [...semDados],
    });
    renderRanking();

    expect(await screen.findByRole('heading', { name: titulo })).toBeVisible();
    expect(
      screen.queryByRole('region', { name: 'Tabela do ranking' }),
    ).not.toBeInTheDocument();
  });

  it('mostra o erro e carrega o ranking ao tentar novamente', async () => {
    const user = userEvent.setup();
    buscarRankingMock
      .mockRejectedValueOnce(new Error('Falha simulada'))
      .mockResolvedValueOnce(resposta);
    renderRanking();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Falha simulada',
    );
    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }));

    expect(
      await screen.findByRole('region', { name: 'Tabela do ranking' }),
    ).toBeVisible();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(buscarRankingMock).toHaveBeenCalledTimes(2);
  });

  it('atualiza a URL e consulta a API ao trocar para emissão', async () => {
    const user = userEvent.setup();
    buscarRankingMock
      .mockResolvedValueOnce(resposta)
      .mockImplementationOnce(() => new Promise(() => {}));
    renderRanking('/ranking?periodo=7d');
    await screen.findByRole('region', { name: 'Tabela do ranking' });

    const botao = screen.getByRole('button', { name: /^Emissão/ });
    await user.click(botao);

    expect(botao).toHaveAttribute('aria-pressed', 'true');
    const url = new URLSearchParams(
      screen.getByLabelText('Consulta atual').textContent ?? '',
    );
    expect(url.get('metrica')).toBe('emissao');
    expect(url.get('periodo')).toBe('7d');
    await waitFor(() => expect(buscarRankingMock).toHaveBeenCalledTimes(2));
    const [consulta] = buscarRankingMock.mock.calls[1];
    const params = new URLSearchParams(consulta);
    expect(params.get('metrica')).toBe('emissao');
    expect(params.get('periodo')).toBe('7d');
    expect(screen.getByText('Atualizando o ranking...')).toBeVisible();
    expect(
      screen.getByRole('region', { name: 'Tabela do ranking' }),
    ).toBeVisible();
  });

  it('renderiza a demonstração sem consultar a API', () => {
    renderRanking('/ranking?demo=1');

    expect(
      within(
        screen.getByRole('region', { name: 'Tabela do ranking' }),
      ).getByRole('table'),
    ).toBeVisible();
    expect(document.title).toBe('Ranking · demonstração | GreenER');
    expect(buscarRankingMock).not.toHaveBeenCalled();
  });
});

describe('Comparação', () => {
  it('mostra o estado vazio quando não há serviços disponíveis', () => {
    renderComparacao();
    expect(
      screen.getByRole('heading', { name: 'Comparar serviços' }),
    ).toBeVisible();
    expect(
      screen.getByRole('heading', { name: 'Nenhum serviço disponível' }),
    ).toBeVisible();
    expect(
      screen.getByRole('heading', { name: 'Selecione ao menos dois serviços' }),
    ).toBeVisible();
    expect(document.title).toBe('Comparar serviços | GreenER');
  });
});
