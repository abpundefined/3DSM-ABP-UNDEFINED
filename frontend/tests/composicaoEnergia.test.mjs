import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  COMPONENTES_ENERGIA,
  calcularComponentesPorMetricas,
  calcularComposicaoEnergia,
  formatarPercentualComposicao,
  formatarWatts,
  isComponentesEnergia,
  mediarComponentes,
  resolverComposicaoServico,
  somarComponentes,
} from '../src/utils/composicaoEnergia.ts';

test('mantém ordem e cores fixas para os quatro componentes em todo o app', () => {
  assert.deepEqual(
    COMPONENTES_ENERGIA.map(({ chave, nome, cor }) => ({ chave, nome, cor })),
    [
      { chave: 'cpu', nome: 'CPU', cor: 'var(--serie-0)' },
      { chave: 'memoria', nome: 'Memória', cor: 'var(--serie-1)' },
      { chave: 'disco', nome: 'Disco', cor: 'var(--serie-2)' },
      { chave: 'rede', nome: 'Rede', cor: 'var(--serie-3)' },
    ],
  );
});

test('calcula percentuais, total e frase resumo com o componente dominante', () => {
  const resumo = calcularComposicaoEnergia({
    cpuW: 0.78,
    memoriaW: 0.12,
    discoW: 0.06,
    redeW: 0.04,
    totalW: 1,
  });

  assert.ok(resumo);
  assert.equal(resumo.possuiConsumo, true);
  assert.ok(Math.abs(resumo.totalW - 1) < 1e-12);
  assert.equal(resumo.principal?.chave, 'cpu');
  assert.equal(resumo.fraseResumo, 'CPU responde por 78% do consumo.');
  assert.deepEqual(
    resumo.itens.map((item) => Math.round(item.percentual)),
    [78, 12, 6, 4],
  );
});

test('trata consumo zerado sem divisão por zero e rejeita payloads inválidos', () => {
  const zerado = calcularComposicaoEnergia({
    cpuW: 0,
    memoriaW: 0,
    discoW: 0,
    redeW: 0,
    totalW: 0,
  });

  assert.ok(zerado);
  assert.equal(zerado.possuiConsumo, false);
  assert.equal(zerado.principal, null);
  assert.deepEqual(
    zerado.itens.map((item) => item.percentual),
    [0, 0, 0, 0],
  );

  assert.equal(calcularComposicaoEnergia(null), null);
  assert.equal(
    isComponentesEnergia({
      cpuW: -0.1,
      memoriaW: 1,
      discoW: 0.1,
      redeW: 0.1,
      totalW: 1.1,
    }),
    false,
  );
});

test('soma componentes de vários serviços ignorando serviços sem dados', () => {
  const soma = somarComponentes([
    { cpuW: 0.25, memoriaW: 0.75, discoW: 0.1, redeW: 0.1, totalW: 1.2 },
    null,
    undefined,
    { cpuW: 0.15, memoriaW: 0.25, discoW: 0.05, redeW: 0.05, totalW: 0.5 },
  ]);

  assert.ok(soma);
  assert.ok(Math.abs(soma.cpuW - 0.4) < 1e-12);
  assert.ok(Math.abs(soma.memoriaW - 1.0) < 1e-12);
  assert.ok(Math.abs(soma.discoW - 0.15) < 1e-12);
  assert.ok(Math.abs(soma.redeW - 0.15) < 1e-12);
  assert.ok(Math.abs(soma.totalW - 1.7) < 1e-12);
  assert.equal(somarComponentes([null, undefined]), null);
});

test('calcula média dos intervalos do histórico e usa fallback do serviço quando necessário', () => {
  const media = mediarComponentes([
    { cpuW: 0.2, memoriaW: 0.6, discoW: 0.1, redeW: 0.1, totalW: 1.0 },
    null,
    { cpuW: 0.4, memoriaW: 1.0, discoW: 0.3, redeW: 0.3, totalW: 2.0 },
  ]);

  assert.ok(media);
  assert.ok(Math.abs(media.cpuW - 0.3) < 1e-12);
  assert.ok(Math.abs(media.memoriaW - 0.8) < 1e-12);
  assert.ok(Math.abs(media.totalW - 1.5) < 1e-12);

  const fallback = {
    cpuW: 0.1,
    memoriaW: 0.4,
    discoW: 0.05,
    redeW: 0.05,
    totalW: 0.6,
  };
  assert.deepEqual(
    resolverComposicaoServico([{ componentes: null }], fallback),
    fallback,
  );
  assert.equal(resolverComposicaoServico([{ componentes: null }], null), null);
});

test('calcula componentes a partir das métricas usando os fatores oficiais e formata valores', () => {
  const componentes = calcularComponentesPorMetricas({
    cpuPercent: 50,
    memoryGb: 2,
    diskGb: 10,
    networkGb: 5,
  });

  assert.ok(Math.abs(componentes.cpuW - 0.25) < 1e-12);
  assert.ok(Math.abs(componentes.memoriaW - 0.75) < 1e-12);
  assert.ok(Math.abs(componentes.discoW - 0.1) < 1e-12);
  assert.ok(Math.abs(componentes.redeW - 0.1) < 1e-12);
  assert.ok(Math.abs(componentes.totalW - 1.2) < 1e-12);

  assert.equal(formatarWatts(1.2), '1,20 W');
  assert.equal(formatarWatts(0.004), '0,004 W');
  assert.equal(formatarPercentualComposicao(62.5), '62,5%');
});
