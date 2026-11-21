import assert from 'node:assert/strict';
import { test } from 'node:test';
import { oportunidadesDemo } from '../src/mocks/oportunidades.ts';
import {
  ehRespostaOportunidades,
  filtrarOportunidadesPorTipo,
  formatarEconomiaPercentual,
  rotuloTipoOportunidade,
} from '../src/utils/oportunidades.ts';
import { normalizarConsultaOportunidades } from '../src/services/oportunidades.ts';

test('normaliza consulta de período sem duplicar interrogação', () => {
  assert.equal(normalizarConsultaOportunidades(''), '');
  assert.equal(normalizarConsultaOportunidades('?periodo=24h'), '?periodo=24h');
  assert.equal(normalizarConsultaOportunidades('periodo=7d'), '?periodo=7d');
});

test('valida resposta no formato GET /oportunidades e rejeita formatos inválidos', () => {
  assert.equal(ehRespostaOportunidades(oportunidadesDemo), true);
  assert.equal(ehRespostaOportunidades(null), false);
  assert.equal(
    ehRespostaOportunidades({
      ...oportunidadesDemo,
      oportunidades: 'invalido',
    }),
    false,
  );
  assert.equal(
    ehRespostaOportunidades({
      ...oportunidadesDemo,
      oportunidades: [{ ...oportunidadesDemo.oportunidades[0], tipo: 'OUTRO' }],
    }),
    false,
  );
});

test('filtra oportunidades por tipo mantendo a ordem por economia', () => {
  const todas = filtrarOportunidadesPorTipo(
    oportunidadesDemo.oportunidades,
    'TODOS',
  );
  assert.equal(todas.length, oportunidadesDemo.oportunidades.length);

  const migracoes = filtrarOportunidadesPorTipo(
    oportunidadesDemo.oportunidades,
    'MIGRAR_REGIAO',
  );
  assert.equal(migracoes.length, 2);
  assert.ok(
    migracoes[0].economiaEstimadaGCo2e >= migracoes[1].economiaEstimadaGCo2e,
  );

  const superdim = filtrarOportunidadesPorTipo(
    oportunidadesDemo.oportunidades,
    'SUPERDIMENSIONAMENTO',
  );
  assert.equal(superdim.length, 1);
  assert.equal(superdim[0].servicoNome, 'Search API');
});

test('formata rótulos e percentual de economia em pt-BR', () => {
  assert.equal(rotuloTipoOportunidade('MIGRAR_REGIAO'), 'Migrar de região');
  assert.equal(
    rotuloTipoOportunidade('SUPERDIMENSIONAMENTO'),
    'Superdimensionamento',
  );
  assert.equal(rotuloTipoOportunidade('MUDAR_HORARIO'), 'Mudar horário');
  assert.equal(formatarEconomiaPercentual(89.3), '−89,3%');
  assert.equal(formatarEconomiaPercentual(30), '−30,0%');
});
