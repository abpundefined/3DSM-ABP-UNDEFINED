import type {
  CelulaDoHorario,
  MelhorJanela,
  RespostaHorarios,
} from '../types/horarios';

export const DIAS_NA_SEMANA = 7;
export const HORAS_NO_DIA = 24;
export const HORAS_DA_JANELA = 3;
export const FAIXAS_DE_INTENSIDADE = 5;

const DIAS = [
  'domingo',
  'segunda-feira',
  'terça-feira',
  'quarta-feira',
  'quinta-feira',
  'sexta-feira',
  'sábado',
] as const;

const DIAS_ABREVIADOS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const numero = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 });
const inteiro = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 });

export type EscalaDeIntensidade = {
  minimo: number;
  maximo: number;
  faixas: number;
  faixa: (valor: number | null) => number | null;
};

export type FaixaDaLegenda = { faixa: number; rotulo: string };

function ehObjeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === 'object' && valor !== null;
}

function ehNumeroNaoNegativoOuNulo(valor: unknown) {
  return (
    valor === null ||
    (typeof valor === 'number' && Number.isFinite(valor) && valor >= 0)
  );
}

function ehCelula(valor: unknown) {
  return (
    ehObjeto(valor) &&
    ehNumeroNaoNegativoOuNulo(valor.media) &&
    (valor.quantidadeAmostras === null ||
      (Number.isInteger(valor.quantidadeAmostras) &&
        (valor.quantidadeAmostras as number) >= 0))
  );
}

function ehInteiroEntre(valor: unknown, minimo: number, maximo: number) {
  return (
    typeof valor === 'number' &&
    Number.isInteger(valor) &&
    valor >= minimo &&
    valor <= maximo
  );
}

function ehMelhorJanela(valor: unknown) {
  return (
    valor === null ||
    (ehObjeto(valor) &&
      ehInteiroEntre(valor.diaSemana, 0, DIAS_NA_SEMANA - 1) &&
      ehInteiroEntre(valor.horaInicio, 0, HORAS_NO_DIA - 1) &&
      typeof valor.mediaJanela === 'number' &&
      Number.isFinite(valor.mediaJanela) &&
      valor.mediaJanela >= 0)
  );
}

export function ehRespostaHorarios(valor: unknown): valor is RespostaHorarios {
  return (
    ehObjeto(valor) &&
    typeof valor.fusoHorario === 'string' &&
    Array.isArray(valor.matriz) &&
    valor.matriz.length === DIAS_NA_SEMANA &&
    valor.matriz.every(
      (dia) =>
        Array.isArray(dia) &&
        dia.length === HORAS_NO_DIA &&
        dia.every(ehCelula),
    ) &&
    ehMelhorJanela(valor.melhorJanela)
  );
}

export function temAmostras(celula: CelulaDoHorario) {
  return (
    celula.media !== null &&
    celula.quantidadeAmostras !== null &&
    celula.quantidadeAmostras > 0
  );
}

export function contarSemAmostras(matriz: CelulaDoHorario[][]) {
  return matriz.flat().filter((celula) => !temAmostras(celula)).length;
}

export function mediaDaSemana(matriz: CelulaDoHorario[][]): number | null {
  let soma = 0;
  let total = 0;

  for (const celula of matriz.flat()) {
    if (temAmostras(celula)) {
      soma += celula.media! * celula.quantidadeAmostras!;
      total += celula.quantidadeAmostras!;
    }
  }

  return total === 0 ? null : soma / total;
}

export function criarEscalaDeIntensidade(
  matriz: CelulaDoHorario[][],
  faixas = FAIXAS_DE_INTENSIDADE,
): EscalaDeIntensidade | null {
  const medias = matriz
    .flat()
    .filter(temAmostras)
    .map(({ media }) => media!);

  if (medias.length === 0) {
    return null;
  }

  const minimo = Math.min(...medias);
  const maximo = Math.max(...medias);
  const largura = (maximo - minimo) / faixas;

  return {
    minimo,
    maximo,
    faixas,
    faixa(valor) {
      if (valor === null || !Number.isFinite(valor)) {
        return null;
      }
      if (largura === 0) {
        return 1;
      }

      return Math.min(faixas, Math.floor((valor - minimo) / largura) + 1);
    },
  };
}

export function criarLegendaDeIntensidade(
  escala: EscalaDeIntensidade,
): FaixaDaLegenda[] {
  if (escala.minimo === escala.maximo) {
    return [{ faixa: 1, rotulo: `${numero.format(escala.minimo)}` }];
  }

  const largura = (escala.maximo - escala.minimo) / escala.faixas;

  return Array.from({ length: escala.faixas }, (_, indice) => ({
    faixa: indice + 1,
    rotulo: `${numero.format(escala.minimo + indice * largura)} a ${numero.format(escala.minimo + (indice + 1) * largura)}`,
  }));
}

export function nomeDoDia(diaSemana: number) {
  return DIAS[diaSemana];
}

export function diaAbreviado(diaSemana: number) {
  return DIAS_ABREVIADOS[diaSemana];
}

export function rotuloDaHora(hora: number) {
  return `${String(hora).padStart(2, '0')}h`;
}

export function formatarIntensidade(valor: number) {
  return `${numero.format(valor)} gCO₂e/kWh`;
}

export function celulasDaJanela({
  diaSemana,
  horaInicio,
}: MelhorJanela): { dia: number; hora: number }[] {
  const horasNaSemana = DIAS_NA_SEMANA * HORAS_NO_DIA;
  const inicio = diaSemana * HORAS_NO_DIA + horaInicio;

  return Array.from({ length: HORAS_DA_JANELA }, (_, passo) => {
    const indice = (inicio + passo) % horasNaSemana;
    return {
      dia: Math.floor(indice / HORAS_NO_DIA),
      hora: indice % HORAS_NO_DIA,
    };
  });
}

export function descreverJanela(janela: MelhorJanela) {
  const celulas = celulasDaJanela(janela);
  const ultima = celulas[celulas.length - 1];
  const fimEm = (ultima.hora + 1) % HORAS_NO_DIA;
  const viraODia = ultima.dia !== janela.diaSemana;
  const inicio = rotuloDaHora(janela.horaInicio);
  const fim = rotuloDaHora(fimEm);

  return viraODia
    ? `${nomeDoDia(janela.diaSemana)}, ${inicio} até ${nomeDoDia(ultima.dia)}, ${fim}`
    : `${nomeDoDia(janela.diaSemana)}, ${inicio}–${fim}`;
}

export function descreverCelula(
  diaSemana: number,
  hora: number,
  celula: CelulaDoHorario,
) {
  const quando = `${nomeDoDia(diaSemana)}, ${rotuloDaHora(hora)}`;

  if (!temAmostras(celula)) {
    return `${quando}: sem amostras no período`;
  }

  const amostras = celula.quantidadeAmostras!;
  return `${quando}: ${formatarIntensidade(celula.media!)}, ${inteiro.format(amostras)} ${amostras === 1 ? 'amostra' : 'amostras'}`;
}

export function resumoDaMelhorJanela(
  dados: RespostaHorarios,
  nomeDaRegiao: string | null,
): string | null {
  const { melhorJanela, matriz } = dados;

  if (melhorJanela === null) {
    return null;
  }

  const onde = nomeDaRegiao ? ` em ${nomeDaRegiao}` : '';
  const base = `Melhor horário para processamentos pesados${onde}: ${descreverJanela(melhorJanela)}, com média de ${formatarIntensidade(melhorJanela.mediaJanela)}`;
  const media = mediaDaSemana(matriz);

  if (media === null || media === 0) {
    return `${base}.`;
  }

  const reducao = (1 - melhorJanela.mediaJanela / media) * 100;
  return reducao >= 1
    ? `${base}, ${inteiro.format(reducao)}% abaixo da média do período.`
    : `${base}.`;
}

export function formatarNumero(valor: number) {
  return numero.format(valor);
}
