import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  META_CARBONO_DEMO,
  calcularResumoMeta,
  formatarKgCo2e,
  formatarPercentualMeta,
  isRespostaMetaCarbono,
} from '../src/utils/metaCarbono.ts';

test('valida o contrato de GET /indicadores/meta e rejeita formatos inválidos', () => {
  assert.equal(isRespostaMetaCarbono(META_CARBONO_DEMO), true);
  assert.equal(
    isRespostaMetaCarbono({
      metaMensal: null,
      acumuladoMes: 0,
      diasDecorridos: 1,
      diasNoMes: 30,
      projecaoMes: 0,
    }),
    true,
  );
  assert.equal(isRespostaMetaCarbono(null), false);
  assert.equal(
    isRespostaMetaCarbono({
      metaMensal: -10,
      acumuladoMes: 5,
      diasDecorridos: 10,
      diasNoMes: 30,
      projecaoMes: 15,
    }),
    false,
  );
  assert.equal(
    isRespostaMetaCarbono({
      metaMensal: 100,
      acumuladoMes: 5,
      diasDecorridos: 31,
      diasNoMes: 30,
      projecaoMes: 15,
    }),
    false,
  );
});

test('calcula percentual consumido, barra e aviso quando a projeção ultrapassa a meta', () => {
  const resumo = calcularResumoMeta({
    metaMensal: 35,
    acumuladoMes: 24.5,
    diasDecorridos: 20,
    diasNoMes: 30,
    projecaoMes: 36.75,
  });

  assert.equal(resumo.temMeta, true);
  assert.equal(resumo.percentualConsumido, 70);
  assert.equal(resumo.percentualBarra, 70);
  assert.equal(resumo.ultrapassouMeta, false);
  assert.equal(resumo.projecaoUltrapassaMeta, true);
  assert.ok(Math.abs(resumo.excessoProjetadoKg - 1.75) < 1e-12);
  assert.equal(resumo.textoProjecao, 'No ritmo atual: 36,75 kgCO₂e este mês');
});

test('trata meta já ultrapassada limitando a barra em 100%', () => {
  const resumo = calcularResumoMeta({
    metaMensal: 100,
    acumuladoMes: 125,
    diasDecorridos: 15,
    diasNoMes: 30,
    projecaoMes: 250,
  });

  assert.equal(resumo.ultrapassouMeta, true);
  assert.equal(resumo.projecaoUltrapassaMeta, true);
  assert.equal(resumo.percentualConsumido, 125);
  assert.equal(resumo.percentualBarra, 100);
});

test('trata ausência de meta exibindo apenas a projeção sem percentual', () => {
  const resumo = calcularResumoMeta({
    metaMensal: null,
    acumuladoMes: 12.5,
    diasDecorridos: 10,
    diasNoMes: 30,
    projecaoMes: 37.5,
  });

  assert.equal(resumo.temMeta, false);
  assert.equal(resumo.percentualConsumido, null);
  assert.equal(resumo.ultrapassouMeta, false);
  assert.equal(resumo.projecaoUltrapassaMeta, false);
  assert.equal(resumo.textoProjecao, 'No ritmo atual: 37,50 kgCO₂e este mês');
});

test('formata kgCO2e e percentuais em pt-BR', () => {
  assert.equal(formatarKgCo2e(120.25), '120,25 kgCO₂e');
  assert.equal(formatarKgCo2e(0.004), '0,004 kgCO₂e');
  assert.equal(formatarPercentualMeta(70), '70,0%');
});
