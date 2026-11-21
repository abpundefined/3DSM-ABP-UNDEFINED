import { ApiProperty } from "@nestjs/swagger";
import { TipoOportunidade } from "../../../common/regras/oportunidades";

export class PeriodoOportunidadesDto {
  @ApiProperty({ format: "date-time" })
  inicio!: string;

  @ApiProperty({ format: "date-time" })
  fim!: string;
}

export class ResumoPorTipoDto {
  @ApiProperty()
  MIGRAR_REGIAO!: number;

  @ApiProperty()
  SUPERDIMENSIONAMENTO!: number;

  @ApiProperty()
  MUDAR_HORARIO!: number;
}

export class ResumoOportunidadesDto {
  @ApiProperty()
  totalOportunidades!: number;

  @ApiProperty()
  reducaoPotencialGCo2e!: number;

  @ApiProperty({ type: ResumoPorTipoDto })
  porTipo!: ResumoPorTipoDto;
}

export class LimiaresOportunidadesDto {
  @ApiProperty()
  reducaoMinimaMigrarRegiaoPercentual!: number;

  @ApiProperty()
  cpuMaximaSuperdimensionamentoPercentual!: number;

  @ApiProperty()
  reducaoEstimadaSuperdimensionamentoPercentual!: number;

  @ApiProperty()
  reducaoMinimaMudarHorarioPercentual!: number;

  @ApiProperty()
  duracaoJanelaHorarioHoras!: number;
}

export class OportunidadeItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  servicoId!: number;

  @ApiProperty()
  servicoNome!: string;

  @ApiProperty()
  regiaoCodigo!: string;

  @ApiProperty({
    enum: ["MIGRAR_REGIAO", "SUPERDIMENSIONAMENTO", "MUDAR_HORARIO"],
  })
  tipo!: TipoOportunidade;

  @ApiProperty()
  titulo!: string;

  @ApiProperty()
  explicacao!: string;

  @ApiProperty()
  economiaEstimadaGCo2e!: number;

  @ApiProperty()
  economiaPercentual!: number;

  @ApiProperty()
  emissaoAtualGCo2e!: number;

  @ApiProperty()
  linkDetalhe!: string;
}

export class OportunidadesRespostaDto {
  @ApiProperty({ type: PeriodoOportunidadesDto })
  periodo!: PeriodoOportunidadesDto;

  @ApiProperty({ type: ResumoOportunidadesDto })
  resumo!: ResumoOportunidadesDto;

  @ApiProperty({ type: LimiaresOportunidadesDto })
  limiares!: LimiaresOportunidadesDto;

  @ApiProperty()
  aviso!: string;

  @ApiProperty({ type: [OportunidadeItemDto] })
  oportunidades!: OportunidadeItemDto[];
}
