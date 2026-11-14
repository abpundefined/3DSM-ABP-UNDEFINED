import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mapaDemo } from '../src/mocks/mapa.ts';
import {
  ehRespostaMapa,
  formatarEnergia,
  limitesDosServicos,
  ordenarPorEmissao,
  rotuloEstado,
} from '../src/utils/mapaDados.ts';

const copia = () => structuredClone(mapaDemo);

test('accepts a response in the GET /mapa format', () => {
  assert.equal(ehRespostaMapa(copia()), true);
  assert.equal(
    ehRespostaMapa({ ...copia(), servicos: [], semCoordenadas: [] }),
    true,
  );
});

test('rejects responses that are not objects or miss the lists', () => {
  assert.equal(ehRespostaMapa(null), false);
  assert.equal(ehRespostaMapa([]), false);
  assert.equal(ehRespostaMapa({ ...copia(), servicos: undefined }), false);
  assert.equal(ehRespostaMapa({ ...copia(), semCoordenadas: {} }), false);
  assert.equal(ehRespostaMapa({ ...copia(), granularidade: 'mes' }), false);
  assert.equal(ehRespostaMapa({ ...copia(), periodo: {} }), false);
});

test('rejects a service with invalid coordinates or unknown state', () => {
  const latitude = copia();
  latitude.servicos[0].latitude = 91;
  const longitude = copia();
  longitude.servicos[0].longitude = Number.NaN;
  const estado = copia();
  estado.servicos[0].estado = 'ATIVO';

  assert.equal(ehRespostaMapa(latitude), false);
  assert.equal(ehRespostaMapa(longitude), false);
  assert.equal(ehRespostaMapa(estado), false);
});

test('rejects a series that is not aligned with the intervals', () => {
  const curta = copia();
  curta.servicos[0].serie.pop();
  const texto = copia();
  texto.servicos[0].serie[0] = '0.1';

  assert.equal(ehRespostaMapa(curta), false);
  assert.equal(ehRespostaMapa(texto), false);
});

test('rejects totals that are not numbers or null', () => {
  const dados = copia();
  dados.semCoordenadas[0].totais.emissaoGCo2e = '0.62';

  assert.equal(ehRespostaMapa(dados), false);
});

test('translates every monitoring state to a readable label', () => {
  assert.equal(rotuloEstado('DISPONIVEL'), 'Disponível');
  assert.equal(rotuloEstado('INDISPONIVEL'), 'Indisponível');
  assert.equal(rotuloEstado('SEM_METRICAS'), 'Sem métricas');
  assert.equal(rotuloEstado('REMOVIDO'), 'Removido');
  assert.equal(rotuloEstado('DESCONHECIDO'), 'Desconhecido');
});

test('formats energy in pt-BR and keeps missing data explicit', () => {
  assert.equal(formatarEnergia(0.0127), '0,0127 kWh');
  assert.equal(formatarEnergia(1.23456), '1,23 kWh');
  assert.equal(formatarEnergia(0), '0 kWh');
  assert.equal(formatarEnergia(null), 'Sem dados');
});

test('computes the bounds that contain every service', () => {
  assert.deepEqual(limitesDosServicos(mapaDemo.servicos), [
    [-23.5505, -79.3832],
    [53.3498, 139.6503],
  ]);
  assert.deepEqual(
    limitesDosServicos([{ latitude: -23.5, longitude: -46.6 }]),
    [
      [-23.5, -46.6],
      [-23.5, -46.6],
    ],
  );
  assert.equal(limitesDosServicos([]), null);
});

test('sorts services by emission, highest first and missing data last', () => {
  const servico = (nome, emissaoGCo2e) => ({
    nome,
    totais: { energiaKwh: null, emissaoGCo2e },
  });
  const entrada = [
    servico('Beta', 0.2),
    servico('Sem dados B', null),
    servico('Alfa', 0.9),
    servico('Sem dados A', null),
    servico('Gama', 0.2),
    servico('Zero', 0),
  ];

  assert.deepEqual(
    ordenarPorEmissao(entrada).map(({ nome }) => nome),
    ['Alfa', 'Beta', 'Gama', 'Zero', 'Sem dados A', 'Sem dados B'],
  );
  assert.equal(entrada[0].nome, 'Beta');
});
