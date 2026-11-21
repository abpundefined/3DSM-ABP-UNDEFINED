import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import AnelCpu from '../../src/components/dashboard/AnelCpu';
import ServiceCard from '../../src/components/dashboard/ServiceCard';
import type { LiveService } from '../../src/components/dashboard/liveTypes';

const servicoBase: LiveService = {
  id: 1,
  idExterno: 'api',
  nome: 'API de pagamentos',
  regiaoCodigo: 'br-sudeste',
  selo: 'A',
  localizacao: { pais: 'Brasil', regiao: 'Sudeste', cidade: 'São Paulo' },
  estadoAtual: 'DISPONIVEL',
  latestCollection: {
    iniciadaEm: '2026-11-15T10:00:00Z',
    cpuPercent: 64.5,
    memoryGb: 2,
    diskGb: 10,
    networkGb: 1,
    energiaKwh: 0.0123,
    emissaoGCo2e: 10,
  },
};

describe('AnelCpu', () => {
  it('renderiza role="meter" com atributos ARIA e número central', () => {
    render(<AnelCpu cpuPercent={64.5} />);

    const meter = screen.getByRole('meter', { name: 'Uso de CPU' });
    expect(meter).toHaveAttribute('aria-valuemin', '0');
    expect(meter).toHaveAttribute('aria-valuemax', '100');
    expect(meter).toHaveAttribute('aria-valuenow', '64.5');
    expect(meter).toHaveAttribute('aria-valuetext', '64,5 % (moderado)');
    expect(screen.getByText('64,5 %')).toBeVisible();
    expect(screen.getByText('Moderado')).toBeVisible();
  });

  it('mostra rótulo textual Alto acima de 80% e Sem dados quando ausente', () => {
    const { rerender } = render(<AnelCpu cpuPercent={91.2} />);

    expect(screen.getByRole('meter', { name: 'Uso de CPU' })).toHaveAttribute(
      'aria-valuenow',
      '91.2',
    );
    expect(screen.getByText('91,2 %')).toBeVisible();
    expect(screen.getByText('Alto')).toBeVisible();

    rerender(<AnelCpu cpuPercent={null} />);
    const meterSemDados = screen.getByRole('meter', { name: 'Uso de CPU' });
    expect(meterSemDados).toHaveAttribute('aria-valuenow', '0');
    expect(meterSemDados).toHaveAttribute(
      'aria-valuetext',
      'Sem dados de uso de CPU',
    );
    expect(screen.getByText('—')).toBeVisible();
    expect(screen.getByText('Sem dados')).toBeVisible();
  });

  it('integra o anel de CPU no ServiceCard', () => {
    render(<ServiceCard service={servicoBase} />);

    const meter = screen.getByRole('meter', { name: 'Uso de CPU' });
    expect(meter).toHaveAttribute('aria-valuenow', '64.5');
    expect(meter).toHaveTextContent('64,5 %');
    expect(meter).toHaveTextContent('Moderado');
  });
});
