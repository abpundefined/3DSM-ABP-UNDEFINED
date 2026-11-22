import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PeriodProvider from '../../src/providers/PeriodProvider';
import ServicoDetalhe from '../../src/pages/ServicoDetalhe';
import {
  fetchServiceDetail,
  type ServiceDetailData,
} from '../../src/services/serviceDetail';
import { exportDataToCsv } from '../../src/utils/csv-export.utils';

vi.mock('../../src/services/serviceDetail', () => ({
  fetchServiceDetail: vi.fn(),
}));
vi.mock('../../src/utils/csv-export.utils', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../../src/utils/csv-export.utils')>();
  return {
    ...actual,
    exportDataToCsv: vi.fn(),
  };
});
vi.mock('../../src/components/servico/ServiceHistoryChart', () => ({
  default: () => null,
}));
vi.mock('../../src/components/servico/LinhaDoTempoEstado', () => ({
  default: () => null,
}));
vi.mock('../../src/components/common/ComposicaoEnergia', () => ({
  default: () => null,
}));
vi.mock('../../src/components/servico/SimuladorRegiao', () => ({
  default: () => null,
}));
vi.mock('../../src/components/horarios/MelhorHorarioDoServico', () => ({
  default: () => null,
}));

const fetchServiceDetailMock = vi.mocked(fetchServiceDetail);
const exportDataToCsvMock = vi.mocked(exportDataToCsv);

const history: ServiceDetailData['history'] = [
  {
    inicio: '2026-11-10T03:00:00.000Z',
    energiaKwh: 1.25,
    emissaoGCo2e: 125,
    selo: 'A',
  },
  {
    inicio: '2026-11-17T02:59:59.999Z',
    energiaKwh: 0.75,
    emissaoGCo2e: 75,
    selo: 'A',
  },
];

const serviceDetail: ServiceDetailData = {
  service: {
    id: 4,
    idExterno: 'search-api',
    nome: 'Search API',
    regiaoCodigo: 'us-east',
    localizacao: null,
    estadoAtual: 'DISPONIVEL',
    selo: 'A',
  },
  latestCollection: null,
  history,
};

function renderServiceDetail(
  url = '/servicos/4?inicio=2026-11-10&fim=2026-11-17',
) {
  render(
    <MemoryRouter initialEntries={[url]}>
      <PeriodProvider>
        <Routes>
          <Route path="/servicos/:id" element={<ServicoDetalhe />} />
        </Routes>
      </PeriodProvider>
    </MemoryRouter>,
  );
}

describe('ServicoDetalhe CSV export', () => {
  beforeEach(() => {
    fetchServiceDetailMock.mockReset();
    exportDataToCsvMock.mockReset();
  });

  it('desabilita a exportação enquanto o serviço carrega', () => {
    fetchServiceDetailMock.mockImplementation(() => new Promise(() => {}));
    renderServiceDetail();

    expect(screen.getByRole('button', { name: 'Exportar CSV' })).toBeDisabled();
    expect(
      screen.getByRole('heading', { name: 'Carregando o serviço' }),
    ).toBeVisible();
  });

  it('desabilita a exportação durante a atualização do período', async () => {
    const user = userEvent.setup();
    fetchServiceDetailMock
      .mockResolvedValueOnce(serviceDetail)
      .mockImplementationOnce(() => new Promise(() => {}));
    renderServiceDetail();

    await screen.findByRole('heading', {
      name: 'Histórico de energia e emissões',
    });
    await user.selectOptions(screen.getByLabelText('Período'), '7d');

    expect(screen.getByRole('button', { name: 'Exportar CSV' })).toBeDisabled();
    expect(
      await screen.findByRole('heading', { name: 'Carregando o serviço' }),
    ).toBeVisible();
  });

  it('mantém a exportação desabilitada quando o histórico está vazio', async () => {
    fetchServiceDetailMock.mockResolvedValue({
      ...serviceDetail,
      history: [],
    });
    renderServiceDetail();

    expect(await screen.findByText('Nenhum dado no período')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Exportar CSV' })).toBeDisabled();
  });

  it('exporta o histórico exibido com o período personalizado', async () => {
    const user = userEvent.setup();
    fetchServiceDetailMock.mockResolvedValue(serviceDetail);
    renderServiceDetail();

    await user.click(
      await screen.findByRole('button', { name: 'Exportar CSV' }),
    );

    expect(exportDataToCsvMock).toHaveBeenCalledWith(
      [
        {
          inicio: '2026-11-10T03:00:00.000Z',
          energiaKwh: 1.25,
          emissaoGCo2e: 125,
        },
        {
          inicio: '2026-11-17T02:59:59.999Z',
          energiaKwh: 0.75,
          emissaoGCo2e: 75,
        },
      ],
      'greener-detalhe',
      '2026-11-10',
      '2026-11-17',
    );
  });

  it('usa as datas locais do histórico para períodos predefinidos', async () => {
    const user = userEvent.setup();
    fetchServiceDetailMock.mockResolvedValue(serviceDetail);
    renderServiceDetail('/servicos/4?periodo=7d');

    await user.click(
      await screen.findByRole('button', { name: 'Exportar CSV' }),
    );

    expect(exportDataToCsvMock).toHaveBeenCalledWith(
      history.map(({ inicio, energiaKwh, emissaoGCo2e }) => ({
        inicio,
        energiaKwh,
        emissaoGCo2e,
      })),
      'greener-detalhe',
      '2026-11-10',
      '2026-11-16',
    );
  });
});
