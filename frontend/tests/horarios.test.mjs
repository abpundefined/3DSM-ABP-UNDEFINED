import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  celulasDaJanela,
  contarSemAmostras,
  criarEscalaDeIntensidade,
  criarLegendaDeIntensidade,
  descreverCelula,
  descreverJanela,
  ehRespostaHorarios,
  mediaDaSemana,
  resumoDaMelhorJanela,
} from '../src/utils/horarios.ts';

const SEM_AMOSTRAS = { media: null, quantidadeAmostras: null };

function matrizCom(preenchimento = SEM_AMOSTRAS, ajustes = {}) {
  const matriz = Array.from({ length: 7 }, () =>
    Array.from({ length: 24 }, () => ({ ...preenchimento })),
  );
  for (const [chave, celula] of Object.entries(ajustes)) {
    const [dia, hora] = chave.split('-').map(Number);
    matriz[dia][hora] = celula;
  }
  return matriz;
}

function resposta(sobrescritas = {}) {
  return {
    fusoHorario: 'America/Sao_Paulo',
    matriz: matrizCom({ media: 100, quantidadeAmostras: 4 }),
    melhorJanela: { diaSemana: 1, horaInicio: 2, mediaJanela: 100 },
    ...sobrescritas,
  };
}

test('accepts the GET /intensidade/horarios contract', () => {
  assert.equal(ehRespostaHorarios(resposta()), true);
  assert.equal(ehRespostaHorarios(resposta({ melhorJanela: null })), true);
  assert.equal(ehRespostaHorarios(resposta({ matriz: matrizCom() })), true);
});

test('rejects a response outside the contract', () => {
  assert.equal(ehRespostaHorarios(null), false);
  assert.equal(ehRespostaHorarios(resposta({ fusoHorario: undefined })), false);
  assert.equal(
    ehRespostaHorarios(resposta({ matriz: matrizCom().slice(1) })),
    false,
  );
  assert.equal(
    ehRespostaHorarios(
      resposta({ matriz: matrizCom().map((dia) => dia.slice(1)) }),
    ),
    false,
  );
  assert.equal(
    ehRespostaHorarios(
      resposta({
        matriz: matrizCom(SEM_AMOSTRAS, {
          '0-0': { media: -1, quantidadeAmostras: 2 },
        }),
      }),
    ),
    false,
  );
  assert.equal(
    ehRespostaHorarios(
      resposta({
        matriz: matrizCom(SEM_AMOSTRAS, {
          '0-0': { media: 10, quantidadeAmostras: 1.5 },
        }),
      }),
    ),
    false,
  );
  assert.equal(
    ehRespostaHorarios(
      resposta({
        melhorJanela: { diaSemana: 7, horaInicio: 0, mediaJanela: 1 },
      }),
    ),
    false,
  );
  assert.equal(
    ehRespostaHorarios(
      resposta({
        melhorJanela: { diaSemana: 0, horaInicio: 24, mediaJanela: 1 },
      }),
    ),
    false,
  );
});

test('counts the hours without samples and weights the weekly mean', () => {
  const matriz = matrizCom(SEM_AMOSTRAS, {
    '0-0': { media: 100, quantidadeAmostras: 1 },
    '0-1': { media: 200, quantidadeAmostras: 3 },
    '0-2': { media: 50, quantidadeAmostras: 0 },
  });

  assert.equal(contarSemAmostras(matriz), 7 * 24 - 2);
  assert.equal(mediaDaSemana(matriz), 175);
  assert.equal(mediaDaSemana(matrizCom()), null);
});

test('splits the observed range into five equal bands', () => {
  const matriz = matrizCom(SEM_AMOSTRAS, {
    '0-0': { media: 100, quantidadeAmostras: 1 },
    '0-1': { media: 200, quantidadeAmostras: 1 },
  });
  const escala = criarEscalaDeIntensidade(matriz);

  assert.equal(escala.minimo, 100);
  assert.equal(escala.maximo, 200);
  assert.equal(escala.faixa(100), 1);
  assert.equal(escala.faixa(119.9), 1);
  assert.equal(escala.faixa(120), 2);
  assert.equal(escala.faixa(199.9), 5);
  assert.equal(escala.faixa(200), 5);
  assert.equal(escala.faixa(null), null);
  assert.deepEqual(
    criarLegendaDeIntensidade(escala).map(({ rotulo }) => rotulo),
    ['100 a 120', '120 a 140', '140 a 160', '160 a 180', '180 a 200'],
  );
});

test('keeps a single band when every hour has the same intensity', () => {
  const escala = criarEscalaDeIntensidade(
    matrizCom({ media: 90, quantidadeAmostras: 2 }),
  );

  assert.equal(escala.faixa(90), 1);
  assert.deepEqual(criarLegendaDeIntensidade(escala), [
    { faixa: 1, rotulo: '90' },
  ]);
});

test('has no scale when no hour has samples', () => {
  assert.equal(criarEscalaDeIntensidade(matrizCom()), null);
});

test('the best window wraps past midnight and past the end of the week', () => {
  assert.deepEqual(
    celulasDaJanela({ diaSemana: 2, horaInicio: 22, mediaJanela: 1 }),
    [
      { dia: 2, hora: 22 },
      { dia: 2, hora: 23 },
      { dia: 3, hora: 0 },
    ],
  );
  assert.deepEqual(
    celulasDaJanela({ diaSemana: 6, horaInicio: 23, mediaJanela: 1 }),
    [
      { dia: 6, hora: 23 },
      { dia: 0, hora: 0 },
      { dia: 0, hora: 1 },
    ],
  );
});

test('describes the window inside a day and across midnight', () => {
  assert.equal(
    descreverJanela({ diaSemana: 0, horaInicio: 2, mediaJanela: 1 }),
    'domingo, 02h–05h',
  );
  assert.equal(
    descreverJanela({ diaSemana: 1, horaInicio: 21, mediaJanela: 1 }),
    'segunda-feira, 21h–00h',
  );
  assert.equal(
    descreverJanela({ diaSemana: 1, horaInicio: 22, mediaJanela: 1 }),
    'segunda-feira, 22h até terça-feira, 01h',
  );
  assert.equal(
    descreverJanela({ diaSemana: 6, horaInicio: 23, mediaJanela: 1 }),
    'sábado, 23h até domingo, 02h',
  );
});

test('describes a cell with and without samples', () => {
  assert.equal(
    descreverCelula(1, 14, { media: 98.26, quantidadeAmostras: 12 }),
    'segunda-feira, 14h: 98,3 gCO₂e/kWh, 12 amostras',
  );
  assert.equal(
    descreverCelula(1, 14, { media: 98, quantidadeAmostras: 1 }),
    'segunda-feira, 14h: 98 gCO₂e/kWh, 1 amostra',
  );
  assert.equal(
    descreverCelula(3, 0, SEM_AMOSTRAS),
    'quarta-feira, 00h: sem amostras no período',
  );
});

test('summarizes the best window with the region and the drop from the mean', () => {
  const matriz = matrizCom(
    { media: 200, quantidadeAmostras: 2 },
    {
      '1-2': { media: 100, quantidadeAmostras: 2 },
    },
  );
  const dados = resposta({
    matriz,
    melhorJanela: { diaSemana: 1, horaInicio: 2, mediaJanela: 100 },
  });

  assert.equal(
    resumoDaMelhorJanela(dados, 'Estados Unidos (Virgínia)'),
    'Melhor horário para processamentos pesados em Estados Unidos (Virgínia): segunda-feira, 02h–05h, com média de 100 gCO₂e/kWh, 50% abaixo da média do período.',
  );
  assert.match(
    resumoDaMelhorJanela(dados, null),
    /^Melhor horário para processamentos pesados: segunda-feira/,
  );
});

test('omits the comparison when the window is not clearly better than the mean', () => {
  assert.equal(
    resumoDaMelhorJanela(resposta(), null),
    'Melhor horário para processamentos pesados: segunda-feira, 02h–05h, com média de 100 gCO₂e/kWh.',
  );
});

test('has no summary without a best window', () => {
  assert.equal(
    resumoDaMelhorJanela(resposta({ melhorJanela: null }), null),
    null,
  );
});
