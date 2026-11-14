import type { Granularidade, ServicoNoMapa } from '../types/mapa';

export type Momento = {
  indice: number;
  rotulo: string;
};

const formatos: Record<Granularidade, Intl.DateTimeFormat> = {
  hora: new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }),
  dia: new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
  }),
};

export function rotuloDoIntervalo(
  intervalo: string,
  granularidade: Granularidade,
) {
  return formatos[granularidade].format(new Date(intervalo));
}

export function emissaoNoMomento(
  servico: ServicoNoMapa,
  indice: number | null,
) {
  if (indice === null) {
    return servico.totais.emissaoGCo2e;
  }

  const valor = servico.serie[indice];
  return valor === undefined || valor === null || !Number.isFinite(valor)
    ? null
    : valor;
}

export function somarNoMomento(
  servicos: ServicoNoMapa[],
  indice: number | null,
) {
  let soma: number | null = null;

  for (const servico of servicos) {
    const valor = emissaoNoMomento(servico, indice);
    if (valor !== null) {
      soma = (soma ?? 0) + valor;
    }
  }

  return soma;
}

export function somasDosIntervalos(
  grupos: ServicoNoMapa[][],
  totalDeIntervalos: number,
) {
  return grupos.flatMap((grupo) =>
    Array.from({ length: totalDeIntervalos }, (_, indice) =>
      somarNoMomento(grupo, indice),
    ),
  );
}

export function proximoIndice(indice: number | null, total: number) {
  if (total === 0) {
    return null;
  }
  if (indice === null || indice >= total - 1) {
    return 0;
  }

  return indice + 1;
}
