import type {
  EstadoIntegracao,
  IntegracaoSaude,
  RespostaSaude,
} from '../types/saude';
import type { EstadoMonitoramento } from '../types/mapa';

export const ESTADOS_DE_SERVICO: readonly EstadoMonitoramento[] = [
  'DISPONIVEL',
  'INDISPONIVEL',
  'SEM_METRICAS',
  'REMOVIDO',
  'DESCONHECIDO',
];

export const ROTULOS_DE_SERVICO: Record<EstadoMonitoramento, string> = {
  DISPONIVEL: 'Disponível',
  INDISPONIVEL: 'Indisponível',
  SEM_METRICAS: 'Sem métricas',
  REMOVIDO: 'Removido',
  DESCONHECIDO: 'Desconhecido',
};

export const DESCRICAO_DO_ESTADO: Record<EstadoIntegracao, string> = {
  OPERACIONAL: 'Operacional',
  FALHA: 'Com falha',
  SEM_CONSULTA: 'Sem consulta',
};

const ESTADOS_DE_INTEGRACAO = Object.keys(DESCRICAO_DO_ESTADO);

const relativo = new Intl.RelativeTimeFormat('pt-BR', { numeric: 'auto' });
const porcentagem = new Intl.NumberFormat('pt-BR', {
  style: 'percent',
  maximumFractionDigits: 1,
});
const segundos = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 });

const ehObjeto = (valor: unknown): valor is Record<string, unknown> =>
  typeof valor === 'object' && valor !== null;

const ehTextoOuNulo = (valor: unknown) =>
  valor === null || typeof valor === 'string';

const ehNumeroOuNulo = (valor: unknown) =>
  valor === null || (typeof valor === 'number' && Number.isFinite(valor));

function ehIntegracao(valor: unknown): valor is IntegracaoSaude {
  return (
    ehObjeto(valor) &&
    typeof valor.estado === 'string' &&
    ESTADOS_DE_INTEGRACAO.includes(valor.estado) &&
    ehTextoOuNulo(valor.ultimaConsultaEm) &&
    ehNumeroOuNulo(valor.tempoRespostaMs) &&
    ehTextoOuNulo(valor.ultimoSucessoEm) &&
    ehTextoOuNulo(valor.mensagemErro)
  );
}

export function ehRespostaSaude(valor: unknown): valor is RespostaSaude {
  return (
    ehObjeto(valor) &&
    typeof valor.geradoEm === 'string' &&
    !Number.isNaN(Date.parse(valor.geradoEm)) &&
    ehIntegracao(valor.agregador) &&
    ehIntegracao(valor.apiCarbono) &&
    ehTextoOuNulo(valor.ultimaDescobertaEm) &&
    ehObjeto(valor.coletasUltimaHora) &&
    Number.isInteger(valor.coletasUltimaHora.total) &&
    Number.isInteger(valor.coletasUltimaHora.falhas) &&
    ehNumeroOuNulo(valor.coletasUltimaHora.taxaFalha) &&
    ehObjeto(valor.servicosPorEstado) &&
    ESTADOS_DE_SERVICO.every((estado) =>
      Number.isInteger(
        (valor.servicosPorEstado as Record<string, unknown>)[estado],
      ),
    )
  );
}

export function descreverHorario(
  instante: string | null,
  referencia: string,
  nuncaTexto = 'ainda não houve',
) {
  if (instante === null) {
    return nuncaTexto;
  }

  const diferenca = Math.max(
    0,
    Math.round((Date.parse(referencia) - Date.parse(instante)) / 1000),
  );
  if (diferenca < 5) {
    return 'agora mesmo';
  }

  const unidades: [Intl.RelativeTimeFormatUnit, number][] = [
    ['day', 86_400],
    ['hour', 3_600],
    ['minute', 60],
    ['second', 1],
  ];
  const [unidade, tamanho] =
    unidades.find(([, segundosDaUnidade]) => diferenca >= segundosDaUnidade) ??
    unidades[3];

  return relativo.format(-Math.floor(diferenca / tamanho), unidade);
}

export function formatarTempoDeResposta(milissegundos: number | null) {
  if (milissegundos === null) {
    return 'sem medição';
  }

  return milissegundos < 1000
    ? `${milissegundos} ms`
    : `${segundos.format(milissegundos / 1000)} s`;
}

export function descreverColetas({
  total,
  falhas,
  taxaFalha,
}: RespostaSaude['coletasUltimaHora']) {
  if (total === 0 || taxaFalha === null) {
    return 'Nenhuma coleta na última hora.';
  }

  const coletas = total === 1 ? '1 coleta' : `${total} coletas`;
  const falharam = falhas === 1 ? '1 falhou' : `${falhas} falharam`;

  return `${coletas} na última hora, ${falharam} (${porcentagem.format(taxaFalha)}).`;
}
