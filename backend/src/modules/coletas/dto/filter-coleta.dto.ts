import { IsOptional, IsNumber, IsDate } from "class-validator";
import { Type } from "class-transformer";
import { ApiPropertyOptional } from "@nestjs/swagger";

export class FilterColetasDto {
  @ApiPropertyOptional({ type: Number, description: "ID interno do serviço." })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  servicoId?: number;

  @ApiPropertyOptional({
    type: String,
    format: "date-time",
    description: "Início inclusivo em ISO 8601.",
  })
  @IsDate()
  @IsOptional()
  @Type(() => Date)
  dataInicio?: Date;

  @ApiPropertyOptional({
    type: String,
    format: "date-time",
    description: "Fim inclusivo em ISO 8601.",
  })
  @IsDate()
  @IsOptional()
  @Type(() => Date)
  dataFim?: Date;
}
