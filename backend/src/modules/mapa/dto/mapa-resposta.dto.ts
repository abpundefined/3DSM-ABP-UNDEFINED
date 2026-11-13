import { ApiProperty } from "@nestjs/swagger";

const ESTADOS_MONITORAMENTO = [
  "DISPONIVEL",
  "INDISPONIVEL",
  "SEM_METRICAS",
  "REMOVIDO",
  "DESCONHECIDO",
];

export class PeriodoConsultadoDto {
  @ApiProperty({ type: String, format: "date-time" }) inicio!: string;
  @ApiProperty({ type: String, format: "date-time" }) fim!: string;
}

export class TotaisMapaDto {
  @ApiProperty({
    type: Number,
    nullable: true,
    description: "Energia no período, em kWh. Nulo sem coleta calculada.",
  })
  energiaKwh!: number | null;

  @ApiProperty({
    type: Number,
    nullable: true,
    description: "Emissão no período, em gCO₂e. Nulo sem coleta calculada.",
  })
  emissaoGCo2e!: number | null;
}

export class ServicoSemCoordenadasDto {
  @ApiProperty() servicoId!: number;
  @ApiProperty() nome!: string;
  @ApiProperty({ enum: ESTADOS_MONITORAMENTO }) estado!: string;
  @ApiProperty() regiaoCodigo!: string;
  @ApiProperty({ type: TotaisMapaDto }) totais!: TotaisMapaDto;
}

export class ServicoNoMapaDto extends ServicoSemCoordenadasDto {
  @ApiProperty({ example: -23.5505 }) latitude!: number;
  @ApiProperty({ example: -46.6333 }) longitude!: number;
  @ApiProperty({ example: "Brasil · São Paulo" }) local!: string;

  @ApiProperty({
    type: "array",
    items: { type: "number", nullable: true },
    description:
      "Emissão em gCO₂e por intervalo, na mesma ordem de intervalos. Nulo quando não houve coleta calculada no intervalo.",
    example: [0.03, 0.02, null],
  })
  serie!: (number | null)[];
}

export class MapaRespostaDto {
  @ApiProperty({ type: PeriodoConsultadoDto }) periodo!: PeriodoConsultadoDto;

  @ApiProperty({
    enum: ["hora", "dia"],
    description:
      "hora para períodos de até 48 horas; dia acima disso, no fuso America/Sao_Paulo.",
  })
  granularidade!: "hora" | "dia";

  @ApiProperty({
    type: [String],
    format: "date-time",
    description: "Início de cada intervalo da série.",
  })
  intervalos!: string[];

  @ApiProperty({ type: [ServicoNoMapaDto] }) servicos!: ServicoNoMapaDto[];

  @ApiProperty({ type: [ServicoSemCoordenadasDto] })
  semCoordenadas!: ServicoSemCoordenadasDto[];
}
