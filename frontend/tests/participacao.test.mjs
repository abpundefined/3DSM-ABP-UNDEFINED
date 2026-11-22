import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  fraseDaRegiao,
  fraseDePareto,
  montarParticipacao,
} from '../src/utils/participacao.ts';

const noMapa = (servicoId, nome, regiaoCodigo, local, emissaoGCo2e) => ({
  servicoId,
  nome,
  estado: 'DISPONIVEL',
  regiaoCodigo,
  latitude: 0,
  longitude: 0,
  local,
  totais: { energiaKwh: 0.01, emissaoGCo2e },
  serie: [],
});

const semCoordenadas = (servicoId, nome, emissaoGCo2e) => ({
  servicoId,
  nome,
  estado: 'DISPONIVEL',
  regiaoCodigo: 'desconhecida',
  totais: { energiaKwh: 0.01, emissaoGCo2e },
});

test('agrupa por região e calcula a participação no total', () => {
  const { totalGCo2e, regioes } = montarParticipacao({
    servicos: [
      noMapa(1, 'Search API', 'us-east', 'Estados Unidos · Ashburn', 30),
      noMapa(2, 'Media CDN', 'ap-northeast', 'Japão · Tóquio', 50),
      noMapa(3, 'Auth Service', 'us-east', 'Estados Unidos · Ashburn', 10),
    ],
    semCoordenadas: [semCoordenadas(4, 'Email Worker', 10)],
  });

  assert.equal(totalGCo2e, 100);
  assert.deepEqual(
    regioes.map(({ nome, emissaoGCo2e, percentual }) => [
      nome,
      emissaoGCo2e,
      percentual,
    ]),
    [
      ['Japão · Tóquio', 50, 50],
      ['Estados Unidos · Ashburn', 40, 40],
      ['desconhecida', 10, 10],
    ],
  );
  assert.deepEqual(
    regioes[1].servicos.map(({ nome, percentual }) => [nome, percentual]),
    [
      ['Search API', 30],
      ['Auth Service', 10],
    ],
  );
});

test('deixa de fora quem não emitiu no período', () => {
  const { totalGCo2e, regioes } = montarParticipacao({
    servicos: [
      noMapa(1, 'Search API', 'us-east', 'Estados Unidos · Ashburn', 20),
      noMapa(2, 'Parado', 'us-east', 'Estados Unidos · Ashburn', 0),
    ],
    semCoordenadas: [semCoordenadas(3, 'Sem coleta', null)],
  });

  assert.equal(totalGCo2e, 20);
  assert.equal(regioes.length, 1);
  assert.deepEqual(
    regioes[0].servicos.map(({ nome }) => nome),
    ['Search API'],
  );
});

test('sem emissão no período não há participação', () => {
  assert.deepEqual(
    montarParticipacao({
      servicos: [],
      semCoordenadas: [semCoordenadas(1, 'Sem coleta', null)],
    }),
    { totalGCo2e: 0, regioes: [] },
  );
});

test('empate na emissão ordena pelo nome', () => {
  const { regioes } = montarParticipacao({
    servicos: [
      noMapa(1, 'Zeta', 'eu-west', 'Irlanda · Dublin', 5),
      noMapa(2, 'Alfa', 'eu-west', 'Irlanda · Dublin', 5),
    ],
    semCoordenadas: [],
  });

  assert.deepEqual(
    regioes[0].servicos.map(({ nome }) => nome),
    ['Alfa', 'Zeta'],
  );
});

const participacaoDe = (...emissoes) =>
  montarParticipacao({
    servicos: emissoes.map(([nome, regiao, emissao], indice) =>
      noMapa(indice + 1, nome, regiao, `Local ${regiao}`, emissao),
    ),
    semCoordenadas: [],
  });

test('Pareto conta os maiores até chegar a 80% das emissões', () => {
  assert.equal(
    fraseDePareto(
      participacaoDe(
        ['A', 'r1', 50],
        ['B', 'r1', 25],
        ['C', 'r2', 15],
        ['D', 'r2', 10],
      ),
    ),
    '3 de 4 serviços respondem por 90% das emissões do período.',
  );
  assert.equal(
    fraseDePareto(
      participacaoDe(['A', 'r1', 60], ['B', 'r2', 20], ['C', 'r2', 20]),
    ),
    '2 de 3 serviços respondem por 80% das emissões do período.',
  );
});

test('Pareto com um serviço dominante ou sozinho', () => {
  assert.equal(
    fraseDePareto(participacaoDe(['Video', 'r1', 85], ['B', 'r2', 15])),
    'Video sozinho responde por 85% das emissões do período.',
  );
  assert.equal(
    fraseDePareto(participacaoDe(['Video', 'r1', 3])),
    'Video sozinho responde por 100% das emissões do período.',
  );
  assert.equal(fraseDePareto({ totalGCo2e: 0, regioes: [] }), null);
});

test('frase da região que mais emite', () => {
  assert.equal(
    fraseDaRegiao(participacaoDe(['A', 'r1', 2], ['B', 'r2', 1])),
    'Local r1 é a região que mais emite: 66,7% do total.',
  );
  assert.equal(
    fraseDaRegiao(participacaoDe(['A', 'r1', 2], ['B', 'r1', 1])),
    'Todas as emissões vêm de Local r1.',
  );
  assert.equal(fraseDaRegiao({ totalGCo2e: 0, regioes: [] }), null);
});
