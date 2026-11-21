import test from 'node:test';
import assert from 'node:assert/strict';
import {
  avaliarDesempenhoLento,
  calcularEstadoPulso,
  detectarSuporteWebgl,
  gerarMalhaEsfera,
  projetarPonto3d,
} from '../src/utils/globo3dTv.ts';

test('detecta suporte a WebGL e faz fallback seguro quando indisponível ou com erro', () => {
  assert.equal(
    detectarSuporteWebgl(() => null),
    false,
  );
  assert.equal(
    detectarSuporteWebgl(() => ({ getContext: () => null })),
    false,
  );
  assert.equal(
    detectarSuporteWebgl(() => ({
      getContext: () => {
        throw new Error('WebGL desabilitado');
      },
    })),
    false,
  );
  assert.equal(
    detectarSuporteWebgl(() => ({
      getContext: (tipo) => (tipo === 'webgl' ? {} : null),
    })),
    true,
  );
});

test('identifica desempenho lento apenas após sequência consecutiva de quadros acima do limite', () => {
  assert.equal(avaliarDesempenhoLento([16, 17, 80, 16, 80, 80]), false);
  assert.equal(avaliarDesempenhoLento([80, 80, 80, 80, 80, 80, 80]), false);
  assert.equal(
    avaliarDesempenhoLento([16, 70, 75, 80, 90, 85, 72, 68, 71]),
    true,
  );
});

test('projeta coordenadas 3D separando hemisfério visível e oculto', () => {
  const frente = projetarPonto3d(0, 0, 0, 0, 200, 250, 250);
  assert.equal(frente.visivel, true);
  assert.equal(Math.round(frente.x), 250);
  assert.equal(Math.round(frente.y), 250);

  const verso = projetarPonto3d(0, 180, 0, 0, 200, 250, 250);
  assert.equal(verso.visivel, false);
});

test('calcula pulso proporcional à faixa de emissão e desliga com movimento reduzido', () => {
  const reduzido = calcularEstadoPulso(5, 0.4, true);
  assert.deepEqual(reduzido, { escala: 1, opacidade: 0 });

  const semDados = calcularEstadoPulso(null, 0.4, false);
  assert.deepEqual(semDados, { escala: 1, opacidade: 0 });

  const ativo = calcularEstadoPulso(4, 0.25, false);
  assert.ok(ativo.escala > 1);
  assert.ok(ativo.opacidade > 0);
});

test('gera malha esférica válida com vértices, normais, UVs e índices', () => {
  const malha = gerarMalhaEsfera(8, 12);
  assert.equal(malha.posicoes.length, 9 * 13 * 3);
  assert.equal(malha.normais.length, malha.posicoes.length);
  assert.equal(malha.uvs.length, 9 * 13 * 2);
  assert.equal(malha.indices.length, 8 * 12 * 6);
});
