import { ApiProperty } from "@nestjs/swagger";

export class MatrizCelulaDto {
  @ApiProperty({ type: Number, nullable: true })
  media!: number | null;

  @ApiProperty({ type: Number, nullable: true })
  quantidadeAmostras!: number | null;
}

export class MelhorJanelaDto {
  @ApiProperty({
    type: Number,
    minimum: 0,
    maximum: 6,
    description:
      "Dia da semana no fuso America/Sao_Paulo: 0 = domingo, 6 = sábado.",
  })
  diaSemana!: number;

  @ApiProperty({
    type: Number,
    minimum: 0,
    maximum: 23,
    description:
      "Hora de início da janela de 3 horas; a janela pode atravessar a meia-noite.",
  })
  horaInicio!: number;

  @ApiProperty({ type: Number })
  mediaJanela!: number;
}

export class IntensidadeHorariosResponseDto {
  @ApiProperty({ example: "America/Sao_Paulo" })
  fusoHorario!: string;

  @ApiProperty({ type: () => [[MatrizCelulaDto]] })
  matriz!: MatrizCelulaDto[][];

  @ApiProperty({ type: MelhorJanelaDto, nullable: true })
  melhorJanela!: MelhorJanelaDto | null;
}
