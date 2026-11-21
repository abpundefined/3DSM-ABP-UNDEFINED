import type {
  AgrupamentoRanking,
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
import { isSelo } from './selo.ts';
import {
  type Escala,
  escalaDeEmissao,
  escalaDeEnergia,
  formatEmission,
  formatEnergy,
  formatRegionName,
} from './formatters.ts';

export const LIMITE_DO_RANKING = 10;
export const METRICA_PADRAO: MetricaRanking = 'energia';
export const AGRUPAMENTO_PADRAO: AgrupamentoRanking = 'servico';
const DIFERENCA_RELEVANTE = 2;
const TAMANHO_DO_NOME_NO_EIXO = 18;
const LOCAL_NAO_INFORMADO = 'Localização não informada';

export const METRICAS: Record<
  MetricaRanking,
  { rotulo: string; nome: string }
> = {
  energia: { rotulo: 'Energia', nome: 'energia' },
  emissao: { rotulo: 'Emissão', nome: 'emissão' },
};

export const AGRUPAMENTOS: Record<
  AgrupamentoRanking,
  { rotulo: string; coluna: string; singular: string; plural: string }
> = {
  servico: {
    rotulo: 'Serviço',
    coluna: 'Serviço',
    singular: 'serviço',
    plural: 'serviços',
  },
  regiao: {
    rotulo: 'Região',
    coluna: 'Região',
    singular: 'região',
    plural: 'regiões',
  },
  pais: {
    rotulo: 'País',
    coluna: 'País',
    singular: 'país',
    plural: 'países',
  },
};

const REGIOES_CONHECIDAS: Record<string, { regiao: string; pais: string }> = {
  'br-sudeste': { regiao: 'Brasil · São Paulo', pais: 'Brasil' },
  'us-east': { regiao: 'Estados Unidos · Ashburn', pais: 'Estados Unidos' },
  'us-east-1': { regiao: 'Estados Unidos · Ashburn', pais: 'Estados Unidos' },
  'eu-west': { regiao: 'Irlanda · Dublin', pais: 'Irlanda' },
  'eu-west-1': { regiao: 'Irlanda · Dublin', pais: 'Irlanda' },
  'ca-central': { regiao: 'Canadá · Toronto', pais: 'Canadá' },
  'jp-east': { regiao: 'Japão · Tóquio', pais: 'Japão' },
};

const CODIGOS_DESCONHECIDOS = new Set([
  'desconhecida',
  'desconhecido',
  'unknown',
  'unknown-region',
  'localização não informada',
]);

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

function ehAgrupamento(valor: unknown): valor is AgrupamentoRanking {
  return typeof valor === 'string' && Object.hasOwn(AGRUPAMENTOS, valor);
}

function ehTextoOpcional(valor: unknown) {
  return valor === undefined || typeof valor === 'string';
}

function ehNumeroNaoNegativo(valor: unknown) {
  return typeof valor === 'number' && Number.isFinite(valor) && valor >= 0;
}

function ehServico(valor: unknown): valor is Record<string, unknown> {
  return (
    ehObjeto(valor) &&
    Number.isInteger(valor.servicoId) &&
    typeof valor.nome === 'string' &&
    isSelo(valor.selo)
  );
}

function ehItem(valor: unknown) {
  return (
    ehServico(valor) &&
    Number.isInteger(valor.posicao) &&
    ehNumeroNaoNegativo(valor.energiaKwh) &&
    ehNumeroNaoNegativo(valor.emissaoGCo2e) &&
    Number.isInteger(valor.coletasValidas) &&
    ehTextoOpcional(valor.regiaoCodigo) &&
    ehTextoOpcional(valor.regiao) &&
    ehTextoOpcional(valor.pais)
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
            (item.emissaoAtualGCo2e === null ||
              ehNumeroNaoNegativo(item.emissaoAtualGCo2e)) &&
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

export function lerAgrupamento(params: URLSearchParams): AgrupamentoRanking {
  const grupo = params.get('grupo');
  return ehAgrupamento(grupo) ? grupo : AGRUPAMENTO_PADRAO;
}

export function escreverAgrupamento(
  params: URLSearchParams,
  grupo: AgrupamentoRanking,
): URLSearchParams {
  const proximos = new URLSearchParams(params);

  if (grupo === AGRUPAMENTO_PADRAO) {
    proximos.delete('grupo');
  } else {
    proximos.set('grupo', grupo);
  }

  return proximos;
}

function textoLocalValido(valor: string | undefined): string | null {
  const limpo = valor?.trim();
  if (!limpo || CODIGOS_DESCONHECIDOS.has(limpo.toLocaleLowerCase('pt-BR'))) {
    return null;
  }
  return limpo;
}

export function nomeDaRegiaoDoItem(
  item: Pick<ItemRanking, 'regiao' | 'regiaoCodigo' | 'pais'>,
): string {
  const regiaoExplicita = textoLocalValido(item.regiao);
  if (regiaoExplicita) {
    return regiaoExplicita;
  }

  const codigo = item.regiaoCodigo?.trim().toLowerCase();
  if (codigo && !CODIGOS_DESCONHECIDOS.has(codigo)) {
    const conhecida = REGIOES_CONHECIDAS[codigo];
    if (conhecida) {
      return conhecida.regiao;
    }
    return formatRegionName(codigo);
  }

  return LOCAL_NAO_INFORMADO;
}

export function nomeDoPaisDoItem(
  item: Pick<ItemRanking, 'regiao' | 'regiaoCodigo' | 'pais'>,
): string {
  const paisExplicito = textoLocalValido(item.pais);
  if (paisExplicito) {
    return paisExplicito;
  }

  const regiaoExplicita = textoLocalValido(item.regiao);
  if (regiaoExplicita) {
    const [primeiroSegmento] = regiaoExplicita.split(' · ');
    const paisDaRegiao = textoLocalValido(primeiroSegmento);
    if (paisDaRegiao) {
      return paisDaRegiao;
    }
  }

  const codigo = item.regiaoCodigo?.trim().toLowerCase();
  if (codigo && !CODIGOS_DESCONHECIDOS.has(codigo)) {
    const conhecida = REGIOES_CONHECIDAS[codigo];
    if (conhecida) {
      return conhecida.pais;
    }
  }

  return LOCAL_NAO_INFORMADO;
}

export function agruparItensRanking(
  itens: ItemRanking[],
  grupo: AgrupamentoRanking,
  metrica: MetricaRanking,
): ItemRanking[] {
  if (grupo === 'servico') {
    return itens;
  }

  const acumulados = new Map<
    string,
    {
      nome: string;
      energiaKwh: number;
      emissaoGCo2e: number;
      coletasValidas: number;
      quantidadeServicos: number;
    }
  >();

  for (const item of itens) {
    const nome =
      grupo === 'regiao' ? nomeDaRegiaoDoItem(item) : nomeDoPaisDoItem(item);
    const atual = acumulados.get(nome) ?? {
      nome,
      energiaKwh: 0,
      emissaoGCo2e: 0,
      coletasValidas: 0,
      quantidadeServicos: 0,
    };
    atual.energiaKwh += item.energiaKwh;
    atual.emissaoGCo2e += item.emissaoGCo2e;
    atual.coletasValidas += item.coletasValidas;
    atual.quantidadeServicos += item.quantidadeServicos ?? 1;
    acumulados.set(nome, atual);
  }

  return [...acumulados.values()]
    .toSorted(
      (a, b) =>
        valorDaMetrica(b, metrica) - valorDaMetrica(a, metrica) ||
        a.nome.localeCompare(b.nome, 'pt-BR'),
    )
    .map((item, indice) => ({
      posicao: indice + 1,
      servicoId: indice + 1,
      nome: item.nome,
      selo: '-',
      energiaKwh: item.energiaKwh,
      emissaoGCo2e: item.emissaoGCo2e,
      coletasValidas: item.coletasValidas,
      quantidadeServicos: item.quantidadeServicos,
    }));
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
  grupo: AgrupamentoRanking = 'servico',
): string | null {
  const lider = itens.at(0);
  if (!lider) {
    return null;
  }

  const { nome } = METRICAS[metrica];
  const { singular, plural } = AGRUPAMENTOS[grupo];
  const feminino = grupo === 'regiao';
  const valor = formatarValor(valorDaMetrica(lider, metrica), metrica);
  if (itens.length === 1) {
    return `${lider.nome} é ${feminino ? 'a única' : 'o único'} ${singular} com coletas no período: ${valor} de ${nome}.`;
  }

  const total = itens.reduce(
    (soma, item) => soma + valorDaMetrica(item, metrica),
    0,
  );
  if (total === 0) {
    return `${feminino ? 'As' : 'Os'} ${plural} do ranking não registraram ${nome} no período.`;
  }

  const parte = (valorDaMetrica(lider, metrica) / total) * 100;
  return `${lider.nome} lidera em ${nome}: ${valor}, ${porcentagem.format(parte)}% do total ${feminino ? 'das' : 'dos'} ${itens.length} ${plural} do ranking.`;
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
