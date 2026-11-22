import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mapaDemo } from '../src/mocks/mapa.ts';
import { simulacaoDemo } from '../src/mocks/simulacao.ts';
import {
  descreverDiferenca,
  ehRespostaSimulacao,
  formatarIntensidade,
  regiaoSugerida,
} from '../src/utils/simulacao.ts';

function regiao(sobrescrever) {
  return {
    codigo: 'br-sudeste',
    pais: 'Brasil',
    regiao: 'Sudeste',
    cidade: 'São Paulo',
    intensidadeGCo2ePorKwh: 100,
    amostrasIntensidade: 4,
    emissaoEstimadaGCo2e: 200,
    diferencaGCo2e: -600,
    diferencaPercentual: -75,
    atual: false,
    menorEmissao: true,
    ...sobrescrever,
  };
}

function resposta(sobrescrever = {}) {
  return {
    periodo: {
      inicio: '2026-11-15T12:00:00.000Z',
      fim: '2026-11-16T12:00:00.000Z',
    },
    servico: { servicoId: 1, nome: 'api', regiaoCodigo: 'us-east' },
    energiaKwh: 2,
    coletasConsideradas: 10,
    emissaoAtualGCo2e: 800,
    melhorRegiaoCodigo: 'br-sudeste',
    regioes: [
      regiao(),
      regiao({
        codigo: 'eu-west',
        intensidadeGCo2ePorKwh: 300,
        emissaoEstimadaGCo2e: 600,
        diferencaGCo2e: -200,
        diferencaPercentual: -25,
        menorEmissao: false,
      }),
      regiao({
        codigo: 'us-east',
        intensidadeGCo2ePorKwh: 400,
        emissaoEstimadaGCo2e: 800,
        diferencaGCo2e: 0,
        diferencaPercentual: 0,
        atual: true,
        menorEmissao: false,
      }),
    ],
    ...sobrescrever,
  };
}

test('reconhece a resposta da simulação e recusa formatos inválidos', () => {
  assert.equal(ehRespostaSimulacao(resposta()), true);
  assert.equal(ehRespostaSimulacao(null), false);
  assert.equal(ehRespostaSimulacao({ ...resposta(), regioes: 'x' }), false);
  assert.equal(
    ehRespostaSimulacao({ ...resposta(), regioes: [{ codigo: 1 }] }),
    false,
  );
  assert.equal(
    ehRespostaSimulacao({ ...resposta(), servico: undefined }),
    false,
  );
});

test('sugere a região de menor emissão quando ela não é a atual', () => {
  assert.equal(regiaoSugerida(resposta()), 'br-sudeste');
});

test('quando a atual já é a melhor, sugere a próxima com estimativa', () => {
  const dados = resposta({
    melhorRegiaoCodigo: 'us-east',
    regioes: [
      regiao({ codigo: 'us-east', atual: true, diferencaGCo2e: 0 }),
      regiao({ codigo: 'x', emissaoEstimadaGCo2e: null, diferencaGCo2e: null }),
      regiao({ codigo: 'eu-west', menorEmissao: false }),
    ],
  });

  assert.equal(regiaoSugerida(dados), 'eu-west');
});

test('sem nenhuma estimativa, não sugere região', () => {
  const dados = resposta({
    melhorRegiaoCodigo: null,
    regioes: [regiao({ emissaoEstimadaGCo2e: null, diferencaGCo2e: null })],
  });

  assert.equal(regiaoSugerida(dados), null);
});

test('descreve a diferença em g e em %, com texto de redução ou aumento', () => {
  assert.equal(
    descreverDiferenca(regiao(), 'us-east'),
    '600,00 gCO₂e a menos (−75%) que em Estados Unidos (Virgínia)',
  );
  assert.equal(
    descreverDiferenca(
      regiao({ diferencaGCo2e: 1500, diferencaPercentual: 187.54 }),
      'us-east',
    ),
    '1,50 kgCO₂e a mais (+187,5%) que em Estados Unidos (Virgínia)',
  );
});

test('descreve a região atual, o empate e a falta de dados', () => {
  assert.equal(
    descreverDiferenca(regiao({ atual: true, diferencaGCo2e: 0 }), 'us-east'),
    'É a região atual do serviço.',
  );
  assert.equal(
    descreverDiferenca(
      regiao({ diferencaGCo2e: 0, diferencaPercentual: 0 }),
      'us-east',
    ),
    'Mesma emissão estimada que em Estados Unidos (Virgínia)',
  );
  assert.equal(
    descreverDiferenca(
      regiao({ diferencaGCo2e: 0, diferencaPercentual: null }),
      'us-east',
    ),
    'Mesma emissão estimada que em Estados Unidos (Virgínia)',
  );
  assert.equal(
    descreverDiferenca(
      regiao({ diferencaGCo2e: null, diferencaPercentual: null }),
      'us-east',
    ),
    'Sem dados suficientes para comparar com a região atual.',
  );
  assert.equal(
    descreverDiferenca(
      regiao({ diferencaGCo2e: -5, diferencaPercentual: null }),
      'us-east',
    ),
    '5,00 gCO₂e a menos que em Estados Unidos (Virgínia)',
  );
});

test('formata a intensidade com unidade', () => {
  assert.equal(formatarIntensidade(384), '384 gCO₂e/kWh');
  assert.equal(formatarIntensidade(396.6667), '396,7 gCO₂e/kWh');
  assert.equal(formatarIntensidade(null), 'sem dados no período');
});

test('a demonstração usa as mesmas regiões e energias do mapa', () => {
  const dados = simulacaoDemo(4);
  const servicoNoMapa = mapaDemo.servicos.find((s) => s.servicoId === 4);

  assert.equal(ehRespostaSimulacao(dados), true);
  assert.equal(dados.servico.nome, servicoNoMapa.nome);
  assert.equal(dados.servico.regiaoCodigo, 'us-east');
  assert.equal(dados.energiaKwh, servicoNoMapa.totais.energiaKwh);
  assert.deepEqual(
    dados.regioes.map((r) => r.codigo),
    ['ca-central', 'br-sudeste', 'us-east', 'jp-east', 'eu-west'],
  );
  assert.equal(dados.melhorRegiaoCodigo, 'ca-central');
});

test('na demonstração, a região atual tem diferença zero e a sem coleta fica sem estimativa', () => {
  const dados = simulacaoDemo(4);
  const atual = dados.regioes.find((r) => r.atual);
  const dublin = dados.regioes.find((r) => r.codigo === 'eu-west');

  assert.equal(atual.codigo, 'us-east');
  assert.equal(atual.diferencaGCo2e, 0);
  assert.equal(
    Math.round(dados.emissaoAtualGCo2e * 1000),
    Math.round(dados.energiaKwh * 384 * 1000),
  );
  assert.equal(dublin.intensidadeGCo2ePorKwh, null);
  assert.equal(dublin.emissaoEstimadaGCo2e, null);
});

test('na demonstração, serviço sem coleta não tem energia e serviço inexistente devolve null', () => {
  const semColeta = simulacaoDemo(6);

  assert.equal(semColeta.energiaKwh, null);
  assert.equal(semColeta.melhorRegiaoCodigo, null);
  assert.equal(simulacaoDemo(999), null);
});
