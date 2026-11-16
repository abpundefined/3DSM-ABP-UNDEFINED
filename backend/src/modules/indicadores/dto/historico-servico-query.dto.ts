import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsIn, IsOptional } from "class-validator";
import { PeriodoDto } from "./periodo.dto";

export class HistoricoServicoQueryDto extends PeriodoDto {
  @ApiPropertyOptional({
    enum: ["hora", "dia"],
    description:
      "Granularidade do histórico. Se omitida, será calculada automaticamente: hora até 48 horas e dia acima disso.",
  })
  @IsOptional()
  @IsIn(["hora", "dia"], { message: "granularidade deve ser hora ou dia" })
  granularidade?: "hora" | "dia";
}
