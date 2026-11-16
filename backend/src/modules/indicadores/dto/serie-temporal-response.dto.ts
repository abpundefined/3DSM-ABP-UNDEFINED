import { ApiProperty } from "@nestjs/swagger";

export class SerieTemporalPontoDto {
  @ApiProperty({ type: String, format: "date-time" })
  inicio!: string;

  @ApiProperty({ type: Number, nullable: true })
  energiaKwh!: number | null;

  @ApiProperty({ type: Number, nullable: true })
  emissaoGCo2e!: number | null;
}

export class SerieTemporalServicoDto {
  @ApiProperty()
  servicoId!: number;

  @ApiProperty()
  nome!: string;

  @ApiProperty({ type: [SerieTemporalPontoDto] })
  serie!: SerieTemporalPontoDto[];
}

export class SerieTemporalResponseDto {
  @ApiProperty({
    type: "object",
    required: ["inicio", "fim"],
    properties: {
      inicio: { type: "string", format: "date-time" },
      fim: { type: "string", format: "date-time" },
    },
  })
  periodo!: { inicio: string; fim: string };

  @ApiProperty({ enum: ["hora", "dia"] })
  granularidade!: "hora" | "dia";

  @ApiProperty({ type: [String], format: "date-time" })
  intervalos!: string[];

  @ApiProperty({ type: [SerieTemporalPontoDto] })
  global!: SerieTemporalPontoDto[];

  @ApiProperty({ type: [SerieTemporalServicoDto] })
  servicos!: SerieTemporalServicoDto[];
}
