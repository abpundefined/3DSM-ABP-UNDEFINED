export type EstadoIntervalo =
  'ativo' | 'indisponivel' | 'semMetricas' | 'semDados';

export type PontoEstadoHistorico = {
  inicio: string;
  ativo?: number;
  indisponivel?: number;
  semMetricas?: number;
  coletas?: number | null;
};

export type SegmentoLinhaTempo = {
  inicio: string;
  horarioCurto: string;
  horarioCompleto: string;
  estadoPredominante: EstadoIntervalo;
  rotuloEstado: string;
  ativo: number;
  indisponivel: number;
  semMetricas: number;
  totalColetas: number;
  resumoTooltip: string;
};

export type ResumoDisponibilidade = {
  segmentos: SegmentoLinhaTempo[];
  totalAtivo: number;
  totalIndisponivel: number;
  totalSemMetricas: number;
  totalColetas: number;
  disponibilidadePercentual: number | null;
  textoDisponibilidade: string;
  granularidadeHoraria: boolean;
  possuiColetas: boolean;
  possuiIntervalosSemColetas: boolean;
  contagemIntervalosPorEstado: Record<EstadoIntervalo, number>;
};

export const ROTULO_ESTADO_INTERVALO: Record<EstadoIntervalo, string> = {
  ativo: 'Ativo',
  indisponivel: 'Indisponível',
  semMetricas: 'Sem métricas',
  semDados: 'Sem coletas',
};

const FORMATADOR_PERCENTUAL = new Intl.NumberFormat('pt-BR', {
  maximumFractionDigits: 1,
});

const FORMATADOR_INTEIRO = new Intl.NumberFormat('pt-BR', {
  maximumFractionDigits: 0,
});

const FORMATADOR_DATA_CURTA = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'America/Sao_Paulo',
  day: '2-digit',
  month: '2-digit',
});

const FORMATADOR_DATA_COMPLETA = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'America/Sao_Paulo',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

const FORMATADOR_HORA = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'America/Sao_Paulo',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

function normalizarContagem(valor: unknown): number {
  if (typeof valor !== 'number' || !Number.isFinite(valor) || valor <= 0) {
    return 0;
  }
  return Math.floor(valor);
}

export function determinarEstadoPredominante(
  ativo: number,
  indisponivel: number,
  semMetricas: number,
): EstadoIntervalo {
  const contAtivo = normalizarContagem(ativo);
  const contIndisponivel = normalizarContagem(indisponivel);
  const contSemMetricas = normalizarContagem(semMetricas);
  const maior = Math.max(contAtivo, contIndisponivel, contSemMetricas);

  if (maior === 0) {
    return 'semDados';
  }

  // Em empate, prioriza o estado mais crítico para não ocultar instabilidade.
  if (contIndisponivel === maior) {
    return 'indisponivel';
  }
  if (contSemMetricas === maior) {
    return 'semMetricas';
  }
  return 'ativo';
}

export function calcularDisponibilidadePercentual(
  ativo: number,
  totalColetas: number,
): number | null {
  const contTotal = normalizarContagem(totalColetas);
  if (contTotal === 0) {
    return null;
  }

  const contAtivo = Math.min(normalizarContagem(ativo), contTotal);
  if (contAtivo === 0) {
    return 0;
  }
  if (contAtivo === contTotal) {
    return 100;
  }

  const bruto = (contAtivo / contTotal) * 100;
  const arredondado = Math.round(bruto * 10) / 10;
  return arredondado >= 100 ? 99.9 : arredondado;
}

export function formatarPercentualDisponibilidade(
  percentual: number | null,
): string {
  if (percentual === null || !Number.isFinite(percentual)) {
    return 'Sem coletas no período';
  }
  return `${FORMATADOR_PERCENTUAL.format(percentual)}% disponível`;
}

export function formatarContagemColetas(valor: number): string {
  return FORMATADOR_INTEIRO.format(normalizarContagem(valor));
}

export function formatarHorarioIntervalo(
  inicioIso: string,
  granularidadeHoraria: boolean,
): { curto: string; completo: string } {
  const inicio = new Date(inicioIso);
  if (!Number.isFinite(inicio.getTime())) {
    return { curto: 'Data indisponível', completo: 'Data indisponível' };
  }

  if (!granularidadeHoraria) {
    return {
      curto: FORMATADOR_DATA_CURTA.format(inicio),
      completo: FORMATADOR_DATA_COMPLETA.format(inicio),
    };
  }

  const fim = new Date(inicio.getTime() + 60 * 60 * 1000);
  const horaInicio = FORMATADOR_HORA.format(inicio);
  const horaFim = FORMATADOR_HORA.format(fim);

  return {
    curto: `${FORMATADOR_DATA_CURTA.format(inicio)}, ${horaInicio}`,
    completo: `${FORMATADOR_DATA_COMPLETA.format(inicio)}, ${horaInicio} – ${horaFim}`,
  };
}

function inferirGranularidadeHoraria(
  history: readonly PontoEstadoHistorico[],
): boolean {
  if (history.length <= 1) {
    return true;
  }

  return history.some((point, index) => {
    if (index === 0) {
      return false;
    }
    const difference =
      Date.parse(point.inicio) - Date.parse(history[index - 1].inicio);
    return difference > 0 && difference < 24 * 60 * 60 * 1000;
  });
}

export function construirResumoDisponibilidade(
  history: readonly PontoEstadoHistorico[],
  granularidadeHoraria?: boolean,
): ResumoDisponibilidade {
  const horaria = granularidadeHoraria ?? inferirGranularidadeHoraria(history);
  let totalAtivo = 0;
  let totalIndisponivel = 0;
  let totalSemMetricas = 0;
  const contagemIntervalosPorEstado: Record<EstadoIntervalo, number> = {
    ativo: 0,
    indisponivel: 0,
    semMetricas: 0,
    semDados: 0,
  };

  const segmentos: SegmentoLinhaTempo[] = history.map((point) => {
    const ativo = normalizarContagem(point.ativo);
    const indisponivel = normalizarContagem(point.indisponivel);
    const semMetricas = normalizarContagem(point.semMetricas);
    const totalPorEstado = ativo + indisponivel + semMetricas;
    const totalColetas = Math.max(
      totalPorEstado,
      normalizarContagem(point.coletas),
    );
    const estadoPredominante = determinarEstadoPredominante(
      ativo,
      indisponivel,
      semMetricas,
    );
    const rotuloEstado = ROTULO_ESTADO_INTERVALO[estadoPredominante];
    const horario = formatarHorarioIntervalo(point.inicio, horaria);

    totalAtivo += ativo;
    totalIndisponivel += indisponivel;
    totalSemMetricas += semMetricas;
    contagemIntervalosPorEstado[estadoPredominante] += 1;

    const detalhes =
      totalPorEstado === 0
        ? 'nenhuma coleta registrada'
        : `${formatarContagemColetas(ativo)} ativas, ${formatarContagemColetas(indisponivel)} indisponíveis, ${formatarContagemColetas(semMetricas)} sem métricas`;

    return {
      inicio: point.inicio,
      horarioCurto: horario.curto,
      horarioCompleto: horario.completo,
      estadoPredominante,
      rotuloEstado,
      ativo,
      indisponivel,
      semMetricas,
      totalColetas,
      resumoTooltip: `${horario.completo} — Estado predominante: ${rotuloEstado} (${detalhes})`,
    };
  });

  const totalColetas = totalAtivo + totalIndisponivel + totalSemMetricas;
  const disponibilidadePercentual = calcularDisponibilidadePercentual(
    totalAtivo,
    totalColetas,
  );

  return {
    segmentos,
    totalAtivo,
    totalIndisponivel,
    totalSemMetricas,
    totalColetas,
    disponibilidadePercentual,
    textoDisponibilidade: formatarPercentualDisponibilidade(
      disponibilidadePercentual,
    ),
    granularidadeHoraria: horaria,
    possuiColetas: totalColetas > 0,
    possuiIntervalosSemColetas: contagemIntervalosPorEstado.semDados > 0,
    contagemIntervalosPorEstado,
  };
}
