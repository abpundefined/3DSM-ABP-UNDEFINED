import { ApiProperty } from "@nestjs/swagger";

export type EstadoIntegracao = "OPERACIONAL" | "FALHA" | "SEM_CONSULTA";

const ESTADOS_INTEGRACAO = ["OPERACIONAL", "FALHA", "SEM_CONSULTA"];

export class IntegracaoSaudeDto {
  @ApiProperty({
    enum: ESTADOS_INTEGRACAO,
    description:
      "OPERACIONAL: a última consulta funcionou. FALHA: a última consulta falhou. SEM_CONSULTA: ainda não houve consulta desde que o backend iniciou.",
  })
  estado!: EstadoIntegracao;

  @ApiProperty({ type: String, format: "date-time", nullable: true })
  ultimaConsultaEm!: string | null;

  @ApiProperty({
    type: Number,
    nullable: true,
    description: "Duração da última consulta, em milissegundos.",
  })
  tempoRespostaMs!: number | null;

  @ApiProperty({ type: String, format: "date-time", nullable: true })
  ultimoSucessoEm!: string | null;

  @ApiProperty({
    type: String,
    nullable: true,
    description:
      "Mensagem da última falha. Nulo quando a última consulta funcionou.",
  })
  mensagemErro!: string | null;
}

export class ColetasUltimaHoraDto {
  @ApiProperty() total!: number;
  @ApiProperty() falhas!: number;

  @ApiProperty({
    type: Number,
    nullable: true,
    description:
      "Falhas divididas pelo total, de 0 a 1. Nulo quando não houve coleta na última hora. Coleta sem métricas não conta como falha.",
  })
  taxaFalha!: number | null;
}

export class ServicosPorEstadoDto {
  @ApiProperty() DISPONIVEL!: number;
  @ApiProperty() INDISPONIVEL!: number;
  @ApiProperty() SEM_METRICAS!: number;
  @ApiProperty() REMOVIDO!: number;
  @ApiProperty() DESCONHECIDO!: number;
}

export class SaudeRespostaDto {
  @ApiProperty({ type: String, format: "date-time" }) geradoEm!: string;

  @ApiProperty({
    type: IntegracaoSaudeDto,
    description: "Consulta da lista de serviços ao agregador de métricas.",
  })
  agregador!: IntegracaoSaudeDto;

  @ApiProperty({
    type: IntegracaoSaudeDto,
    description: "Consulta da intensidade de carbono por região.",
  })
  apiCarbono!: IntegracaoSaudeDto;

  @ApiProperty({
    type: String,
    format: "date-time",
    nullable: true,
    description: "Última descoberta de serviços concluída com sucesso.",
  })
  ultimaDescobertaEm!: string | null;

  @ApiProperty({ type: ColetasUltimaHoraDto })
  coletasUltimaHora!: ColetasUltimaHoraDto;

  @ApiProperty({ type: ServicosPorEstadoDto })
  servicosPorEstado!: ServicosPorEstadoDto;
}
