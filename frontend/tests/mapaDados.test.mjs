import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mapaDemo } from '../src/mocks/mapa.ts';
import {
  ehRespostaMapa,
  filtrarPorRegiao,
  formatarEnergia,
  formatarIntensidadeRegional,
  intensidadesPorRegiao,
  limitesDosServicos,
  ordenarPorEmissao,
  regioesDoMapa,
  resumoDaIntensidadeRegional,
  rotuloEstado,
  zoomMinimoDoMapa,
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

test('lists each monitored region once, sorted by location', () => {
  assert.deepEqual(regioesDoMapa(copia().servicos), [
    { codigo: 'br-sudeste', local: 'Brasil · São Paulo' },
    { codigo: 'ca-central', local: 'Canadá · Toronto' },
    { codigo: 'us-east', local: 'Estados Unidos · Ashburn' },
    { codigo: 'eu-west', local: 'Irlanda · Dublin' },
    { codigo: 'jp-east', local: 'Japão · Tóquio' },
  ]);
  assert.deepEqual(regioesDoMapa([]), []);
});

test('aggregates regional intensity by total energy and includes known unlocated services', () => {
  const { servicos } = copia();
  const intensidades = intensidadesPorRegiao(servicos, [
    {
      servicoId: 11,
      nome: 'Worker in São Paulo',
      estado: 'DISPONIVEL',
      regiaoCodigo: 'br-sudeste',
      totais: { energiaKwh: 1, emissaoGCo2e: 98 },
    },
    {
      servicoId: 12,
      nome: 'Unknown location',
      estado: 'DISPONIVEL',
      regiaoCodigo: 'desconhecida',
      totais: { energiaKwh: 1, emissaoGCo2e: 1 },
    },
  ]);
  const saoPaulo = intensidades.find(({ codigo }) => codigo === 'br-sudeste');
  const toronto = intensidades.find(({ codigo }) => codigo === 'ca-central');

  assert.equal(saoPaulo?.quantidadeServicos, 4);
  assert.ok(Math.abs((saoPaulo?.intensidadeGCo2ePorKwh ?? 0) - 98) < 0.001);
  assert.ok(Math.abs((toronto?.intensidadeGCo2ePorKwh ?? 0) - 41) < 0.01);
  assert.equal(intensidades[0].codigo, 'jp-east');
  assert.equal(intensidades.at(-1)?.codigo, 'eu-west');
  assert.equal(
    intensidades.some(({ codigo }) => codigo === 'desconhecida'),
    false,
  );
});

test('keeps regions without measurable energy and formats intensity explicitly', () => {
  const { servicos } = copia();
  const semEnergia = {
    ...servicos[0],
    totais: { energiaKwh: null, emissaoGCo2e: null },
  };
  const intensidades = intensidadesPorRegiao([semEnergia]);

  assert.equal(intensidades[0].intensidadeGCo2ePorKwh, null);
  assert.equal(formatarIntensidadeRegional(null), 'Sem dados');
  assert.equal(formatarIntensidadeRegional(384.44), '384,4 gCO₂e/kWh');
});

test('summarizes the largest regional intensity and handles zero or insufficient data', () => {
  const regioes = intensidadesPorRegiao(copia().servicos);

  assert.match(
    resumoDaIntensidadeRegional(regioes),
    /Japão · Tóquio emite 11,5 vezes mais CO₂e por kWh que Canadá · Toronto/,
  );
  assert.match(
    resumoDaIntensidadeRegional([
      {
        codigo: 'zero',
        local: 'Região zero',
        intensidadeGCo2ePorKwh: 0,
        quantidadeServicos: 1,
      },
      {
        codigo: 'positive',
        local: 'Região positiva',
        intensidadeGCo2ePorKwh: 20,
        quantidadeServicos: 1,
      },
    ]),
    /não é possível expressar a diferença em vezes/,
  );
  assert.match(
    resumoDaIntensidadeRegional(regioes.slice(0, 1)),
    /pelo menos duas regiões/,
  );
});

test('filters items by region and keeps all of them without a region', () => {
  const { servicos, semCoordenadas } = copia();

  assert.equal(filtrarPorRegiao(servicos, null), servicos);
  assert.deepEqual(
    filtrarPorRegiao(servicos, 'br-sudeste').map(({ nome }) => nome),
    ['Auth Service', 'Catalog API', 'Billing Service'],
  );
  assert.deepEqual(filtrarPorRegiao(semCoordenadas, 'br-sudeste'), []);
  assert.deepEqual(filtrarPorRegiao(servicos, 'inexistente'), []);
});

test('finds the smallest map zoom where the world covers the container', () => {
  assert.equal(zoomMinimoDoMapa(910, 520), 2);
  assert.equal(zoomMinimoDoMapa(340, 380), 1);
  assert.equal(zoomMinimoDoMapa(1800, 520), 3);
  assert.equal(zoomMinimoDoMapa(200, 200), 0);
  assert.equal(zoomMinimoDoMapa(0, 0), 0);
});
