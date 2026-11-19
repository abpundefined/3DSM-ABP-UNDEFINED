import { ApiProperty } from "@nestjs/swagger";
import { ComponentesEnergiaRespostaDto } from "../../../common/swagger/respostas.dto";

export class HistoricoServicoRespostaDto {
  @ApiProperty({ type: String, format: "date-time" }) inicio!: string;
  @ApiProperty({ type: Number, nullable: true }) energiaKwh!: number | null;
  @ApiProperty({ type: Number, nullable: true })
  emissaoGCo2e!: number | null;
  @ApiProperty({ type: Number, nullable: true }) cpuMedia!: number | null;
  @ApiProperty({ type: Number, nullable: true })
  memoriaMediaMb!: number | null;
  @ApiProperty({ type: Number, nullable: true }) coletas!: number | null;
  @ApiProperty({ type: Number }) ativo!: number;
  @ApiProperty({ type: Number }) indisponivel!: number;
  @ApiProperty({ type: Number }) semMetricas!: number;
  @ApiProperty({ type: ComponentesEnergiaRespostaDto, nullable: true })
  componentes!: ComponentesEnergiaRespostaDto | null;
}
