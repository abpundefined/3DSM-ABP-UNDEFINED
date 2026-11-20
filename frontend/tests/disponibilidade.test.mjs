import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calcularDisponibilidadePercentual,
  construirResumoDisponibilidade,
  determinarEstadoPredominante,
  formatarHorarioIntervalo,
  formatarPercentualDisponibilidade,
} from '../src/utils/disponibilidade.ts';

test('determina estado predominante por contagem e prioriza o mais crítico no empate', () => {
  assert.equal(determinarEstadoPredominante(0, 0, 0), 'semDados');
  assert.equal(determinarEstadoPredominante(10, 2, 1), 'ativo');
  assert.equal(determinarEstadoPredominante(2, 8, 1), 'indisponivel');
  assert.equal(determinarEstadoPredominante(1, 2, 7), 'semMetricas');
  // Empates priorizam indisponivel > semMetricas > ativo
  assert.equal(determinarEstadoPredominante(5, 5, 0), 'indisponivel');
  assert.equal(determinarEstadoPredominante(0, 4, 4), 'indisponivel');
  assert.equal(determinarEstadoPredominante(5, 0, 5), 'semMetricas');
});

test('calcula disponibilidade percentual tratando 0%, 100%, 99,2%, ausência de coletas e quase 100%', () => {
  assert.equal(calcularDisponibilidadePercentual(0, 0), null);
  assert.equal(calcularDisponibilidadePercentual(0, 50), 0);
  assert.equal(calcularDisponibilidadePercentual(120, 120), 100);
  assert.equal(calcularDisponibilidadePercentual(992, 1000), 99.2);
  // Não arredonda para 100% quando houve falha real no período
  assert.equal(calcularDisponibilidadePercentual(9999, 10000), 99.9);
  assert.equal(formatarPercentualDisponibilidade(99.2), '99,2% disponível');
  assert.equal(formatarPercentualDisponibilidade(100), '100% disponível');
  assert.equal(formatarPercentualDisponibilidade(0), '0% disponível');
  assert.equal(
    formatarPercentualDisponibilidade(null),
    'Sem coletas no período',
  );
});

test('formata horário do intervalo no fuso de São Paulo para granularidade horária e diária', () => {
  const horario = formatarHorarioIntervalo('2026-11-15T14:00:00.000Z', true);
  assert.equal(horario.curto, '15/11, 11:00');
  assert.equal(horario.completo, '15/11/2026, 11:00 – 12:00');

  const diario = formatarHorarioIntervalo('2026-11-15T03:00:00.000Z', false);
  assert.equal(diario.curto, '15/11');
  assert.equal(diario.completo, '15/11/2026');
});

test('monta resumo completo da linha do tempo com contagens, disponibilidade e tooltips', () => {
  const resumo = construirResumoDisponibilidade([
    {
      inicio: '2026-11-15T13:00:00.000Z',
      coletas: 500,
      ativo: 500,
      indisponivel: 0,
      semMetricas: 0,
    },
    {
      inicio: '2026-11-15T14:00:00.000Z',
      coletas: 500,
      ativo: 492,
      indisponivel: 5,
      semMetricas: 3,
    },
    {
      inicio: '2026-11-15T15:00:00.000Z',
      coletas: null,
      ativo: 0,
      indisponivel: 0,
      semMetricas: 0,
    },
  ]);

  assert.equal(resumo.possuiColetas, true);
  assert.equal(resumo.possuiIntervalosSemColetas, true);
  assert.equal(resumo.totalAtivo, 992);
  assert.equal(resumo.totalIndisponivel, 5);
  assert.equal(resumo.totalSemMetricas, 3);
  assert.equal(resumo.totalColetas, 1000);
  assert.equal(resumo.disponibilidadePercentual, 99.2);
  assert.equal(resumo.textoDisponibilidade, '99,2% disponível');
  assert.deepEqual(resumo.contagemIntervalosPorEstado, {
    ativo: 2,
    indisponivel: 0,
    semMetricas: 0,
    semDados: 1,
  });
  assert.equal(resumo.segmentos[1].estadoPredominante, 'ativo');
  assert.match(
    resumo.segmentos[1].resumoTooltip,
    /15\/11\/2026, 11:00 – 12:00 — Estado predominante: Ativo \(492 ativas, 5 indisponíveis, 3 sem métricas\)/,
  );
  assert.equal(resumo.segmentos[2].estadoPredominante, 'semDados');
  assert.match(resumo.segmentos[2].resumoTooltip, /nenhuma coleta registrada/);
});

test('mantém disponibilidade ausente quando nenhum intervalo possui coletas', () => {
  const resumo = construirResumoDisponibilidade([
    { inicio: '2026-11-15T13:00:00.000Z' },
    { inicio: '2026-11-15T14:00:00.000Z', ativo: 0, indisponivel: 0 },
  ]);

  assert.equal(resumo.possuiColetas, false);
  assert.equal(resumo.disponibilidadePercentual, null);
  assert.equal(resumo.textoDisponibilidade, 'Sem coletas no período');
});
