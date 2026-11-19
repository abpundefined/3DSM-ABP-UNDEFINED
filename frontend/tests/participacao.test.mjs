import assert from 'node:assert/strict';
import { test } from 'node:test';
import { montarParticipacao } from '../src/utils/participacao.ts';

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
