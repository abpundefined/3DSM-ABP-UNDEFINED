import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mapaDemo } from '../src/mocks/mapa.ts';
import { saudeDemo } from '../src/mocks/saude.ts';
import {
  descreverColetas,
  descreverHorario,
  ehRespostaSaude,
  formatarTempoDeResposta,
} from '../src/utils/saude.ts';

const AGORA = '2026-11-17T12:00:00.000Z';

const segundosAntes = (segundos) =>
  new Date(Date.parse(AGORA) - segundos * 1000).toISOString();

function resposta(sobrescrever = {}) {
  return structuredClone({ ...saudeDemo, ...sobrescrever });
}

test('aceita a resposta de demonstração e a de uma integração sem consulta', () => {
  assert.equal(ehRespostaSaude(saudeDemo), true);

  const semConsulta = {
    estado: 'SEM_CONSULTA',
    ultimaConsultaEm: null,
    tempoRespostaMs: null,
    ultimoSucessoEm: null,
    mensagemErro: null,
  };
  assert.equal(
    ehRespostaSaude(
      resposta({
        agregador: semConsulta,
        ultimaDescobertaEm: null,
        coletasUltimaHora: { total: 0, falhas: 0, taxaFalha: null },
      }),
    ),
    true,
  );
});

test('recusa respostas que não têm o formato do backend', () => {
  assert.equal(ehRespostaSaude(null), false);
  assert.equal(ehRespostaSaude({}), false);
  assert.equal(ehRespostaSaude(resposta({ geradoEm: 'ontem' })), false);

  const estadoInvalido = resposta();
  estadoInvalido.agregador.estado = 'QUEBRADO';
  assert.equal(ehRespostaSaude(estadoInvalido), false);

  const semEstadoDeServico = resposta();
  delete semEstadoDeServico.servicosPorEstado.REMOVIDO;
  assert.equal(ehRespostaSaude(semEstadoDeServico), false);

  const coletasInvalidas = resposta();
  coletasInvalidas.coletasUltimaHora.total = '10';
  assert.equal(ehRespostaSaude(coletasInvalidas), false);
});

test('descreve o horário em relação ao momento da resposta', () => {
  assert.equal(descreverHorario(null, AGORA), 'ainda não houve');
  assert.equal(descreverHorario(null, AGORA, 'nunca'), 'nunca');
  assert.equal(descreverHorario(segundosAntes(2), AGORA), 'agora mesmo');
  assert.equal(descreverHorario(segundosAntes(12), AGORA), 'há 12 segundos');
  assert.equal(descreverHorario(segundosAntes(90), AGORA), 'há 1 minuto');
  assert.equal(descreverHorario(segundosAntes(3 * 60), AGORA), 'há 3 minutos');
  assert.equal(descreverHorario(segundosAntes(2 * 3600), AGORA), 'há 2 horas');
  assert.equal(descreverHorario(segundosAntes(86_400), AGORA), 'ontem');
});

test('horário no futuro, por diferença de relógio, vira "agora mesmo"', () => {
  assert.equal(descreverHorario(segundosAntes(-30), AGORA), 'agora mesmo');
});

test('formata o tempo de resposta em ms ou em segundos', () => {
  assert.equal(formatarTempoDeResposta(null), 'sem medição');
  assert.equal(formatarTempoDeResposta(0), '0 ms');
  assert.equal(formatarTempoDeResposta(142), '142 ms');
  assert.equal(formatarTempoDeResposta(1000), '1 s');
  assert.equal(formatarTempoDeResposta(8000), '8 s');
  assert.equal(formatarTempoDeResposta(1250), '1,3 s');
});

test('descreve as coletas da última hora', () => {
  assert.equal(
    descreverColetas({ total: 0, falhas: 0, taxaFalha: null }),
    'Nenhuma coleta na última hora.',
  );
  assert.equal(
    descreverColetas({ total: 10, falhas: 0, taxaFalha: 0 }),
    '10 coletas na última hora, 0 falharam (0%).',
  );
  assert.equal(
    descreverColetas({ total: 480, falhas: 12, taxaFalha: 0.025 }),
    '480 coletas na última hora, 12 falharam (2,5%).',
  );
  assert.equal(
    descreverColetas({ total: 1, falhas: 1, taxaFalha: 1 }),
    '1 coleta na última hora, 1 falhou (100%).',
  );
});

test('a demonstração bate com os serviços do mapa de demonstração', () => {
  const soma = Object.values(saudeDemo.servicosPorEstado).reduce(
    (total, quantidade) => total + quantidade,
    0,
  );

  assert.equal(soma, mapaDemo.servicos.length);
  assert.equal(
    saudeDemo.coletasUltimaHora.taxaFalha,
    saudeDemo.coletasUltimaHora.falhas / saudeDemo.coletasUltimaHora.total,
  );
  assert.equal(saudeDemo.apiCarbono.estado, 'FALHA');
  assert.ok(saudeDemo.apiCarbono.mensagemErro);
});
