export const MINIMO_PONTOS_PICO = 12;
export const MULTIPLICADOR_DESVIO_PICO = 3;

export type PontoSeriePico = {
  inicio: string;
  valor: number | null;
};

export type PicoIncomum = {
  indice: number;
  inicio: string;
  valor: number;
  desviosAcimaDaMedia: number;
  anotacao: string;
  horarioCompleto: string;
};

export type ResumoPicosIncomuns = {
  media: number | null;
  desvioPadrao: number | null;
  limiar: number | null;
  pontosValidos: number;
  picos: PicoIncomum[];
};

const FORMATADOR_HORA_PARTES = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'America/Sao_Paulo',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

const FORMATADOR_DATA_CURTA = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'America/Sao_Paulo',
  day: '2-digit',
  month: '2-digit',
});

const FORMATADOR_DATA_HORA_COMPLETA = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'America/Sao_Paulo',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

const FORMATADOR_DATA_COMPLETA = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'America/Sao_Paulo',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

export function formatarAnotacaoPico(
  inicioIso: string,
  granularidadeHoraria: boolean,
): string {
  const data = new Date(inicioIso);
  if (!Number.isFinite(data.getTime())) {
    return 'pico incomum';
  }

  if (!granularidadeHoraria) {
    return `pico incomum em ${FORMATADOR_DATA_CURTA.format(data)}`;
  }

  const partes = FORMATADOR_HORA_PARTES.formatToParts(data);
  const hora = partes.find((parte) => parte.type === 'hour')?.value ?? '00';
  const minuto = partes.find((parte) => parte.type === 'minute')?.value ?? '00';
  const horaTexto = minuto === '00' ? `${hora}h` : `${hora}h${minuto}`;

  return `pico incomum às ${horaTexto}`;
}

export function formatarHorarioCompletoPico(
  inicioIso: string,
  granularidadeHoraria: boolean,
): string {
  const data = new Date(inicioIso);
  if (!Number.isFinite(data.getTime())) {
    return 'Data indisponível';
  }
  return granularidadeHoraria
    ? FORMATADOR_DATA_HORA_COMPLETA.format(data)
    : FORMATADOR_DATA_COMPLETA.format(data);
}

export function detectarPicosIncomuns(
  pontos: readonly PontoSeriePico[],
  granularidadeHoraria = true,
): ResumoPicosIncomuns {
  const validos: { indice: number; inicio: string; valor: number }[] = [];

  for (let indice = 0; indice < pontos.length; indice += 1) {
    const ponto = pontos[indice];
    if (typeof ponto.valor === 'number' && Number.isFinite(ponto.valor)) {
      validos.push({
        indice,
        inicio: ponto.inicio,
        valor: ponto.valor,
      });
    }
  }

  if (validos.length < MINIMO_PONTOS_PICO) {
    return {
      media: null,
      desvioPadrao: null,
      limiar: null,
      pontosValidos: validos.length,
      picos: [],
    };
  }

  const soma = validos.reduce((acc, item) => acc + item.valor, 0);
  const media = soma / validos.length;
  const variancia =
    validos.reduce((acc, item) => acc + (item.valor - media) ** 2, 0) /
    validos.length;
  const desvioPadrao = Math.sqrt(variancia);

  if (desvioPadrao <= 1e-12) {
    return {
      media,
      desvioPadrao: 0,
      limiar: media,
      pontosValidos: validos.length,
      picos: [],
    };
  }

  const limiar = media + MULTIPLICADOR_DESVIO_PICO * desvioPadrao;
  const picos: PicoIncomum[] = validos
    .filter((item) => item.valor > limiar)
    .map((item) => ({
      indice: item.indice,
      inicio: item.inicio,
      valor: item.valor,
      desviosAcimaDaMedia: (item.valor - media) / desvioPadrao,
      anotacao: formatarAnotacaoPico(item.inicio, granularidadeHoraria),
      horarioCompleto: formatarHorarioCompletoPico(
        item.inicio,
        granularidadeHoraria,
      ),
    }));

  return {
    media,
    desvioPadrao,
    limiar,
    pontosValidos: validos.length,
    picos,
  };
}
