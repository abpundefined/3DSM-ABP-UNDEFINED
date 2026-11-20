import { IsOptional, IsNumber, IsDate, IsInt, Min, Max } from "class-validator";
import { Type } from "class-transformer";
import { ApiPropertyOptional } from "@nestjs/swagger";

export class FilterColetasDto {
  @ApiPropertyOptional({
    type: Number,
    minimum: 1,
    default: 1,
    description: "Página do histórico, começando em 1.",
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: "pagina deve ser um número inteiro." })
  @Min(1, { message: "pagina deve ser maior ou igual a 1." })
  pagina?: number = 1;

  @ApiPropertyOptional({
    type: Number,
    minimum: 1,
    maximum: 100,
    default: 20,
    description: "Quantidade de coletas por página.",
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: "tamanho deve ser um número inteiro." })
  @Min(1, { message: "tamanho deve ser maior ou igual a 1." })
  @Max(100, { message: "tamanho deve ser menor ou igual a 100." })
  tamanho?: number = 20;

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
