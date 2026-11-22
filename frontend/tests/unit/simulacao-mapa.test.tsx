import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import SimulacaoMapaPainel from '../../src/components/mapa/SimulacaoMapaPainel';
import { mapaDemo } from '../../src/mocks/mapa';
import {
  extrairRegioesAlvoMapa,
  simularMudancaRegiaoNoMapa,
  type SimulacaoRegiaoMapa,
} from '../../src/utils/simulacaoMapa';

function PainelComEstado({ onFechar = vi.fn() }: { onFechar?: () => void }) {
  const regioesAlvo = extrairRegioesAlvoMapa(
    mapaDemo.servicos,
    mapaDemo.semCoordenadas,
  );
  const [simulacoes, setSimulacoes] = useState<
    Map<number, SimulacaoRegiaoMapa>
  >(() => new Map());
  const [ultimoId, setUltimoId] = useState<number | null>(null);

  return (
    <SimulacaoMapaPainel
      servicos={mapaDemo.servicos}
      regioesAlvo={regioesAlvo}
      simulacoes={simulacoes}
      ultimoServicoSimuladoId={ultimoId}
      onSimular={(servicoId, codigoDestino) => {
        const servico = mapaDemo.servicos.find(
          (item) => item.servicoId === servicoId,
        );
        const destino = regioesAlvo.find(
          (item) => item.codigo === codigoDestino,
        );
        if (!servico || !destino) {
          return;
        }
        setSimulacoes((atuais) => {
          const proximo = new Map(atuais);
          if (destino.codigo === servico.regiaoCodigo) {
            proximo.delete(servicoId);
          } else {
            proximo.set(
              servicoId,
              simularMudancaRegiaoNoMapa(servico, destino),
            );
          }
          return proximo;
        });
        setUltimoId(servicoId);
      }}
      onDesfazer={(servicoId) =>
        setSimulacoes((atuais) => {
          const proximo = new Map(atuais);
          proximo.delete(servicoId);
          return proximo;
        })
      }
      onDesfazerTudo={() => {
        setSimulacoes(new Map());
        setUltimoId(null);
      }}
      onFechar={onFechar}
    />
  );
}

describe('SimulacaoMapaPainel', () => {
  it('exibe aviso explícito de simulação e recalcula diferença em g e % pela lista', () => {
    render(<PainelComEstado />);

    expect(screen.getByText('Simulação')).toBeInTheDocument();
    expect(
      screen.getByText(/nenhum dado real é alterado/i),
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Serviço'), {
      target: { value: '8' },
    });
    fireEvent.change(screen.getByLabelText('Mover para região'), {
      target: { value: 'ca-central' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Simular mudança' }));

    const status = screen.getByRole('status');
    expect(status).toHaveTextContent('Media CDN');
    expect(status).toHaveTextContent('Japão · Tóquio → Canadá · Toronto');
    expect(status).toHaveTextContent(/−\d+,\d+ gCO₂e/);
    expect(status).toHaveTextContent('−91,3%');

    fireEvent.click(screen.getByRole('button', { name: 'Desfazer' }));
    expect(status).toHaveTextContent('Nenhuma mudança simulada ainda');
  });

  it('permite desfazer múltiplas simulações de uma vez', () => {
    render(<PainelComEstado />);

    fireEvent.change(screen.getByLabelText('Serviço'), {
      target: { value: '8' },
    });
    fireEvent.change(screen.getByLabelText('Mover para região'), {
      target: { value: 'ca-central' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Simular mudança' }));

    fireEvent.change(screen.getByLabelText('Serviço'), {
      target: { value: '4' },
    });
    fireEvent.change(screen.getByLabelText('Mover para região'), {
      target: { value: 'br-sudeste' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Simular mudança' }));

    expect(screen.getByRole('status')).toHaveTextContent(
      '2 serviços em simulação',
    );

    fireEvent.click(screen.getByRole('button', { name: 'Desfazer tudo' }));
    expect(screen.getByRole('status')).toHaveTextContent(
      'Nenhuma mudança simulada ainda',
    );
  });

  it('informa claramente quando a região de destino não tem intensidade de carbono', () => {
    render(<PainelComEstado />);

    fireEvent.change(screen.getByLabelText('Serviço'), {
      target: { value: '8' },
    });
    fireEvent.change(screen.getByLabelText('Mover para região'), {
      target: { value: 'eu-west' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Simular mudança' }));

    expect(screen.getByRole('status')).toHaveTextContent(
      /Sem dados de intensidade de carbono em Irlanda · Dublin/,
    );
  });
});
