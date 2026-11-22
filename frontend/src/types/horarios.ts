export type CelulaDoHorario = {
  media: number | null;
  quantidadeAmostras: number | null;
};

export type MelhorJanela = {
  diaSemana: number;
  horaInicio: number;
  mediaJanela: number;
};

export type RespostaHorarios = {
  fusoHorario: string;
  matriz: CelulaDoHorario[][];
  melhorJanela: MelhorJanela | null;
};
