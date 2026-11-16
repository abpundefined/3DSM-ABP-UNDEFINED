import { ApiProperty } from "@nestjs/swagger";
import { PeriodoConsultadoDto } from "../../mapa/dto/mapa-resposta.dto";

export class ServicoSimuladoDto {
  @ApiProperty() servicoId!: number;
  @ApiProperty() nome!: string;
  @ApiProperty({ example: "us-east" }) regiaoCodigo!: string;
}

export class RegiaoSimuladaDto {
  @ApiProperty({ example: "br-sudeste" }) codigo!: string;
  @ApiProperty({ example: "Brasil" }) pais!: string;
  @ApiProperty({ example: "Sudeste" }) regiao!: string;
  @ApiProperty({ type: String, nullable: true, example: "São Paulo" })
  cidade!: string | null;

  @ApiProperty({
    type: Number,
    nullable: true,
    description:
      "Intensidade média de carbono da região no período, em gCO₂e/kWh. Nulo sem amostras.",
  })
  intensidadeGCo2ePorKwh!: number | null;

  @ApiProperty({ description: "Coletas com intensidade usadas na média." })
  amostrasIntensidade!: number;

  @ApiProperty({
    type: Number,
    nullable: true,
    description: "Energia do período × intensidade da região, em gCO₂e.",
  })
  emissaoEstimadaGCo2e!: number | null;

  @ApiProperty({
    type: Number,
    nullable: true,
    description:
      "Estimada menos a da região atual, em gCO₂e. Negativo = redução.",
  })
  diferencaGCo2e!: number | null;

  @ApiProperty({
    type: Number,
    nullable: true,
    description:
      "Diferença em relação à região atual, em %. Nulo quando a emissão atual é zero ou desconhecida.",
  })
  diferencaPercentual!: number | null;

  @ApiProperty() atual!: boolean;
  @ApiProperty() menorEmissao!: boolean;
}

export class SimulacaoRegiaoRespostaDto {
  @ApiProperty({ type: PeriodoConsultadoDto }) periodo!: PeriodoConsultadoDto;
  @ApiProperty({ type: ServicoSimuladoDto }) servico!: ServicoSimuladoDto;

  @ApiProperty({
    type: Number,
    nullable: true,
    description:
      "Energia do serviço no período, em kWh. Nulo sem coleta calculada.",
  })
  energiaKwh!: number | null;

  @ApiProperty() coletasConsideradas!: number;

  @ApiProperty({
    type: Number,
    nullable: true,
    description:
      "Emissão estimada na região atual, com a mesma regra, em gCO₂e.",
  })
  emissaoAtualGCo2e!: number | null;

  @ApiProperty({
    type: String,
    nullable: true,
    description:
      "Região de menor emissão estimada. Nulo sem energia no período.",
  })
  melhorRegiaoCodigo!: string | null;

  @ApiProperty({
    type: [RegiaoSimuladaDto],
    description:
      "Ordenadas da menor para a maior intensidade; regiões sem intensidade no fim.",
  })
  regioes!: RegiaoSimuladaDto[];
}
