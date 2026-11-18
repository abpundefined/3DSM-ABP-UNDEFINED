import type { EstadoMonitoramento } from '../types/mapa';
import type { RespostaSaude } from '../types/saude';
import { ESTADOS_DE_SERVICO } from '../utils/saude.ts';
import { mapaDemo } from './mapa.ts';

// Fixture para demonstração. Não representa consultas reais.
const AGORA = '2026-11-11T23:30:00.000Z';
const COLETAS = 480;
const FALHAS = 12;

function contarServicosPorEstado() {
  const contagem = Object.fromEntries(
    ESTADOS_DE_SERVICO.map((estado) => [estado, 0]),
  ) as Record<EstadoMonitoramento, number>;

  for (const servico of mapaDemo.servicos) {
    contagem[servico.estado] += 1;
  }

  return contagem;
}

export const saudeDemo: RespostaSaude = {
  geradoEm: AGORA,
  agregador: {
    estado: 'OPERACIONAL',
    ultimaConsultaEm: '2026-11-11T23:29:48.000Z',
    tempoRespostaMs: 142,
    ultimoSucessoEm: '2026-11-11T23:29:48.000Z',
    mensagemErro: null,
  },
  apiCarbono: {
    estado: 'FALHA',
    ultimaConsultaEm: '2026-11-11T23:29:30.000Z',
    tempoRespostaMs: 8000,
    ultimoSucessoEm: '2026-11-11T23:28:30.000Z',
    mensagemErro:
      'Tempo limite de 8000 ms excedido ao consultar a API de intensidade de carbono.',
  },
  ultimaDescobertaEm: '2026-11-11T23:29:48.000Z',
  coletasUltimaHora: {
    total: COLETAS,
    falhas: FALHAS,
    taxaFalha: FALHAS / COLETAS,
  },
  servicosPorEstado: contarServicosPorEstado(),
};
