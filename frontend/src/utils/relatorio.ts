import type {
  IndicadoresRelatorio,
  ItemTopEmissorRelatorio,
  OportunidadeRelatorio,
  PeriodoRelatorio,
  PontoSerieRelatorio,
  ResumoSerieRelatorio,
  ResumoServicosRelatorio,
} from '../types/relatorio.ts';
import {
  escalaDeEmissao,
  escalaDeEnergia,
  toFiniteNumber,
} from './formatters.ts';

export const VERSAO_CALCULO = '1.0.0';
export const LIMITE_TOP_EMISSORES_RELATORIO = 5;

const dataHoraGeracao = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'America/Sao_Paulo',
  dateStyle: 'short',
  timeStyle: 'short',
});

const percentualEconomia = new Intl.NumberFormat('pt-BR', {
  maximumFractionDigits: 1,
});

const rotulosTipoOportunidade: Record<string, string> = {
  MIGRAR_REGIAO: 'Migrar de região',
  POSSIVEL_SUPERDIMENSIONAMENTO: 'Possível superdimensionamento',
  SUPERDIMENSIONAMENTO: 'Possível superdimensionamento',
  MUDAR_HORARIO: 'Mudar horário',
};

function ehObjeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === 'object' && valor !== null;
}

function textoNaoVazio(valor: unknown): string | null {
  return typeof valor === 'string' && valor.trim() !== '' ? valor.trim() : null;
}

function numeroNaoNegativo(valor: unknown): number | null {
  const numero = toFiniteNumber(valor);
  return numero !== null && numero >= 0 ? numero : null;
}

function inteiroNaoNegativo(valor: unknown, padrao = 0): number {
  return typeof valor === 'number' && Number.isInteger(valor) && valor >= 0
    ? valor
    : padrao;
}

function lerPeriodo(valor: unknown): PeriodoRelatorio | null {
  if (!ehObjeto(valor)) {
    return null;
  }

  const inicio = textoNaoVazio(valor.inicio);
  const fim = textoNaoVazio(valor.fim);
  return inicio && fim ? { inicio, fim } : null;
}

function lerServicosResumo(valor: unknown): ResumoServicosRelatorio | null {
  if (!ehObjeto(valor)) {
    return null;
  }

  const disponiveis = inteiroNaoNegativo(valor.disponiveis, -1);
  const indisponiveis = inteiroNaoNegativo(valor.indisponiveis, -1);
  const semMetricas = inteiroNaoNegativo(valor.semMetricas, -1);
  const removidos = inteiroNaoNegativo(valor.removidos, -1);

  if (
    disponiveis < 0 ||
    indisponiveis < 0 ||
    semMetricas < 0 ||
    removidos < 0
  ) {
    return null;
  }

  const desconhecidos = inteiroNaoNegativo(valor.desconhecidos, 0);
  const soma =
    disponiveis + indisponiveis + semMetricas + desconhecidos + removidos;
  const monitorados = inteiroNaoNegativo(valor.monitorados, soma);

  return {
    monitorados,
    disponiveis,
    indisponiveis,
    semMetricas,
    desconhecidos,
    removidos,
  };
}

export function consultaRankingRelatorio(apiQuery: string): string {
  const params = new URLSearchParams(apiQuery);
  params.set('metrica', 'emissao');
  params.set('limite', String(LIMITE_TOP_EMISSORES_RELATORIO));
  return `?${params}`;
}

export function normalizarIndicadoresRelatorio(
  valor: unknown,
): IndicadoresRelatorio | null {
  if (!ehObjeto(valor)) {
    return null;
  }

  const energiaTotalKwh = numeroNaoNegativo(valor.energiaTotalKwh);
  const emissaoTotalGCo2e = numeroNaoNegativo(valor.emissaoTotalGCo2e);
  const servicos = lerServicosResumo(valor.servicos);

  if (
    energiaTotalKwh === null ||
    emissaoTotalGCo2e === null ||
    servicos === null
  ) {
    return null;
  }

  return {
    periodo: lerPeriodo(valor.periodo),
    energiaTotalKwh,
    emissaoTotalGCo2e,
    coletasCalculadas: inteiroNaoNegativo(valor.coletasCalculadas, 0),
    servicos,
    geradoEm: textoNaoVazio(valor.geradoEm),
    versaoCalculo: textoNaoVazio(valor.versaoCalculo),
  };
}

export function resumirSerieRelatorio(
  valor: unknown,
): ResumoSerieRelatorio | null {
  if (!ehObjeto(valor) || !Array.isArray(valor.global)) {
    return null;
  }

  const periodo = lerPeriodo(valor.periodo);
  if (!periodo) {
    return null;
  }

  const granularidade =
    valor.granularidade === 'hora' || valor.granularidade === 'dia'
      ? valor.granularidade
      : null;
  if (!granularidade) {
    return null;
  }

  const pontosBrutos: {
    inicio: string;
    energiaKwh: number | null;
    emissaoGCo2e: number | null;
  }[] = [];

  for (const item of valor.global) {
    if (!ehObjeto(item)) {
      return null;
    }

    const inicio = textoNaoVazio(item.inicio);
    if (!inicio) {
      return null;
    }

    const energiaKwh =
      item.energiaKwh === null ? null : numeroNaoNegativo(item.energiaKwh);
    const emissaoGCo2e =
      item.emissaoGCo2e === null ? null : numeroNaoNegativo(item.emissaoGCo2e);

    if (
      (item.energiaKwh !== null && energiaKwh === null) ||
      (item.emissaoGCo2e !== null && emissaoGCo2e === null)
    ) {
      return null;
    }

    pontosBrutos.push({ inicio, energiaKwh, emissaoGCo2e });
  }

  const maiorEnergia = Math.max(
    0,
    ...pontosBrutos
      .map((ponto) => ponto.energiaKwh)
      .filter((numero): numero is number => numero !== null),
  );
  const maiorEmissao = Math.max(
    0,
    ...pontosBrutos
      .map((ponto) => ponto.emissaoGCo2e)
      .filter((numero): numero is number => numero !== null),
  );

  const escalaEnergia = escalaDeEnergia(maiorEnergia);
  const escalaEmissao = escalaDeEmissao(maiorEmissao);

  const pontos: PontoSerieRelatorio[] = pontosBrutos.map((ponto) => ({
    ...ponto,
    energia:
      ponto.energiaKwh === null ? null : ponto.energiaKwh * escalaEnergia.fator,
    emissao:
      ponto.emissaoGCo2e === null
        ? null
        : ponto.emissaoGCo2e * escalaEmissao.fator,
  }));

  const possuiDados = pontos.some(
    (ponto) => ponto.energiaKwh !== null || ponto.emissaoGCo2e !== null,
  );

  return {
    periodo,
    granularidade,
    granularidadeHoraria: granularidade === 'hora',
    escalaEnergia,
    escalaEmissao,
    possuiDados,
    pontos,
  };
}

export function normalizarTopEmissores(
  valor: unknown,
): ItemTopEmissorRelatorio[] | null {
  if (!ehObjeto(valor) || !Array.isArray(valor.itens)) {
    return null;
  }

  const itens: ItemTopEmissorRelatorio[] = [];

  for (const item of valor.itens) {
    if (!ehObjeto(item)) {
      return null;
    }

    const nome = textoNaoVazio(item.nome);
    const energiaKwh = numeroNaoNegativo(item.energiaKwh);
    const emissaoGCo2e = numeroNaoNegativo(item.emissaoGCo2e);

    if (
      !Number.isInteger(item.posicao) ||
      !Number.isInteger(item.servicoId) ||
      !nome ||
      energiaKwh === null ||
      emissaoGCo2e === null ||
      !Number.isInteger(item.coletasValidas)
    ) {
      return null;
    }

    const seloBruto = textoNaoVazio(item.selo);

    itens.push({
      posicao: item.posicao as number,
      servicoId: item.servicoId as number,
      nome,
      energiaKwh,
      emissaoGCo2e,
      coletasValidas: item.coletasValidas as number,
      selo: seloBruto && seloBruto !== '—' ? seloBruto : null,
    });
  }

  return itens.slice(0, LIMITE_TOP_EMISSORES_RELATORIO);
}

export function normalizarOportunidadesRelatorio(
  valor: unknown,
): OportunidadeRelatorio[] | null {
  const listaBruta = Array.isArray(valor)
    ? valor
    : ehObjeto(valor) && Array.isArray(valor.itens)
      ? valor.itens
      : null;

  if (!listaBruta) {
    return null;
  }

  const oportunidades: OportunidadeRelatorio[] = [];

  for (const item of listaBruta) {
    if (!ehObjeto(item)) {
      return null;
    }

    const servicoNome =
      textoNaoVazio(item.servicoNome) ??
      textoNaoVazio(item.nome) ??
      (ehObjeto(item.servico) ? textoNaoVazio(item.servico.nome) : null);
    const tipo = textoNaoVazio(item.tipo);
    const explicacao =
      textoNaoVazio(item.textoExplicativo) ??
      textoNaoVazio(item.explicacao) ??
      textoNaoVazio(item.descricao);

    if (!servicoNome || !tipo || !explicacao) {
      return null;
    }

    const servicoId =
      typeof item.servicoId === 'number' && Number.isInteger(item.servicoId)
        ? item.servicoId
        : ehObjeto(item.servico) &&
            typeof item.servico.id === 'number' &&
            Number.isInteger(item.servico.id)
          ? item.servico.id
          : null;

    const economiaGCo2e = numeroNaoNegativo(
      item.economiaGCo2e ?? item.economiaEstimadaGCo2e,
    );
    const economiaPercentual = numeroNaoNegativo(
      item.economiaPercentual ?? item.economiaEstimadaPercentual,
    );

    oportunidades.push({
      servicoId,
      servicoNome,
      tipo,
      explicacao,
      economiaGCo2e,
      economiaPercentual,
    });
  }

  return oportunidades;
}

export function formatarDataGeracaoRelatorio(
  geradoEm: string | null | undefined,
  agora = new Date(),
): string {
  const data = geradoEm ? new Date(geradoEm) : agora;
  const valida = Number.isFinite(data.getTime()) ? data : agora;
  return dataHoraGeracao.format(valida);
}

export function formatarRotuloTipoOportunidade(tipo: string): string {
  return (
    rotulosTipoOportunidade[tipo] ??
    tipo
      .toLocaleLowerCase('pt-BR')
      .replace(/[_-]+/g, ' ')
      .replace(/^\p{L}/u, (letra) => letra.toLocaleUpperCase('pt-BR'))
  );
}

export function formatarPercentualEconomia(
  valor: number | null,
): string | null {
  return valor === null ? null : `${percentualEconomia.format(valor)}%`;
}
