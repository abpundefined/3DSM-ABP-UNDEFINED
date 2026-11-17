import { ApiProperty } from "@nestjs/swagger";

export class MatrizCelulaDto {
  @ApiProperty({ type: Number, nullable: true })
  media!: number | null;

  @ApiProperty({ type: Number, nullable: true })
  quantidadeAmostras!: number | null;
}

export class MelhorJanelaDto {
  @ApiProperty({ type: Number, minimum: 0, maximum: 6 })
  diaSemana!: number;

  @ApiProperty({ type: Number, minimum: 0, maximum: 21 })
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
