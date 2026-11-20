import type {
  Granularidade,
  PontoDaSerie,
  RespostaSerie,
} from '../types/serie';
import { formatEmission, formatEnergy } from './formatters.ts';
import type { Period, PeriodPreset } from './period';

export type Escala = { fator: number; unidade: string };
export type Direcao = 'subindo' | 'caindo' | 'estavel';
export type Metrica = 'energia' | 'emissao';
export type Camada = { chave: string; nome: string; totalGCo2e: number };
export type PontoEmpilhado = {
  inicio: string;
  [chave: string]: string | number | null;
};

export const QUANTIDADE_DE_CAMADAS = 5;
export const CHAVE_DOS_OUTROS = 'outros';

const MINIMO_DE_PONTOS = 4;
const MARGEM_DA_MINIATURA = 2;
const porcentagem = new Intl.NumberFormat('pt-BR', {
  maximumFractionDigits: 1,
});
const VARIACAO_RELEVANTE = 0.1;

const TEXTO_DA_DIRECAO: Record<Direcao, string> = {
  subindo: 'subindo',
  caindo: 'caindo',
  estavel: 'estável',
};

const TRECHO_DO_PERIODO: Record<PeriodPreset, string> = {
  '24h': 'nas últimas 24 horas',
  '7d': 'nos últimos 7 dias',
  '30d': 'nos últimos 30 dias',
  'mes-atual': 'neste mês',
  'mes-anterior': 'no mês passado',
};

const FUSO = 'America/Sao_Paulo';
const hora = new Intl.DateTimeFormat('pt-BR', {
  timeZone: FUSO,
  hour: '2-digit',
  minute: '2-digit',
});
const dia = new Intl.DateTimeFormat('pt-BR', {
  timeZone: FUSO,
  day: '2-digit',
  month: '2-digit',
});
const diaComAno = new Intl.DateTimeFormat('pt-BR', {
  timeZone: FUSO,
  dateStyle: 'short',
});

function ehObjeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === 'object' && valor !== null;
}

function ehValorOuNulo(valor: unknown) {
  return (
    valor === null ||
    (typeof valor === 'number' && Number.isFinite(valor) && valor >= 0)
  );
}

function ehSerieAlinhada(
  valor: unknown,
  intervalos: unknown[],
): valor is PontoDaSerie[] {
  return (
    Array.isArray(valor) &&
    valor.length === intervalos.length &&
    valor.every(
      (ponto, indice) =>
        ehObjeto(ponto) &&
        ponto.inicio === intervalos[indice] &&
        ehValorOuNulo(ponto.energiaKwh) &&
        ehValorOuNulo(ponto.emissaoGCo2e),
    )
  );
}

export function ehRespostaSerie(valor: unknown): valor is RespostaSerie {
  if (
    !ehObjeto(valor) ||
    !ehObjeto(valor.periodo) ||
    typeof valor.periodo.inicio !== 'string' ||
    typeof valor.periodo.fim !== 'string' ||
    (valor.granularidade !== 'hora' && valor.granularidade !== 'dia') ||
    !Array.isArray(valor.intervalos) ||
    !valor.intervalos.every((intervalo) => typeof intervalo === 'string') ||
    !Array.isArray(valor.servicos)
  ) {
    return false;
  }

  const { intervalos } = valor;
  return (
    ehSerieAlinhada(valor.global, intervalos) &&
    valor.servicos.every(
      (servico) =>
        ehObjeto(servico) &&
        Number.isInteger(servico.servicoId) &&
        typeof servico.nome === 'string' &&
        ehSerieAlinhada(servico.serie, intervalos),
    )
  );
}

export function consultaDaSerie(apiQuery: string): string {
  const params = new URLSearchParams(apiQuery);
  params.set('porServico', 'true');
  return `?${params}`;
}

export function maiorValor(valores: (number | null)[]) {
  return Math.max(0, ...valores.filter((valor) => valor !== null));
}

export function escalaDaEnergia(maiorKwh: number): Escala {
  return maiorKwh >= 1
    ? { fator: 1, unidade: 'kWh' }
    : { fator: 1000, unidade: 'Wh' };
}

export function escalaDaEmissao(maiorGCo2e: number): Escala {
  return maiorGCo2e >= 1000
    ? { fator: 0.001, unidade: 'kgCO₂e' }
    : { fator: 1, unidade: 'gCO₂e' };
}

export function rotuloDoIntervalo(
  inicio: string,
  granularidade: Granularidade,
) {
  const data = new Date(inicio);
  return granularidade === 'hora' ? hora.format(data) : dia.format(data);
}

export function rotuloCompletoDoIntervalo(
  inicio: string,
  granularidade: Granularidade,
) {
  const data = new Date(inicio);
  return granularidade === 'hora'
    ? `${dia.format(data)}, ${hora.format(data)}`
    : diaComAno.format(data);
}

export function direcaoDaTendencia(valores: (number | null)[]): Direcao | null {
  const pontos = valores.filter((valor) => valor !== null);
  if (pontos.length < MINIMO_DE_PONTOS) {
    return null;
  }

  const metade = Math.floor(pontos.length / 2);
  const media = (lista: number[]) =>
    lista.reduce((soma, valor) => soma + valor, 0) / lista.length;
  const antes = media(pontos.slice(0, metade));
  const depois = media(pontos.slice(-metade));

  if (antes === 0) {
    return depois > 0 ? 'subindo' : 'estavel';
  }

  const variacao = (depois - antes) / antes;
  if (variacao > VARIACAO_RELEVANTE) {
    return 'subindo';
  }
  return variacao < -VARIACAO_RELEVANTE ? 'caindo' : 'estavel';
}

export function trechoDoPeriodo(period: Period) {
  return period.kind === 'custom'
    ? 'no período escolhido'
    : TRECHO_DO_PERIODO[period.preset];
}

export function rotuloDaMiniTendencia(
  valores: (number | null)[],
  period: Period,
) {
  const direcao = direcaoDaTendencia(valores);
  return direcao
    ? `Emissão ${TEXTO_DA_DIRECAO[direcao]} ${trechoDoPeriodo(period)}`
    : `Sem coletas suficientes para a tendência ${trechoDoPeriodo(period)}`;
}

const valorDa = (ponto: PontoDaSerie, metrica: Metrica) =>
  metrica === 'energia' ? ponto.energiaKwh : ponto.emissaoGCo2e;

export function resumoDaMetrica(
  { global, granularidade }: Pick<RespostaSerie, 'global' | 'granularidade'>,
  metrica: Metrica,
): string | null {
  const formatar = metrica === 'energia' ? formatEnergy : formatEmission;
  const pontos = global.filter((ponto) => valorDa(ponto, metrica) !== null);
  if (pontos.length === 0) {
    return null;
  }

  const total = pontos.reduce(
    (soma, ponto) => soma + (valorDa(ponto, metrica) ?? 0),
    0,
  );
  const pico = pontos.reduce((maior, ponto) =>
    (valorDa(ponto, metrica) ?? 0) > (valorDa(maior, metrica) ?? 0)
      ? ponto
      : maior,
  );
  const direcao = direcaoDaTendencia(
    global.map((ponto) => valorDa(ponto, metrica)),
  );

  const frase = `Total de ${formatar(total)} no período, com pico de ${formatar(valorDa(pico, metrica))} em ${rotuloCompletoDoIntervalo(pico.inicio, granularidade)}.`;
  return direcao ? `${frase} Tendência: ${TEXTO_DA_DIRECAO[direcao]}.` : frase;
}

export function montarCamadas({
  intervalos,
  global,
  servicos,
}: Pick<RespostaSerie, 'intervalos' | 'global' | 'servicos'>): {
  camadas: Camada[];
  pontos: PontoEmpilhado[];
} {
  const emissores = servicos
    .map((servico) => ({
      chave: `servico-${servico.servicoId}`,
      nome: servico.nome,
      serie: servico.serie,
      totalGCo2e: servico.serie.reduce(
        (soma, ponto) => soma + (ponto.emissaoGCo2e ?? 0),
        0,
      ),
    }))
    .filter(({ totalGCo2e }) => totalGCo2e > 0)
    .sort(
      (a, b) =>
        b.totalGCo2e - a.totalGCo2e || a.nome.localeCompare(b.nome, 'pt-BR'),
    );

  const principais = emissores.slice(0, QUANTIDADE_DE_CAMADAS);
  const outros = emissores.slice(QUANTIDADE_DE_CAMADAS);
  const camadas: Camada[] = principais.map(({ chave, nome, totalGCo2e }) => ({
    chave,
    nome,
    totalGCo2e,
  }));
  if (outros.length > 0) {
    camadas.push({
      chave: CHAVE_DOS_OUTROS,
      nome: `Outros (${outros.length})`,
      totalGCo2e: outros.reduce((soma, { totalGCo2e }) => soma + totalGCo2e, 0),
    });
  }

  const pontos = intervalos.map((inicio, indice) => {
    const semColeta = global[indice].emissaoGCo2e === null;
    const ponto: PontoEmpilhado = { inicio };
    for (const { chave, serie } of principais) {
      ponto[chave] = semColeta ? null : (serie[indice].emissaoGCo2e ?? 0);
    }
    if (outros.length > 0) {
      ponto[CHAVE_DOS_OUTROS] = semColeta
        ? null
        : outros.reduce(
            (soma, { serie }) => soma + (serie[indice].emissaoGCo2e ?? 0),
            0,
          );
    }
    return ponto;
  });

  return { camadas, pontos };
}

export function resumoDasCamadas(camadas: Camada[]): string | null {
  const principais = camadas.filter(({ chave }) => chave !== CHAVE_DOS_OUTROS);
  const maior = principais.at(0);
  if (!maior) {
    return null;
  }

  const total = camadas.reduce((soma, { totalGCo2e }) => soma + totalGCo2e, 0);
  if (principais.length === camadas.length) {
    return `${maior.nome} é o serviço que mais emite: ${porcentagem.format((maior.totalGCo2e / total) * 100)}% da emissão do período.`;
  }

  const parte = principais.reduce(
    (soma, { totalGCo2e }) => soma + totalGCo2e,
    0,
  );
  return `Os ${principais.length} serviços que mais emitem somam ${porcentagem.format((parte / total) * 100)}% da emissão do período; o maior é ${maior.nome}.`;
}

export function segmentosDaMiniatura(
  valores: (number | null)[],
  largura: number,
  altura: number,
): string[] {
  const maior = maiorValor(valores);
  const passo = valores.length > 1 ? largura / (valores.length - 1) : 0;
  const util = altura - 2 * MARGEM_DA_MINIATURA;
  const arredondar = (valor: number) => Math.round(valor * 10) / 10;
  const segmentos: string[] = [];
  let atual: string[] = [];

  valores.forEach((valor, indice) => {
    if (valor === null) {
      if (atual.length > 0) {
        segmentos.push(atual.join(' '));
      }
      atual = [];
      return;
    }
    const proporcao = maior === 0 ? 0 : valor / maior;
    const x = arredondar(indice * passo);
    const y = arredondar(MARGEM_DA_MINIATURA + (1 - proporcao) * util);
    atual.push(`${x},${y}`);
  });
  if (atual.length > 0) {
    segmentos.push(atual.join(' '));
  }

  return segmentos;
}
