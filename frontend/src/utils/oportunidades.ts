import type {
  FiltroTipoOportunidade,
  OportunidadeReducao,
  RespostaOportunidades,
  TipoOportunidade,
} from '../types/oportunidades';

export const LIMIARES_OPORTUNIDADES_UI = {
  reducaoMinimaMigrarRegiaoPercentual: 20,
  cpuMaximaSuperdimensionamentoPercentual: 15,
  reducaoEstimadaSuperdimensionamentoPercentual: 30,
  reducaoMinimaMudarHorarioPercentual: 20,
  duracaoJanelaHorarioHoras: 3,
} as const;

export const TIPOS_OPORTUNIDADE: readonly TipoOportunidade[] = [
  'MIGRAR_REGIAO',
  'SUPERDIMENSIONAMENTO',
  'MUDAR_HORARIO',
];

export const ROTULOS_TIPO_OPORTUNIDADE: Record<TipoOportunidade, string> = {
  MIGRAR_REGIAO: 'Migrar de região',
  SUPERDIMENSIONAMENTO: 'Superdimensionamento',
  MUDAR_HORARIO: 'Mudar horário',
};

const formatoPercentual = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

function ehObjeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === 'object' && valor !== null;
}

function ehNumeroFinito(valor: unknown): valor is number {
  return typeof valor === 'number' && Number.isFinite(valor);
}

function ehTipoOportunidade(valor: unknown): valor is TipoOportunidade {
  return TIPOS_OPORTUNIDADE.includes(valor as TipoOportunidade);
}

function ehOportunidade(valor: unknown): valor is OportunidadeReducao {
  return (
    ehObjeto(valor) &&
    typeof valor.id === 'string' &&
    Number.isInteger(valor.servicoId) &&
    typeof valor.servicoNome === 'string' &&
    typeof valor.regiaoCodigo === 'string' &&
    ehTipoOportunidade(valor.tipo) &&
    typeof valor.titulo === 'string' &&
    typeof valor.explicacao === 'string' &&
    ehNumeroFinito(valor.economiaEstimadaGCo2e) &&
    ehNumeroFinito(valor.economiaPercentual) &&
    ehNumeroFinito(valor.emissaoAtualGCo2e) &&
    typeof valor.linkDetalhe === 'string'
  );
}

export function ehRespostaOportunidades(
  valor: unknown,
): valor is RespostaOportunidades {
  if (
    !ehObjeto(valor) ||
    !ehObjeto(valor.periodo) ||
    typeof valor.periodo.inicio !== 'string' ||
    typeof valor.periodo.fim !== 'string' ||
    !ehObjeto(valor.resumo) ||
    !ehNumeroFinito(valor.resumo.totalOportunidades) ||
    !ehNumeroFinito(valor.resumo.reducaoPotencialGCo2e) ||
    !ehObjeto(valor.resumo.porTipo) ||
    !ehObjeto(valor.limiares) ||
    typeof valor.aviso !== 'string' ||
    !Array.isArray(valor.oportunidades)
  ) {
    return false;
  }

  return valor.oportunidades.every(ehOportunidade);
}

export function rotuloTipoOportunidade(tipo: TipoOportunidade): string {
  return ROTULOS_TIPO_OPORTUNIDADE[tipo];
}

export function formatarEconomiaPercentual(valor: number): string {
  return `−${formatoPercentual.format(Math.max(0, valor))}%`;
}

export function filtrarOportunidadesPorTipo(
  oportunidades: readonly OportunidadeReducao[],
  filtro: FiltroTipoOportunidade,
): OportunidadeReducao[] {
  if (filtro === 'TODOS') {
    return [...oportunidades];
  }
  return oportunidades.filter((item) => item.tipo === filtro);
}
