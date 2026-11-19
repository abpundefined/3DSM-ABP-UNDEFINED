import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Relatorio from '../../src/pages/Relatorio';
import PeriodProvider from '../../src/providers/PeriodProvider';
import { buscarDadosRelatorio } from '../../src/services/relatorio';
import type { DadosRelatorio } from '../../src/types/relatorio';

vi.mock('../../src/services/relatorio', () => ({
  buscarDadosRelatorio: vi.fn(),
}));

vi.mock('recharts', async (importOriginal) => ({
  ...(await importOriginal<typeof import('recharts')>()),
  ResponsiveContainer: ({ children }: { children?: ReactNode }) => (
    <div data-testid="recharts-mock">{children}</div>
  ),
}));

const dadosCompletos: DadosRelatorio = {
  indicadores: {
    periodo: {
      inicio: '2026-11-12T03:00:00.000Z',
      fim: '2026-11-19T03:00:00.000Z',
    },
    energiaTotalKwh: 12.4,
    emissaoTotalGCo2e: 4884,
    coletasCalculadas: 120,
    servicos: {
      monitorados: 6,
      disponiveis: 5,
      indisponiveis: 1,
      semMetricas: 0,
      desconhecidos: 0,
      removidos: 0,
    },
    geradoEm: '2026-11-19T14:00:00.000Z',
    versaoCalculo: '1.0.0',
  },
  serie: {
    periodo: {
      inicio: '2026-11-12T03:00:00.000Z',
      fim: '2026-11-19T03:00:00.000Z',
    },
    granularidade: 'dia',
    granularidadeHoraria: false,
    escalaEnergia: { unidade: 'kWh', fator: 1 },
    escalaEmissao: { unidade: 'kgCO₂e', fator: 0.001 },
    possuiDados: true,
    pontos: [
      {
        inicio: '2026-11-12T03:00:00.000Z',
        energiaKwh: 5.2,
        emissaoGCo2e: 2100,
        energia: 5.2,
        emissao: 2.1,
      },
      {
        inicio: '2026-11-13T03:00:00.000Z',
        energiaKwh: 7.2,
        emissaoGCo2e: 2784,
        energia: 7.2,
        emissao: 2.784,
      },
    ],
  },
  topEmissores: [
    {
      posicao: 1,
      servicoId: 5,
      nome: 'Video Processor',
      energiaKwh: 6.1,
      emissaoGCo2e: 2500,
      coletasValidas: 40,
      selo: 'E',
    },
    {
      posicao: 2,
      servicoId: 4,
      nome: 'Search API',
      energiaKwh: 3.4,
      emissaoGCo2e: 1300,
      coletasValidas: 40,
      selo: 'C',
    },
  ],
  oportunidades: [
    {
      servicoId: 5,
      servicoNome: 'Video Processor',
      tipo: 'MIGRAR_REGIAO',
      explicacao: 'Redução estimada ao migrar para ca-central.',
      economiaGCo2e: 1200,
      economiaPercentual: 48,
    },
  ],
};

const buscarDadosRelatorioMock = vi.mocked(buscarDadosRelatorio);

function renderRelatorio(url = '/relatorio?periodo=7d') {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <PeriodProvider>
        <Relatorio />
      </PeriodProvider>
    </MemoryRouter>,
  );
}

describe('Relatorio', () => {
  beforeEach(() => {
    buscarDadosRelatorioMock.mockReset();
  });

  it('exibe carregamento enquanto os dados são buscados', () => {
    buscarDadosRelatorioMock.mockImplementation(() => new Promise(() => {}));
    renderRelatorio();

    expect(
      screen.getByRole('heading', { level: 1, name: 'Relatório do período' }),
    ).toBeVisible();
    expect(
      screen.getByRole('heading', { name: 'Gerando o relatório' }),
    ).toBeVisible();
  });

  it('renderiza período, totais com equivalências, tendência, top 5 com selos, oportunidades, metodologia e rodapé', async () => {
    buscarDadosRelatorioMock.mockResolvedValue(dadosCompletos);
    renderRelatorio();

    const totais = await screen.findByRole('region', {
      name: 'Resumo do período',
    });
    expect(totais).toHaveTextContent('12,40 kWh');
    expect(totais).toHaveTextContent('4,88 kgCO₂e');
    expect(totais).toHaveTextContent('km rodados de carro');
    expect(totais).toHaveTextContent('cargas de celular');

    expect(
      screen.getByRole('region', { name: 'Tendência no período' }),
    ).toBeVisible();

    const tabela = within(
      screen.getByRole('table', {
        name: 'Os 5 serviços que mais emitiram no período',
      }),
    );
    expect(tabela.getByText('Video Processor')).toBeVisible();
    expect(tabela.getByText('E')).toBeVisible();
    expect(tabela.getByText('Search API')).toBeVisible();
    expect(tabela.getByText('C')).toBeVisible();

    const secaoOportunidades = screen.getByRole('region', {
      name: 'Oportunidades de redução',
    });
    expect(secaoOportunidades).toHaveTextContent('Video Processor');
    expect(secaoOportunidades).toHaveTextContent('1,20 kgCO₂e');
    expect(secaoOportunidades).toHaveTextContent('estimada');

    const metodologia = screen.getByRole('region', {
      name: 'Nota de metodologia',
    });
    expect(metodologia).toHaveTextContent('estimativas operacionais');
    expect(
      within(metodologia).getByRole('link', { name: /Como calculamos/i }),
    ).toHaveAttribute('href', '/metodologia');

    const rodape = screen.getByLabelText('Metadados do relatório');
    expect(rodape).toHaveTextContent('19/11/2026, 11:00');
    expect(rodape).toHaveTextContent('Versão do cálculo: 1.0.0');
  });

  it('aciona window.print ao clicar em Imprimir / salvar PDF', async () => {
    const user = userEvent.setup();
    const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {});
    buscarDadosRelatorioMock.mockResolvedValue(dadosCompletos);
    renderRelatorio();

    const botao = await screen.findByRole('button', {
      name: /Imprimir \/ salvar PDF/i,
    });
    await user.click(botao);

    expect(printSpy).toHaveBeenCalledTimes(1);
  });

  it('mantém o relatório funcional quando oportunidades ainda não estão disponíveis no servidor', async () => {
    buscarDadosRelatorioMock.mockResolvedValue({
      ...dadosCompletos,
      oportunidades: null,
    });
    renderRelatorio();

    const secaoOportunidades = await screen.findByRole('region', {
      name: 'Oportunidades de redução',
    });
    expect(secaoOportunidades).toHaveTextContent(/indisponível/i);
  });

  it('permite tentar novamente em caso de falha na consulta', async () => {
    const user = userEvent.setup();
    buscarDadosRelatorioMock
      .mockRejectedValueOnce(new Error('Falha ao consultar relatório'))
      .mockResolvedValueOnce(dadosCompletos);
    renderRelatorio();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Falha ao consultar relatório',
    );
    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }));

    expect(
      await screen.findByRole('region', { name: 'Resumo do período' }),
    ).toBeVisible();
    expect(buscarDadosRelatorioMock).toHaveBeenCalledTimes(2);
  });

  it('renderiza dados ilustrativos no modo demonstração sem consultar a API', () => {
    renderRelatorio('/relatorio?demo=1');

    expect(document.title).toBe(
      'Relatório do período · demonstração | GreenER',
    );
    expect(
      screen.getByRole('region', { name: 'Resumo do período' }),
    ).toBeVisible();
    expect(buscarDadosRelatorioMock).not.toHaveBeenCalled();
  });
});
