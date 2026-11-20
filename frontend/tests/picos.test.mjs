import test from 'node:test';
import assert from 'node:assert/strict';
import {
  detectarPicosIncomuns,
  formatarAnotacaoPico,
  MINIMO_PONTOS_PICO,
  MULTIPLICADOR_DESVIO_PICO,
} from '../src/utils/picos.ts';

function criarSerieHoraria(valores) {
  const base = Date.parse('2026-11-15T05:00:00.000Z'); // 02h em São Paulo
  return valores.map((valor, index) => ({
    inicio: new Date(base + index * 60 * 60 * 1000).toISOString(),
    valor,
  }));
}

test('constantes oficiais exigem mínimo de 12 pontos e limiar de média + 3 desvios-padrão', () => {
  assert.equal(MINIMO_PONTOS_PICO, 12);
  assert.equal(MULTIPLICADOR_DESVIO_PICO, 3);
});

test('série sem pico (valores regulares) não marca nenhum ponto', () => {
  const serie = criarSerieHoraria([
    10, 12, 11, 13, 9, 10, 12, 11, 10, 14, 11, 12, 10, 13, 11,
  ]);
  const resumo = detectarPicosIncomuns(serie, true);

  assert.equal(resumo.pontosValidos, 15);
  assert.ok(resumo.media !== null && resumo.desvioPadrao !== null);
  assert.ok(resumo.limiar !== null && resumo.limiar > resumo.media);
  assert.deepEqual(resumo.picos, []);
});

test('série com um pico acima de média + 3 desvios-padrão marca o ponto com anotação de horário', () => {
  // Índice 12 corresponde a 2026-11-15T17:00:00.000Z = 14h em America/Sao_Paulo
  const valores = [10, 10, 11, 10, 9, 10, 11, 10, 10, 11, 10, 10, 500, 10, 11];
  const serie = criarSerieHoraria(valores);
  const resumo = detectarPicosIncomuns(serie, true);

  assert.equal(resumo.pontosValidos, 15);
  assert.equal(resumo.picos.length, 1);
  assert.equal(resumo.picos[0].indice, 12);
  assert.equal(resumo.picos[0].valor, 500);
  assert.equal(resumo.picos[0].anotacao, 'pico incomum às 14h');
  assert.ok(resumo.picos[0].desviosAcimaDaMedia > 3);
});

test('série curta (menos de 12 pontos válidos) não marca picos mesmo com outlier extremo', () => {
  const curta = criarSerieHoraria([
    10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 9999,
  ]);
  const resumoCurta = detectarPicosIncomuns(curta, true);
  assert.equal(resumoCurta.pontosValidos, 11);
  assert.equal(resumoCurta.media, null);
  assert.equal(resumoCurta.limiar, null);
  assert.deepEqual(resumoCurta.picos, []);

  // Com nulos, apenas 11 pontos válidos -> ainda abaixo do mínimo de 12
  const comNulos = criarSerieHoraria([
    10,
    null,
    10,
    10,
    10,
    10,
    10,
    10,
    10,
    10,
    10,
    9999,
  ]);
  const resumoComNulos = detectarPicosIncomuns(comNulos, true);
  assert.equal(resumoComNulos.pontosValidos, 11);
  assert.deepEqual(resumoComNulos.picos, []);
});

test('série constante (desvio-padrão zero) nunca marca picos', () => {
  const constante = criarSerieHoraria(Array.from({ length: 16 }, () => 42));
  const resumo = detectarPicosIncomuns(constante, true);

  assert.equal(resumo.pontosValidos, 16);
  assert.equal(resumo.media, 42);
  assert.equal(resumo.desvioPadrao, 0);
  assert.deepEqual(resumo.picos, []);
});

test('formata anotações para granularidade horária e diária no fuso de São Paulo', () => {
  assert.equal(
    formatarAnotacaoPico('2026-11-15T17:00:00.000Z', true),
    'pico incomum às 14h',
  );
  assert.equal(
    formatarAnotacaoPico('2026-11-15T17:30:00.000Z', true),
    'pico incomum às 14h30',
  );
  assert.equal(
    formatarAnotacaoPico('2026-11-15T17:00:00.000Z', false),
    'pico incomum em 15/11',
  );
});
