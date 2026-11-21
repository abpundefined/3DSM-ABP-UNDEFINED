import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  AGRUPAMENTOS,
  METRICAS,
  abreviarNome,
  agruparItensRanking,
  consultaDoRanking,
  ehRespostaRanking,
  escalaDaMetrica,
  escreverAgrupamento,
  escreverMetrica,
  formatarNumero,
  formatarPeriodoConsiderado,
  fraseDeIntensidade,
  lerAgrupamento,
  lerMetrica,
  nomeDaRegiaoDoItem,
  nomeDoPaisDoItem,
  resumoDoRanking,
} from '../src/utils/ranking.ts';

const item = {
  posicao: 1,
  servicoId: 5,
  nome: 'Video Processor',
  energiaKwh: 0.034,
  emissaoGCo2e: 13.1,
  coletasValidas: 24,
  selo: 'A',
};

const resposta = {
  periodo: {
    inicio: '2026-11-11T03:00:00.000Z',
    fim: '2026-11-12T02:59:59.999Z',
  },
  metrica: 'energia',
  itens: [item],
  semDados: [{ servicoId: 6, nome: 'Notification Worker', selo: '—' }],
};

test('aceita a resposta no formato do GET /ranking', () => {
  assert.equal(ehRespostaRanking(resposta), true);
  assert.equal(
    ehRespostaRanking({ ...resposta, itens: [], semDados: [] }),
    true,
  );
});

test('recusa resposta fora do contrato', () => {
  for (const invalida of [
    null,
    [],
    { ...resposta, metrica: 'agua' },
    { ...resposta, periodo: { inicio: '2026-11-11' } },
    { ...resposta, itens: [{ ...item, energiaKwh: null }] },
    { ...resposta, itens: [{ ...item, emissaoGCo2e: -1 }] },
    { ...resposta, itens: [{ ...item, coletasValidas: 2.5 }] },
    { ...resposta, semDados: [{ nome: 'Sem id' }] },
    { ...resposta, semDados: undefined },
  ]) {
    assert.equal(ehRespostaRanking(invalida), false);
  }
});

test('valida os novos dados de comparação e permite percentuais negativos e base nula', () => {
  const comparacao = {
    ...resposta,
    variacaoPercentual: { energiaKwh: 12, emissaoGCo2e: -5 },
    variacaoPorServico: [
      {
        servicoId: 5,
        nome: 'Video Processor',
        selo: 'A',
        emissaoAtualGCo2e: 95,
        emissaoAnteriorGCo2e: 100,
        diferencaGCo2e: -5,
        variacaoPercentual: -5,
      },
    ],
  };
  assert.equal(ehRespostaRanking(comparacao), true);
  assert.equal(
    ehRespostaRanking({
      ...comparacao,
      variacaoPorServico: [
        {
          ...comparacao.variacaoPorServico[0],
          emissaoAtualGCo2e: null,
          diferencaGCo2e: null,
          variacaoPercentual: null,
        },
      ],
    }),
    true,
  );
  assert.equal(
    ehRespostaRanking({
      ...comparacao,
      variacaoPercentual: { energiaKwh: null, emissaoGCo2e: null },
    }),
    true,
  );
  for (const invalida of [
    {
      ...comparacao,
      variacaoPorServico: [
        { ...comparacao.variacaoPorServico[0], emissaoAtualGCo2e: -1 },
      ],
    },
    {
      ...comparacao,
      variacaoPercentual: { energiaKwh: Infinity, emissaoGCo2e: -5 },
    },
    { ...comparacao, variacaoPercentual: { energiaKwh: 12 } },
    {
      ...comparacao,
      variacaoPorServico: [
        { ...comparacao.variacaoPorServico[0], diferencaGCo2e: '5' },
      ],
    },
    {
      ...comparacao,
      variacaoPorServico: [
        { ...comparacao.variacaoPorServico[0], emissaoAnteriorGCo2e: -1 },
      ],
    },
    {
      ...comparacao,
      periodoAnterior: { inicio: 'inválido', fim: '2026-11-01' },
    },
  ]) {
    assert.equal(ehRespostaRanking(invalida), false);
  }
});

test('lê a métrica da URL e usa energia quando ela falta ou é inválida', () => {
  assert.equal(lerMetrica(new URLSearchParams('metrica=emissao')), 'emissao');
  assert.equal(lerMetrica(new URLSearchParams('metrica=energia')), 'energia');
  assert.equal(lerMetrica(new URLSearchParams()), 'energia');
  assert.equal(lerMetrica(new URLSearchParams('metrica=toString')), 'energia');
});

test('grava a métrica na URL sem perder o período', () => {
  const params = new URLSearchParams('periodo=7d');

  assert.equal(
    escreverMetrica(params, 'emissao').toString(),
    'periodo=7d&metrica=emissao',
  );
  assert.equal(
    escreverMetrica(
      new URLSearchParams('periodo=7d&metrica=emissao'),
      'energia',
    ).toString(),
    'periodo=7d',
  );
  assert.equal(params.toString(), 'periodo=7d');
});

test('monta a consulta do GET /ranking com o período, a métrica e o limite', () => {
  assert.equal(consultaDoRanking('', 'energia'), '?metrica=energia&limite=10');
  assert.equal(
    consultaDoRanking('?periodo=7d', 'emissao'),
    '?periodo=7d&metrica=emissao&limite=10',
  );
  const personalizado = new URLSearchParams(
    consultaDoRanking(
      '?inicio=2026-11-01T00%3A00%3A00.000-03%3A00&fim=2026-11-07T23%3A59%3A59.999-03%3A00',
      'energia',
    ),
  );
  assert.equal(personalizado.get('inicio'), '2026-11-01T00:00:00.000-03:00');
  assert.equal(personalizado.get('fim'), '2026-11-07T23:59:59.999-03:00');
  assert.equal(personalizado.get('metrica'), 'energia');
});

const servico = (nome, energiaKwh, emissaoGCo2e) => ({
  ...item,
  nome,
  energiaKwh,
  emissaoGCo2e,
});

test('resume quem lidera o ranking e a parte dele no total', () => {
  const itens = [
    servico('Video Processor', 0.03, 12),
    servico('Media CDN', 0.02, 9),
    servico('Search API', 0.01, 3),
  ];

  assert.equal(
    resumoDoRanking(itens, 'energia'),
    'Video Processor lidera em energia: 30,00 Wh, 50% do total dos 3 serviços do ranking.',
  );
  assert.equal(
    resumoDoRanking(itens, 'emissao'),
    'Video Processor lidera em emissão: 12,00 gCO₂e, 50% do total dos 3 serviços do ranking.',
  );
  assert.equal(
    resumoDoRanking([itens[0]], 'energia'),
    'Video Processor é o único serviço com coletas no período: 30,00 Wh de energia.',
  );
  assert.equal(resumoDoRanking([], 'energia'), null);
});

test('não calcula porcentagem quando o total é zero', () => {
  assert.equal(
    resumoDoRanking([servico('A', 0, 0), servico('B', 0, 0)], 'emissao'),
    'Os serviços do ranking não registraram emissão no período.',
  );
});

test('compara a emissão por kWh quando a diferença é relevante', () => {
  assert.equal(
    fraseDeIntensidade([
      servico('Media CDN', 0.01, 4.71),
      servico('Search API', 0.02, 7.68),
      servico('Reports Engine', 0.01, 0.41),
    ]),
    'Por kWh consumido, Media CDN emite 11,5 vezes mais CO₂e que Reports Engine. A emissão depende da intensidade de carbono da energia na região onde cada serviço roda.',
  );
});

test('não compara intensidade sem diferença relevante ou sem dois serviços', () => {
  assert.equal(
    fraseDeIntensidade([servico('A', 0.01, 3), servico('B', 0.02, 5)]),
    null,
  );
  assert.equal(fraseDeIntensidade([servico('A', 0.01, 3)]), null);
  assert.equal(
    fraseDeIntensidade([servico('A', 0, 3), servico('B', 0.02, 0)]),
    null,
  );
});

test('mostra o período considerado no horário de São Paulo', () => {
  assert.equal(
    formatarPeriodoConsiderado(resposta.periodo),
    '11/11/2026, 00:00 a 11/11/2026, 23:59',
  );
});

test('formata os números dos eixos com até 3 algarismos significativos', () => {
  assert.equal(formatarNumero(0.034688), '0,0347');
  assert.equal(formatarNumero(13.32), '13,3');
  assert.equal(formatarNumero(1234), '1.230');
  assert.equal(formatarNumero(0), '0');
});

test('abrevia nomes longos no eixo e mantém os curtos', () => {
  assert.equal(abreviarNome('Media CDN'), 'Media CDN');
  assert.equal(abreviarNome('Notification Worker'), 'Notification Work…');
  assert.equal(abreviarNome('Serviço de relatórios'), 'Serviço de relató…');
  assert.equal(abreviarNome('Notification Worke'), 'Notification Worke');
});

test('os botões de métrica mostram só o nome, sem unidade', () => {
  assert.equal(METRICAS.energia.rotulo, 'Energia');
  assert.equal(METRICAS.emissao.rotulo, 'Emissão');
});

test('escolhe a unidade do eixo pelo maior valor da métrica', () => {
  assert.deepEqual(escalaDaMetrica('energia', [0.03, 0.02]), {
    unidade: 'Wh',
    fator: 1000,
  });
  assert.deepEqual(escalaDaMetrica('energia', [0.5, 2]), {
    unidade: 'kWh',
    fator: 1,
  });
  assert.deepEqual(escalaDaMetrica('energia', [0.9999999]), {
    unidade: 'kWh',
    fator: 1,
  });
  assert.deepEqual(escalaDaMetrica('emissao', [0.6, 2]), {
    unidade: 'gCO₂e',
    fator: 1,
  });
  assert.deepEqual(escalaDaMetrica('emissao', [1500, 20]), {
    unidade: 'kgCO₂e',
    fator: 0.001,
  });
  assert.deepEqual(escalaDaMetrica('energia', []), {
    unidade: 'Wh',
    fator: 1000,
  });
});

test('lê e grava o agrupamento na URL mantendo os demais parâmetros', () => {
  assert.equal(lerAgrupamento(new URLSearchParams()), 'servico');
  assert.equal(lerAgrupamento(new URLSearchParams('grupo=regiao')), 'regiao');
  assert.equal(lerAgrupamento(new URLSearchParams('grupo=pais')), 'pais');
  assert.equal(
    lerAgrupamento(new URLSearchParams('grupo=invalido')),
    'servico',
  );

  const base = new URLSearchParams('periodo=7d&metrica=emissao');
  assert.equal(
    escreverAgrupamento(base, 'regiao').toString(),
    'periodo=7d&metrica=emissao&grupo=regiao',
  );
  assert.equal(
    escreverAgrupamento(base, 'pais').toString(),
    'periodo=7d&metrica=emissao&grupo=pais',
  );
  assert.equal(
    escreverAgrupamento(
      new URLSearchParams('periodo=7d&grupo=regiao'),
      'servico',
    ).toString(),
    'periodo=7d',
  );
  assert.equal(AGRUPAMENTOS.servico.rotulo, 'Serviço');
  assert.equal(AGRUPAMENTOS.regiao.rotulo, 'Região');
  assert.equal(AGRUPAMENTOS.pais.rotulo, 'País');
});

test('agrupa o ranking por serviço, região e país somando energia, emissão e coletas', () => {
  const itensParaAgrupar = [
    {
      posicao: 1,
      servicoId: 1,
      nome: 'Auth Service',
      energiaKwh: 0.01,
      emissaoGCo2e: 1,
      coletasValidas: 10,
      regiaoCodigo: 'br-sudeste',
      regiao: 'Brasil · São Paulo',
      pais: 'Brasil',
    },
    {
      posicao: 2,
      servicoId: 2,
      nome: 'Catalog API',
      energiaKwh: 0.02,
      emissaoGCo2e: 2,
      coletasValidas: 15,
      regiaoCodigo: 'br-sudeste',
    },
    {
      posicao: 3,
      servicoId: 3,
      nome: 'Northeast Edge',
      energiaKwh: 0.015,
      emissaoGCo2e: 1.5,
      coletasValidas: 8,
      regiao: 'Brasil · Fortaleza',
    },
    {
      posicao: 4,
      servicoId: 4,
      nome: 'Video Processor',
      energiaKwh: 0.03,
      emissaoGCo2e: 12,
      coletasValidas: 20,
      regiaoCodigo: 'us-east',
      regiao: 'Estados Unidos · Ashburn',
      pais: 'Estados Unidos',
    },
    {
      posicao: 5,
      servicoId: 5,
      nome: 'Email Worker',
      energiaKwh: 0.005,
      emissaoGCo2e: 0.5,
      coletasValidas: 4,
      regiaoCodigo: 'desconhecida',
    },
  ];

  assert.equal(
    agruparItensRanking(itensParaAgrupar, 'servico', 'energia'),
    itensParaAgrupar,
  );

  const porRegiao = agruparItensRanking(itensParaAgrupar, 'regiao', 'emissao');
  assert.deepEqual(
    porRegiao.map((grupo) => ({
      posicao: grupo.posicao,
      nome: grupo.nome,
      energiaKwh: Number(grupo.energiaKwh.toFixed(4)),
      emissaoGCo2e: Number(grupo.emissaoGCo2e.toFixed(4)),
      coletasValidas: grupo.coletasValidas,
      quantidadeServicos: grupo.quantidadeServicos,
    })),
    [
      {
        posicao: 1,
        nome: 'Estados Unidos · Ashburn',
        energiaKwh: 0.03,
        emissaoGCo2e: 12,
        coletasValidas: 20,
        quantidadeServicos: 1,
      },
      {
        posicao: 2,
        nome: 'Brasil · São Paulo',
        energiaKwh: 0.03,
        emissaoGCo2e: 3,
        coletasValidas: 25,
        quantidadeServicos: 2,
      },
      {
        posicao: 3,
        nome: 'Brasil · Fortaleza',
        energiaKwh: 0.015,
        emissaoGCo2e: 1.5,
        coletasValidas: 8,
        quantidadeServicos: 1,
      },
      {
        posicao: 4,
        nome: 'Localização não informada',
        energiaKwh: 0.005,
        emissaoGCo2e: 0.5,
        coletasValidas: 4,
        quantidadeServicos: 1,
      },
    ],
  );

  const porPaisEnergia = agruparItensRanking(
    itensParaAgrupar,
    'pais',
    'energia',
  );
  assert.deepEqual(
    porPaisEnergia.map((grupo) => ({
      posicao: grupo.posicao,
      nome: grupo.nome,
      energiaKwh: Number(grupo.energiaKwh.toFixed(4)),
      emissaoGCo2e: Number(grupo.emissaoGCo2e.toFixed(4)),
      coletasValidas: grupo.coletasValidas,
      quantidadeServicos: grupo.quantidadeServicos,
    })),
    [
      {
        posicao: 1,
        nome: 'Brasil',
        energiaKwh: 0.045,
        emissaoGCo2e: 4.5,
        coletasValidas: 33,
        quantidadeServicos: 3,
      },
      {
        posicao: 2,
        nome: 'Estados Unidos',
        energiaKwh: 0.03,
        emissaoGCo2e: 12,
        coletasValidas: 20,
        quantidadeServicos: 1,
      },
      {
        posicao: 3,
        nome: 'Localização não informada',
        energiaKwh: 0.005,
        emissaoGCo2e: 0.5,
        coletasValidas: 4,
        quantidadeServicos: 1,
      },
    ],
  );

  assert.equal(
    resumoDoRanking(porRegiao, 'emissao', 'regiao'),
    'Estados Unidos · Ashburn lidera em emissão: 12,00 gCO₂e, 70,6% do total das 4 regiões do ranking.',
  );
  assert.equal(
    resumoDoRanking(porPaisEnergia, 'energia', 'pais'),
    'Brasil lidera em energia: 45,00 Wh, 56,3% do total dos 3 países do ranking.',
  );
  assert.equal(
    resumoDoRanking([porRegiao[0]], 'emissao', 'regiao'),
    'Estados Unidos · Ashburn é a única região com coletas no período: 12,00 gCO₂e de emissão.',
  );
  assert.equal(
    nomeDaRegiaoDoItem({ regiaoCodigo: 'eu-central' }),
    'EU Central',
  );
  assert.equal(
    nomeDoPaisDoItem({ regiaoCodigo: 'eu-central' }),
    'Localização não informada',
  );
});
