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

  it('agrupa o ranking por região e país mantendo o grupo na URL e somando totais', async () => {
    const user = userEvent.setup();
    renderRanking('/ranking?demo=1');

    const grupoControles = screen.getByRole('group', {
      name: 'Agrupar o ranking por',
    });
    const abaServico = within(grupoControles).getByRole('button', {
      name: 'Serviço',
    });
    const abaRegiao = within(grupoControles).getByRole('button', {
      name: 'Região',
    });
    const abaPais = within(grupoControles).getByRole('button', {
      name: 'País',
    });

    expect(abaServico).toHaveAttribute('aria-pressed', 'true');

    await user.click(abaRegiao);
    expect(abaRegiao).toHaveAttribute('aria-pressed', 'true');
    expect(
      new URLSearchParams(
        screen.getByLabelText('Consulta atual').textContent ?? '',
      ).get('grupo'),
    ).toBe('regiao');

    const tabela = within(
      screen.getByRole('region', { name: 'Tabela do ranking' }),
    );
    expect(tabela.getByRole('columnheader', { name: 'Região' })).toBeVisible();
    expect(
      tabela.getByRole('columnheader', { name: 'Serviços' }),
    ).toBeVisible();
    expect(
      tabela.getByRole('rowheader', { name: 'Estados Unidos · Ashburn' }),
    ).toBeVisible();
    expect(
      tabela.getByRole('rowheader', { name: 'Brasil · São Paulo' }),
    ).toBeVisible();

    await user.click(abaPais);
    expect(abaPais).toHaveAttribute('aria-pressed', 'true');
    expect(
      new URLSearchParams(
        screen.getByLabelText('Consulta atual').textContent ?? '',
      ).get('grupo'),
    ).toBe('pais');
    expect(tabela.getByRole('columnheader', { name: 'País' })).toBeVisible();
    expect(
      tabela.getByRole('rowheader', { name: 'Estados Unidos' }),
    ).toBeVisible();
    expect(tabela.getByRole('rowheader', { name: 'Brasil' })).toBeVisible();
  });

  it('mostra variações globais e ordena todas as colunas da tabela por serviço', async () => {
    const user = userEvent.setup();
    buscarRankingMock.mockResolvedValue(
      Object.assign({}, resposta, {
        variacaoPercentual: { energiaKwh: 12, emissaoGCo2e: -5 },
        variacaoPorServico: [
          {
            servicoId: 1,
            nome: 'Alpha',
            emissaoAtualGCo2e: 80,
            emissaoAnteriorGCo2e: 100,
            diferencaGCo2e: -20,
            variacaoPercentual: -20,
          },
          {
            servicoId: 2,
            nome: 'Beta',
            emissaoAtualGCo2e: 120,
            emissaoAnteriorGCo2e: 50,
            diferencaGCo2e: 70,
            variacaoPercentual: 140,
          },
          {
            servicoId: 3,
            nome: 'Novo',
            emissaoAtualGCo2e: 10,
            emissaoAnteriorGCo2e: null,
            diferencaGCo2e: null,
            variacaoPercentual: null,
          },
        ],
      }),
    );
    renderRanking('/ranking?periodo=7d');

    const tabela = within(
      await screen.findByRole('table', { name: 'Variação por serviço' }),
    );
    expect(
      screen.getByText('▲ 12% em relação aos 7 dias anteriores'),
    ).toBeVisible();
    expect(
      screen.getByText('▼ 5% em relação aos 7 dias anteriores'),
    ).toBeVisible();
    expect(tabela.getByText('sem base de comparação')).toBeVisible();
    expect(tabela.getAllByRole('row')).toHaveLength(4);
    for (const [coluna, primeiro] of [
      ['Serviço', 'Alpha'],
      ['Emissão atual', 'Novo'],
      ['Emissão anterior', 'Beta'],
      ['Diferença', 'Alpha'],
      ['Variação (%)', 'Alpha'],
    ]) {
      await user.click(tabela.getByRole('button', { name: coluna }));
      expect(tabela.getAllByRole('row')[1]).toHaveTextContent(primeiro);
      expect(
        tabela.getByRole('columnheader', {
          name: new RegExp(coluna.replace(/[()%]/g, '\\$&')),
        }),
      ).toHaveAttribute('aria-sort', 'ascending');
    }
    await user.click(tabela.getByRole('button', { name: 'Variação (%)' }));
    expect(tabela.getAllByRole('row')[1]).toHaveTextContent('Beta');
  });

  it('preserva emissão ausente na tabela sem mostrar uma redução falsa', async () => {
    buscarRankingMock.mockResolvedValue(
      Object.assign({}, resposta, {
        variacaoPorServico: [
          {
            servicoId: 1,
            nome: 'Emissão ausente',
            emissaoAtualGCo2e: null,
            emissaoAnteriorGCo2e: 100,
            diferencaGCo2e: null,
            variacaoPercentual: null,
          },
        ],
      }),
    );
    renderRanking();
    const tabela = within(
      await screen.findByRole('table', { name: 'Variação por serviço' }),
    );
    expect(tabela.getAllByRole('cell', { name: '—' })).toHaveLength(2);
    expect(tabela.getByText('sem dados no período atual')).toBeVisible();
    expect(tabela.queryByText(/100%/)).not.toBeInTheDocument();
    await userEvent
      .setup()
      .click(tabela.getByRole('button', { name: 'Emissão atual' }));
    expect(tabela.getByRole('link', { name: 'Emissão ausente' })).toBeVisible();
  });

  it('mantém a tabela com serviços que só tiveram dados na janela anterior', async () => {
    buscarRankingMock.mockResolvedValue(
      Object.assign({}, resposta, {
        itens: [],
        variacaoPercentual: { energiaKwh: null, emissaoGCo2e: null },
        variacaoPorServico: [
          {
            servicoId: 2,
            nome: 'Worker antigo',
            emissaoAtualGCo2e: null,
            emissaoAnteriorGCo2e: 50,
            diferencaGCo2e: null,
            variacaoPercentual: null,
          },
        ],
      }),
    );
    renderRanking();
    const tabela = within(
      await screen.findByRole('table', { name: 'Variação por serviço' }),
    );
    expect(tabela.getByText('Worker antigo')).toBeVisible();
    expect(tabela.getByText('sem dados no período atual')).toBeVisible();
    expect(tabela.queryByText(/100%/)).not.toBeInTheDocument();
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
