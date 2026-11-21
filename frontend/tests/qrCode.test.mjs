import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  ehModoDemo,
  formatarUrlLegivel,
  resolverUrlDemoPublica,
  URL_DEMO_PADRAO,
} from '../src/utils/modoDemo.ts';
import {
  calcularBitsFormatoM,
  calcularBitsVersao,
  calcularReedSolomon,
  gerarMatrizQr,
  gerarPathQr,
} from '../src/utils/qrCode.ts';

test('calcula bits de formato ECC M exatamente conforme ISO/IEC 18004 Tabela C.1', () => {
  const esperados = [
    0x5412, 0x5125, 0x5e7c, 0x5b4b, 0x45f9, 0x40ce, 0x4f97, 0x4aa0,
  ];
  esperados.forEach((esperado, mascara) => {
    assert.equal(calcularBitsFormatoM(mascara), esperado);
  });
});

test('calcula bits de versão BCH(18,6) exatamente conforme ISO/IEC 18004 Tabela D.1', () => {
  assert.equal(calcularBitsVersao(7), 0x07c94);
  assert.equal(calcularBitsVersao(8), 0x085bc);
  assert.equal(calcularBitsVersao(9), 0x09a99);
  assert.equal(calcularBitsVersao(10), 0x0a4d3);
});

test('calcula bytes Reed-Solomon exatamente conforme vetor de referência ISO/IEC 18004 Anexo I', () => {
  const dados = Uint8Array.from([
    32, 91, 11, 120, 209, 114, 220, 77, 67, 64, 236, 17, 236, 17, 236, 17,
  ]);
  const ec = calcularReedSolomon(dados, 10);
  assert.deepEqual([...ec], [196, 35, 39, 119, 235, 215, 231, 226, 93, 23]);
});

test('gera matriz QR válida para a URL da demonstração com padrões de busca, sincronização e caminho SVG', () => {
  const matriz = gerarMatrizQr(URL_DEMO_PADRAO);

  assert.equal(matriz.versao, 4);
  assert.equal(matriz.tamanho, 33);

  // Canto superior esquerdo (7x7 finder): borda escura e miolo 3x3 escuro
  assert.equal(matriz.modulos[0][0], true);
  assert.equal(matriz.modulos[0][6], true);
  assert.equal(matriz.modulos[1][1], false);
  assert.equal(matriz.modulos[3][3], true);

  // Módulo escuro fixo (4*V + 9, 8)
  assert.equal(matriz.modulos[4 * matriz.versao + 9][8], true);

  // Padrão de sincronização na linha 6
  assert.equal(matriz.modulos[6][8], true);
  assert.equal(matriz.modulos[6][9], false);
  assert.equal(matriz.modulos[6][10], true);

  const path = gerarPathQr(matriz, 4);
  assert.ok(path.startsWith('M4 4h7v1h-7z'));
  assert.ok(path.length > 200);
});

test('resolve URL pública da demonstração e modo demo com fallback seguro', () => {
  assert.equal(resolverUrlDemoPublica(''), URL_DEMO_PADRAO);
  assert.equal(resolverUrlDemoPublica('javascript:alert(1)'), URL_DEMO_PADRAO);
  assert.equal(
    resolverUrlDemoPublica(
      'https://abpundefined.github.io/3DSM-ABP-UNDEFINED//',
    ),
    'https://abpundefined.github.io/3DSM-ABP-UNDEFINED/',
  );
  assert.equal(
    formatarUrlLegivel(URL_DEMO_PADRAO),
    'abpundefined.github.io/3DSM-ABP-UNDEFINED',
  );

  assert.equal(ehModoDemo(new URLSearchParams('demo=1')), true);
  assert.equal(ehModoDemo(new URLSearchParams('')), false);
});
