import type {
  ItemRanking,
  MetricaRanking,
  RespostaRanking,
} from '../types/ranking';
import type { PeriodoConsultado } from '../types/mapa';
import {
  ehNumeroOuNulo,
  ehPeriodoConsultado,
  ehVariacaoPercentual,
} from './variacao.ts';
import {
  type Escala,
  escalaDeEmissao,
  escalaDeEnergia,
  formatEmission,
  formatEnergy,
} from './formatters.ts';

export const LIMITE_DO_RANKING = 10;
export const METRICA_PADRAO: MetricaRanking = 'energia';
const DIFERENCA_RELEVANTE = 2;
const TAMANHO_DO_NOME_NO_EIXO = 18;

export const METRICAS: Record<
  MetricaRanking,
  { rotulo: string; nome: string }
> = {
  energia: { rotulo: 'Energia', nome: 'energia' },
  emissao: { rotulo: 'Emissão', nome: 'emissão' },
};

const porcentagem = new Intl.NumberFormat('pt-BR', {
  maximumFractionDigits: 1,
});
const numeroCurto = new Intl.NumberFormat('pt-BR', {
  maximumSignificantDigits: 3,
});
const dataHora = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'America/Sao_Paulo',
  dateStyle: 'short',
  timeStyle: 'short',
});

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
    valor.semDados.every(ehServico) &&
    (valor.periodoAnterior === undefined ||
      ehPeriodoConsultado(valor.periodoAnterior)) &&
    (valor.variacaoPercentual === undefined ||
      (ehVariacaoPercentual(valor.variacaoPercentual) &&
        ehPeriodoConsultado(valor.periodo))) &&
    (valor.variacaoPorServico === undefined ||
      (Array.isArray(valor.variacaoPorServico) &&
        valor.variacaoPorServico.every(
          (item: unknown) =>
            ehServico(item) &&
            ehNumeroNaoNegativo(item.emissaoAtualGCo2e) &&
            ehNumeroOuNulo(item.emissaoAnteriorGCo2e) &&
            (item.emissaoAnteriorGCo2e === null ||
              item.emissaoAnteriorGCo2e >= 0) &&
            ehNumeroOuNulo(item.diferencaGCo2e) &&
            ehNumeroOuNulo(item.variacaoPercentual),
        )))
  );
}

export function lerMetrica(params: URLSearchParams): MetricaRanking {
  const metrica = params.get('metrica');
  return ehMetrica(metrica) ? metrica : METRICA_PADRAO;
}

export function escreverMetrica(
  params: URLSearchParams,
  metrica: MetricaRanking,
): URLSearchParams {
  const proximos = new URLSearchParams(params);

  if (metrica === METRICA_PADRAO) {
    proximos.delete('metrica');
  } else {
    proximos.set('metrica', metrica);
  }

  return proximos;
}

export function consultaDoRanking(
  apiQuery: string,
  metrica: MetricaRanking,
): string {
  const params = new URLSearchParams(apiQuery);
  params.set('metrica', metrica);
  params.set('limite', String(LIMITE_DO_RANKING));
  return `?${params}`;
}

export function valorDaMetrica(
  item: Pick<ItemRanking, 'energiaKwh' | 'emissaoGCo2e'>,
  metrica: MetricaRanking,
) {
  return metrica === 'emissao' ? item.emissaoGCo2e : item.energiaKwh;
}

export function escalaDaMetrica(
  metrica: MetricaRanking,
  valores: number[],
): Escala {
  const maior = Math.max(0, ...valores);
  return metrica === 'emissao'
    ? escalaDeEmissao(maior)
    : escalaDeEnergia(maior);
}

export function formatarValor(valor: number, metrica: MetricaRanking) {
  return metrica === 'emissao' ? formatEmission(valor) : formatEnergy(valor);
}

export function resumoDoRanking(
  itens: ItemRanking[],
  metrica: MetricaRanking,
): string | null {
  const lider = itens.at(0);
  if (!lider) {
    return null;
  }

  const { nome } = METRICAS[metrica];
  const valor = formatarValor(valorDaMetrica(lider, metrica), metrica);
  if (itens.length === 1) {
    return `${lider.nome} é o único serviço com coletas no período: ${valor} de ${nome}.`;
  }

  const total = itens.reduce(
    (soma, item) => soma + valorDaMetrica(item, metrica),
    0,
  );
  if (total === 0) {
    return `Os serviços do ranking não registraram ${nome} no período.`;
  }

  const parte = (valorDaMetrica(lider, metrica) / total) * 100;
  return `${lider.nome} lidera em ${nome}: ${valor}, ${porcentagem.format(parte)}% do total dos ${itens.length} serviços do ranking.`;
}

export function fraseDeIntensidade(itens: ItemRanking[]): string | null {
  const intensidades = itens
    .filter(
      ({ energiaKwh, emissaoGCo2e }) => energiaKwh > 0 && emissaoGCo2e > 0,
    )
    .map(({ nome, energiaKwh, emissaoGCo2e }) => ({
      nome,
      porKwh: emissaoGCo2e / energiaKwh,
    }))
    .toSorted((a, b) => b.porKwh - a.porKwh);

  const maior = intensidades.at(0);
  const menor = intensidades.at(-1);
  if (!maior || !menor || maior === menor) {
    return null;
  }

  const vezes = maior.porKwh / menor.porKwh;
  if (vezes < DIFERENCA_RELEVANTE) {
    return null;
  }

  return `Por kWh consumido, ${maior.nome} emite ${porcentagem.format(vezes)} vezes mais CO₂e que ${menor.nome}. A emissão depende da intensidade de carbono da energia na região onde cada serviço roda.`;
}

export function formatarPeriodoConsiderado({ inicio, fim }: PeriodoConsultado) {
  return `${dataHora.format(new Date(inicio))} a ${dataHora.format(new Date(fim))}`;
}

export function formatarNumero(valor: number) {
  return numeroCurto.format(valor);
}

export function abreviarNome(nome: string) {
  return nome.length <= TAMANHO_DO_NOME_NO_EIXO
    ? nome
    : `${nome.slice(0, TAMANHO_DO_NOME_NO_EIXO - 1).trimEnd()}…`;
}
