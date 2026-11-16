import type { MetricaRanking, RespostaRanking } from '../types/ranking';

export const METRICAS: Record<
  MetricaRanking,
  { rotulo: string; nome: string; unidade: string }
> = {
  energia: { rotulo: 'Energia (kWh)', nome: 'energia', unidade: 'kWh' },
  emissao: { rotulo: 'Emissão (gCO₂e)', nome: 'emissão', unidade: 'gCO₂e' },
};

function ehObjeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === 'object' && valor !== null;
}

function ehMetrica(valor: unknown): valor is MetricaRanking {
  return typeof valor === 'string' && Object.hasOwn(METRICAS, valor);
}

function ehNumeroNaoNegativo(valor: unknown) {
  return typeof valor === 'number' && Number.isFinite(valor) && valor >= 0;
}

function ehServico(valor: unknown): valor is Record<string, unknown> {
  return (
    ehObjeto(valor) &&
    Number.isInteger(valor.servicoId) &&
    typeof valor.nome === 'string'
  );
}

function ehItem(valor: unknown) {
  return (
    ehServico(valor) &&
    Number.isInteger(valor.posicao) &&
    ehNumeroNaoNegativo(valor.energiaKwh) &&
    ehNumeroNaoNegativo(valor.emissaoGCo2e) &&
    Number.isInteger(valor.coletasValidas)
  );
}

export function ehRespostaRanking(valor: unknown): valor is RespostaRanking {
  return (
    ehObjeto(valor) &&
    ehObjeto(valor.periodo) &&
    typeof valor.periodo.inicio === 'string' &&
    typeof valor.periodo.fim === 'string' &&
    ehMetrica(valor.metrica) &&
    Array.isArray(valor.itens) &&
    valor.itens.every(ehItem) &&
    Array.isArray(valor.semDados) &&
    valor.semDados.every(ehServico)
  );
}
