import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mapaDemo } from '../src/mocks/mapa.ts';
import {
  aplicarSimulacoesNoMapa,
  descreverResultadoSimulacaoMapa,
  distanciaKm,
  encontrarRegiaoMaisProxima,
  extrairRegioesAlvoMapa,
  formatarDiferencaGramas,
  formatarDiferencaPercentual,
  formatarGramasSimulacao,
  posicoesSemSobreposicao,
  simularMudancaRegiaoNoMapa,
} from '../src/utils/simulacaoMapa.ts';

test('extrai regiões monitoradas com coordenadas e intensidade média ponderada', () => {
  const regioes = extrairRegioesAlvoMapa(
    mapaDemo.servicos,
    mapaDemo.semCoordenadas,
  );

  assert.equal(regioes.length, 5);
  assert.deepEqual(
    regioes.map(({ codigo }) => codigo),
    ['br-sudeste', 'ca-central', 'us-east', 'eu-west', 'jp-east'],
  );

  const toquio = regioes.find(({ codigo }) => codigo === 'jp-east');
  const toronto = regioes.find(({ codigo }) => codigo === 'ca-central');
  const dublin = regioes.find(({ codigo }) => codigo === 'eu-west');

  assert.ok(toquio && toronto && dublin);
  assert.ok(Math.abs((toquio.intensidadeGCo2ePorKwh ?? 0) - 471) < 1);
  assert.ok(Math.abs((toronto.intensidadeGCo2ePorKwh ?? 0) - 41) < 1);
  assert.equal(dublin.intensidadeGCo2ePorKwh, null);
});

test('calcula distância e encontra a região monitorada mais próxima do ponto solto', () => {
  const regioes = extrairRegioesAlvoMapa(mapaDemo.servicos);

  assert.equal(distanciaKm(-23.5505, -46.6333, -23.5505, -46.6333), 0);

  const pertoDeToronto = encontrarRegiaoMaisProxima(44.1, -79.8, regioes);
  assert.equal(pertoDeToronto?.codigo, 'ca-central');

  const pertoDeToquio = encontrarRegiaoMaisProxima(35.0, 140.0, regioes);
  assert.equal(pertoDeToquio?.codigo, 'jp-east');

  const foraDoRaio = encontrarRegiaoMaisProxima(0, 0, regioes, 500);
  assert.equal(foraDoRaio, null);
});

test('recalcula emissão pela regra energia × intensidade da região de destino sem alterar o original', () => {
  const regioes = extrairRegioesAlvoMapa(mapaDemo.servicos);
  const mediaCdn = mapaDemo.servicos.find(({ servicoId }) => servicoId === 8);
  const toronto = regioes.find(({ codigo }) => codigo === 'ca-central');
  assert.ok(mediaCdn && toronto);

  const copiaAntes = structuredClone(mediaCdn);
  const resultado = simularMudancaRegiaoNoMapa(mediaCdn, toronto);

  assert.deepEqual(mediaCdn, copiaAntes);
  assert.equal(resultado.regiaoOrigemCodigo, 'jp-east');
  assert.equal(resultado.regiaoDestinoCodigo, 'ca-central');

  const esperada =
    (mediaCdn.totais.energiaKwh ?? 0) * (toronto.intensidadeGCo2ePorKwh ?? 0);
  assert.ok(resultado.emissaoSimuladaGCo2e !== null);
  assert.ok(Math.abs(resultado.emissaoSimuladaGCo2e - esperada) < 1e-6);
  assert.ok(resultado.diferencaGCo2e !== null && resultado.diferencaGCo2e < 0);
  assert.ok(
    resultado.diferencaPercentual !== null &&
      Math.abs(resultado.diferencaPercentual - -91.3) < 0.2,
  );
});

test('lida com região de destino ou serviço sem dados suficientes', () => {
  const regioes = extrairRegioesAlvoMapa(mapaDemo.servicos);
  const mediaCdn = mapaDemo.servicos.find(({ servicoId }) => servicoId === 8);
  const semMetricas = mapaDemo.servicos.find(
    ({ servicoId }) => servicoId === 6,
  );
  const dublin = regioes.find(({ codigo }) => codigo === 'eu-west');
  const toronto = regioes.find(({ codigo }) => codigo === 'ca-central');
  assert.ok(mediaCdn && semMetricas && dublin && toronto);

  const paraDublin = simularMudancaRegiaoNoMapa(mediaCdn, dublin);
  assert.equal(paraDublin.emissaoSimuladaGCo2e, null);
  assert.equal(paraDublin.diferencaGCo2e, null);
  assert.match(
    descreverResultadoSimulacaoMapa(paraDublin),
    /Sem dados de intensidade/,
  );

  const servicoVazio = simularMudancaRegiaoNoMapa(semMetricas, toronto);
  assert.equal(servicoVazio.emissaoSimuladaGCo2e, null);
  assert.match(
    descreverResultadoSimulacaoMapa(servicoVazio),
    /não tem dados de energia suficientes/,
  );
});

test('aplica simulações no mapa de forma imutável e separa marcadores co-localizados', () => {
  const regioes = extrairRegioesAlvoMapa(mapaDemo.servicos);
  const mediaCdn = mapaDemo.servicos.find(({ servicoId }) => servicoId === 8);
  const toronto = regioes.find(({ codigo }) => codigo === 'ca-central');
  assert.ok(mediaCdn && toronto);

  const simulacao = simularMudancaRegiaoNoMapa(mediaCdn, toronto);
  const simulacoes = new Map([[mediaCdn.servicoId, simulacao]]);

  const copiaOriginal = structuredClone(mapaDemo.servicos);
  const aplicados = aplicarSimulacoesNoMapa(mapaDemo.servicos, simulacoes);

  assert.deepEqual(mapaDemo.servicos, copiaOriginal);
  const mediaMovido = aplicados.find(({ servicoId }) => servicoId === 8);
  assert.equal(mediaMovido?.regiaoCodigo, 'ca-central');
  assert.equal(mediaMovido?.local, 'Canadá · Toronto');
  assert.equal(
    mediaMovido?.totais.emissaoGCo2e,
    simulacao.emissaoSimuladaGCo2e,
  );

  const posicoes = posicoesSemSobreposicao(mapaDemo.servicos);
  const sp1 = posicoes.get(1);
  const sp2 = posicoes.get(2);
  const toquioPos = posicoes.get(8);
  assert.ok(sp1 && sp2 && toquioPos);
  assert.notDeepEqual(sp1, sp2);
  assert.equal(toquioPos.latitude, mediaCdn.latitude);
  assert.equal(toquioPos.longitude, mediaCdn.longitude);
});

test('formata valores e diferenças em gramas e percentual em pt-BR', () => {
  assert.equal(formatarGramasSimulacao(8.4), '8,40 gCO₂e');
  assert.equal(formatarGramasSimulacao(0.004), '< 0,01 gCO₂e');
  assert.equal(formatarGramasSimulacao(null), 'Sem dados');

  assert.equal(formatarDiferencaGramas(-7.67), '−7,67 gCO₂e');
  assert.equal(formatarDiferencaGramas(1.52), '+1,52 gCO₂e');
  assert.equal(formatarDiferencaGramas(0), '0,00 gCO₂e');

  assert.equal(formatarDiferencaPercentual(-91.29), '−91,3%');
  assert.equal(formatarDiferencaPercentual(292.24), '+292,2%');
  assert.equal(formatarDiferencaPercentual(0), '0%');
});
