import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calcularDeslocamentoFlip,
  DURACAO_CONTADOR_MS,
  easeOutCubic,
  extrairNumeroFormatado,
  formatarNumeroAnimado,
  interpolarValor,
} from '../src/utils/animacao.ts';

test('duração padrão do contador respeita o limite máximo de 600 ms', () => {
  assert.ok(DURACAO_CONTADOR_MS > 0 && DURACAO_CONTADOR_MS <= 600);
});

test('easeOutCubic e interpolarValor progridem suavemente de 0 a 1 sem extrapolar', () => {
  assert.equal(easeOutCubic(0), 0);
  assert.equal(easeOutCubic(1), 1);
  assert.equal(easeOutCubic(-0.5), 0);
  assert.equal(easeOutCubic(2), 1);
  assert.ok(easeOutCubic(0.5) > 0.5 && easeOutCubic(0.5) < 1);

  assert.equal(interpolarValor(0, 100, 0), 0);
  assert.equal(interpolarValor(0, 100, 1), 100);
  assert.ok(interpolarValor(0, 100, 0.5) > 50);
});

test('extrairNumeroFormatado reconhece números pt-BR com milhar e decimais e ignora ausências', () => {
  assert.deepEqual(extrairNumeroFormatado('2,50'), {
    valor: 2.5,
    casasDecimais: 2,
  });
  assert.deepEqual(extrairNumeroFormatado('1.250'), {
    valor: 1250,
    casasDecimais: 0,
  });
  assert.deepEqual(extrairNumeroFormatado('0,00'), {
    valor: 0,
    casasDecimais: 2,
  });
  assert.equal(extrairNumeroFormatado('—'), null);
  assert.equal(extrairNumeroFormatado('< 0,01'), null);
  assert.equal(formatarNumeroAnimado(1250.4, 2), '1.250,40');
  assert.equal(formatarNumeroAnimado(42, 0), '42');
});

test('calcularDeslocamentoFlip retorna delta quando há movimento e null quando permanece no lugar', () => {
  assert.deepEqual(
    calcularDeslocamentoFlip({ left: 100, top: 200 }, { left: 100, top: 320 }),
    { dx: 0, dy: -120 },
  );
  assert.equal(
    calcularDeslocamentoFlip({ left: 10, top: 20 }, { left: 10.4, top: 20.2 }),
    null,
  );
});
