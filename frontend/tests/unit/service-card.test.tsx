import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import ServiceCard from '../../src/components/dashboard/ServiceCard';
import type { LiveService } from '../../src/components/dashboard/liveTypes';

const service: LiveService = {
  id: 1,
  idExterno: 'api',
  nome: 'API de pagamentos',
  regiaoCodigo: 'br-sudeste',
  localizacao: { pais: 'Brasil', regiao: 'Sudeste', cidade: 'São Paulo' },
  estadoAtual: 'DISPONIVEL',
  latestCollection: {
    iniciadaEm: '2026-11-15T10:00:00Z',
    cpuPercent: 12.5,
    memoryGb: 2,
    diskGb: null,
    networkGb: 0,
    energiaKwh: 0.0123,
    emissaoGCo2e: 1000,
  },
};

describe('ServiceCard', () => {
  it('exibe estado, localização, métricas e conversão de emissões', () => {
    render(<ServiceCard service={service} />);

    expect(screen.getByRole('heading', { name: service.nome })).toBeVisible();
    expect(screen.getByText('Ativo')).toBeVisible();
    expect(screen.getByText('Brasil · Sudeste')).toBeVisible();
    expect(screen.getByText('São Paulo')).toBeVisible();
    expect(screen.getByText('12,5 %')).toBeVisible();
    expect(screen.getByText('2,00 GB')).toBeVisible();
    expect(screen.getByText('12,30 Wh')).toBeVisible();
    expect(screen.getByText('1,00 kgCO₂e')).toBeVisible();
    expect(screen.getByText('—')).toBeVisible();
  });

  it('mostra dados ausentes e permite selecionar pelo botão e pelo cartão', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const semColeta: LiveService = {
      ...service,
      localizacao: null,
      estadoAtual: 'SEM_METRICAS',
      latestCollection: null,
    };
    render(<ServiceCard service={semColeta} onSelect={onSelect} />);

    const button = screen.getByRole('button', { name: semColeta.nome });
    expect(screen.getByText('Sem métricas')).toBeVisible();
    expect(screen.getByText('Cidade não informada')).toBeVisible();
    expect(screen.getAllByText('—')).toHaveLength(6);
    await user.click(button);
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenLastCalledWith(semColeta, button);
    await user.click(screen.getByText('Cidade não informada'));
    expect(onSelect).toHaveBeenCalledTimes(2);
    expect(onSelect).toHaveBeenLastCalledWith(semColeta, button);
  });

  it('usa o impacto do serviço quando a última coleta não possui valores', () => {
    render(
      <ServiceCard
        service={{
          ...service,
          energiaKwh: 0.02,
          emissaoGCo2e: 500,
          latestCollection: null,
        }}
      />,
    );
    expect(screen.getByText('20,00 Wh')).toBeVisible();
    expect(screen.getByText('500,00 gCO₂e')).toBeVisible();
  });

  it('avisa que não há coleta válida quando nunca houve nenhuma', () => {
    render(<ServiceCard service={{ ...service, latestCollection: null }} />);

    expect(screen.getByText('Sem coleta válida')).toBeVisible();
    expect(
      screen.getByText(
        'Nenhuma coleta válida foi registrada para este serviço.',
      ),
    ).toBeVisible();
  });

  it('mostra a data da última coleta válida quando o serviço saiu do ar', () => {
    render(
      <ServiceCard service={{ ...service, estadoAtual: 'INDISPONIVEL' }} />,
    );

    expect(screen.getByText('Sem coleta válida no momento')).toBeVisible();
    const data = screen.getByText(/^15\/11\/2026/);
    expect(data.tagName).toBe('TIME');
    expect(data).toHaveAttribute('datetime', '2026-11-15T10:00:00.000Z');
    expect(data).toHaveTextContent(/07:00$/);
  });

  it('não inventa data quando a coleta anterior não tem uma data válida', () => {
    render(
      <ServiceCard
        service={{
          ...service,
          estadoAtual: 'SEM_METRICAS',
          latestCollection: { ...service.latestCollection!, iniciadaEm: '' },
        }}
      />,
    );

    expect(
      screen.getByText(
        'Valores da última coleta válida; a data não foi informada.',
      ),
    ).toBeVisible();
    expect(document.querySelector('time')).toBeNull();
  });

  it('não mostra aviso para serviço ativo com coleta válida', () => {
    render(<ServiceCard service={service} />);

    expect(screen.queryByText(/Sem coleta válida/)).toBeNull();
  });
});
