import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsDateString, IsEnum, IsOptional } from "class-validator";
import { IsValidDateRange } from "../../../common/validators/is-valid-date-range.decorator";

export enum PeriodoPredefinido {
  ULTIMAS_24_HORAS = "24h",
  ULTIMOS_7_DIAS = "7d",
  ULTIMOS_30_DIAS = "30d",
  MES_ATUAL = "mes-atual",
  MES_ANTERIOR = "mes-anterior",
}

export class PeriodoDto {
  @ApiPropertyOptional({ enum: PeriodoPredefinido })
  @IsOptional()
  @IsEnum(PeriodoPredefinido, {
    message: "periodo deve ser 24h, 7d, 30d, mes-atual ou mes-anterior.",
  })
  periodo?: PeriodoPredefinido;

  @ApiPropertyOptional({
    type: String,
    format: "date-time",
    description: "Início inclusivo em ISO 8601 com Z ou offset explícito.",
  })
  @IsOptional()
  @IsDateString(
    { strict: true, strictSeparator: true },
    { message: "inicio deve ser uma data válida em ISO 8601." },
  )
  inicio?: string;

  @ApiPropertyOptional({
    type: String,
    format: "date-time",
    description: "Fim inclusivo em ISO 8601 com Z ou offset explícito.",
  })
  @IsValidDateRange()
  fim?: string;
}
