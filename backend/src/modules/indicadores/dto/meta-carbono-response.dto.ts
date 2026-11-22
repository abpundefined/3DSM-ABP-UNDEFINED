import { ApiProperty } from "@nestjs/swagger";

export class MetaCarbonoResponseDto {
  @ApiProperty({
    type: Number,
    nullable: true,
    example: 500.5,
    description: "Meta mensal de emissões em kgCO₂e, ou null se não definida.",
  })
  metaMensal!: number | null;

  @ApiProperty({
    type: Number,
    example: 120.25,
    description: "Emissões acumuladas no mês em kgCO₂e.",
  })
  acumuladoMes!: number;

  @ApiProperty({
    type: Number,
    example: 12,
    description: "Quantidade de dias decorridos no mês.",
  })
  diasDecorridos!: number;

  @ApiProperty({
    type: Number,
    example: 30,
    description: "Quantidade de dias no mês corrente.",
  })
  diasNoMes!: number;

  @ApiProperty({
    type: Number,
    example: 300.625,
    description: "Projeção de emissões para o mês em kgCO₂e.",
  })
  projecaoMes!: number;
}
