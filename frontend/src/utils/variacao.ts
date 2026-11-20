import type { PeriodoConsultado } from '../types/mapa';
import type { VariacaoPercentual } from '../types/variacao';

export function ehNumeroOuNulo(valor: unknown): valor is number | null {
  return (
    valor === null || (typeof valor === 'number' && Number.isFinite(valor))
  );
}

export function ehVariacaoPercentual(
  valor: unknown,
): valor is VariacaoPercentual {
  return (
    typeof valor === 'object' &&
    valor !== null &&
    'energiaKwh' in valor &&
    ehNumeroOuNulo(valor.energiaKwh) &&
    'emissaoGCo2e' in valor &&
    ehNumeroOuNulo(valor.emissaoGCo2e)
  );
}

export function ehPeriodoConsultado(
  valor: unknown,
): valor is PeriodoConsultado {
  return (
    typeof valor === 'object' &&
    valor !== null &&
    'inicio' in valor &&
    typeof valor.inicio === 'string' &&
    'fim' in valor &&
    typeof valor.fim === 'string' &&
    Number.isFinite(Date.parse(valor.inicio)) &&
    Number.isFinite(Date.parse(valor.fim)) &&
    Date.parse(valor.fim) > Date.parse(valor.inicio)
  );
}

const numero = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 });

export function descreverJanelaAnterior({ inicio, fim }: PeriodoConsultado) {
  const segundos = (Date.parse(fim) - Date.parse(inicio) + 1) / 1000;
  if (segundos >= 86_399.999) {
    const dias = numero.format(segundos / 86_400);
    return dias === '1' ? 'ao dia anterior' : `aos ${dias} dias anteriores`;
  }
  if (segundos >= 3599.999) {
    const horas = numero.format(segundos / 3600);
    return horas === '1' ? 'à hora anterior' : `às ${horas} horas anteriores`;
  }
  const minutos = numero.format(segundos / 60);
  return segundos < 60
    ? 'ao intervalo anterior'
    : minutos === '1'
      ? 'ao minuto anterior'
      : `aos ${minutos} minutos anteriores`;
}
