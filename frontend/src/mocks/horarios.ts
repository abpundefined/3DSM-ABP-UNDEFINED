import type {
  CelulaDoHorario,
  MelhorJanela,
  RespostaHorarios,
} from '../types/horarios';
import {
  DIAS_NA_SEMANA,
  HORAS_DA_JANELA,
  HORAS_NO_DIA,
  temAmostras,
} from '../utils/horarios.ts';
import { simulacaoDemo } from './simulacao.ts';

// Gerado a partir das intensidades do mapa de demonstração. Não representa coletas reais.
const HORA_DO_PICO = 15;
const VARIACAO_NO_DIA = 0.25;
const QUEDA_NO_FIM_DE_SEMANA = 0.08;
const REGIAO_COM_LACUNA = 'jp-east';

function arredondar(valor: number) {
  return Math.round(valor * 10) / 10;
}

function fator(dia: number, hora: number) {
  const fase = (2 * Math.PI * (hora - HORA_DO_PICO)) / HORAS_NO_DIA;
  const fimDeSemana = dia === 0 || dia === 6;
  return (
    1 +
    VARIACAO_NO_DIA * Math.cos(fase) -
    (fimDeSemana ? QUEDA_NO_FIM_DE_SEMANA : 0)
  );
}

function matrizVazia(): CelulaDoHorario[][] {
  return Array.from({ length: DIAS_NA_SEMANA }, () =>
    Array.from({ length: HORAS_NO_DIA }, () => ({
      media: null,
      quantidadeAmostras: null,
    })),
  );
}

function matrizDaRegiao(codigo: string, intensidade: number) {
  const matriz = matrizVazia();

  for (let dia = 0; dia < DIAS_NA_SEMANA; dia += 1) {
    for (let hora = 0; hora < HORAS_NO_DIA; hora += 1) {
      const semColeta =
        codigo === REGIAO_COM_LACUNA && dia === 0 && hora < HORAS_DA_JANELA * 2;

      if (!semColeta) {
        matriz[dia][hora] = {
          media: arredondar(intensidade * fator(dia, hora)),
          quantidadeAmostras: 4 + ((dia + hora) % 2),
        };
      }
    }
  }

  return matriz;
}

function combinar(matrizes: CelulaDoHorario[][][]) {
  const matriz = matrizVazia();

  for (let dia = 0; dia < DIAS_NA_SEMANA; dia += 1) {
    for (let hora = 0; hora < HORAS_NO_DIA; hora += 1) {
      const celulas = matrizes.map((m) => m[dia][hora]).filter(temAmostras);
      const amostras = celulas.reduce(
        (soma, { quantidadeAmostras }) => soma + quantidadeAmostras!,
        0,
      );

      if (amostras > 0) {
        const ponderada = celulas.reduce(
          (soma, { media, quantidadeAmostras }) =>
            soma + media! * quantidadeAmostras!,
          0,
        );
        matriz[dia][hora] = {
          media: arredondar(ponderada / amostras),
          quantidadeAmostras: amostras,
        };
      }
    }
  }

  return matriz;
}

export function calcularMelhorJanela(
  matriz: CelulaDoHorario[][],
): MelhorJanela | null {
  const horasNaSemana = DIAS_NA_SEMANA * HORAS_NO_DIA;
  let melhor: MelhorJanela | null = null;

  for (let inicio = 0; inicio < horasNaSemana; inicio += 1) {
    const celulas = Array.from({ length: HORAS_DA_JANELA }, (_, passo) => {
      const indice = (inicio + passo) % horasNaSemana;
      return matriz[Math.floor(indice / HORAS_NO_DIA)][indice % HORAS_NO_DIA];
    });

    if (!celulas.every(temAmostras)) {
      continue;
    }

    const amostras = celulas.reduce(
      (soma, { quantidadeAmostras }) => soma + quantidadeAmostras!,
      0,
    );
    const mediaJanela =
      celulas.reduce(
        (soma, { media, quantidadeAmostras }) =>
          soma + media! * quantidadeAmostras!,
        0,
      ) / amostras;

    if (melhor === null || mediaJanela < melhor.mediaJanela) {
      melhor = {
        diaSemana: Math.floor(inicio / HORAS_NO_DIA),
        horaInicio: inicio % HORAS_NO_DIA,
        mediaJanela,
      };
    }
  }

  return melhor;
}

export function horariosDemo(regiaoCodigo: string | null): RespostaHorarios {
  const regioes = (simulacaoDemo(1)?.regioes ?? []).filter(
    (regiao) => regiao.intensidadeGCo2ePorKwh !== null,
  );
  const matrizes = regioes
    .filter((regiao) => regiaoCodigo === null || regiao.codigo === regiaoCodigo)
    .map((regiao) =>
      matrizDaRegiao(regiao.codigo, regiao.intensidadeGCo2ePorKwh!),
    );
  const matriz = matrizes.length === 0 ? matrizVazia() : combinar(matrizes);

  return {
    fusoHorario: 'America/Sao_Paulo',
    matriz,
    melhorJanela: calcularMelhorJanela(matriz),
  };
}
