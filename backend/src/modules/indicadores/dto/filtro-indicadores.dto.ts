import { IsDate, IsOptional } from "class-validator";
import { Type } from "class-transformer";
import { ApiPropertyOptional } from "@nestjs/swagger";

export class FiltroIndicadoresDto {
  @ApiPropertyOptional({
    type: String,
    format: "date-time",
    description:
      "Início inclusivo em ISO 8601; por padrão, 24 horas antes do fim.",
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate({ message: 'dataInicio deve ser uma data válida (ISO 8601).' })
  dataInicio?: Date;

  @ApiPropertyOptional({
    type: String,
    format: "date-time",
    description: "Fim inclusivo em ISO 8601; por padrão, o instante atual.",
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate({ message: 'dataFim deve ser uma data válida (ISO 8601).' })
  dataFim?: Date;
}
