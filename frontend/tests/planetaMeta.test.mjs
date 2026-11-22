import test from 'node:test';
import assert from 'node:assert/strict';
import {
  descreverPlanetaMeta,
  resolverEstadoPlanetaMeta,
  rotuloEstadoPlaneta,
} from '../src/utils/planetaMeta.ts';

test('classifica corretamente os três estados do planeta conforme o consumo e projeção da meta', () => {
  assert.equal(
    resolverEstadoPlanetaMeta({
      percentualConsumido: 45,
      ultrapassouMeta: false,
      projecaoUltrapassaMeta: false,
    }),
    'abaixo',
  );

  assert.equal(
    resolverEstadoPlanetaMeta({
      percentualConsumido: 82,
      ultrapassouMeta: false,
      projecaoUltrapassaMeta: false,
    }),
    'perto',
  );

  assert.equal(
    resolverEstadoPlanetaMeta({
      percentualConsumido: 65,
      ultrapassouMeta: false,
      projecaoUltrapassaMeta: true,
    }),
    'perto',
  );

  assert.equal(
    resolverEstadoPlanetaMeta({
      percentualConsumido: 112,
      ultrapassouMeta: true,
      projecaoUltrapassaMeta: true,
    }),
    'acima',
  );
});

test('gera texto alternativo com estado e percentual formatado em português', () => {
  assert.equal(rotuloEstadoPlaneta('abaixo'), 'Abaixo da meta');
  assert.equal(rotuloEstadoPlaneta('perto'), 'Perto da meta');
  assert.equal(rotuloEstadoPlaneta('acima'), 'Acima da meta');

  assert.equal(
    descreverPlanetaMeta('abaixo', 42.5),
    'Planeta florescendo: abaixo da meta de carbono (42,5% da meta utilizada).',
  );
  assert.equal(
    descreverPlanetaMeta('perto', 85),
    'Planeta em atenção: perto da meta de carbono (85,0% da meta utilizada).',
  );
  assert.equal(
    descreverPlanetaMeta('acima', 115.2),
    'Planeta murcho: acima da meta de carbono (115,2% da meta utilizada).',
  );
});
