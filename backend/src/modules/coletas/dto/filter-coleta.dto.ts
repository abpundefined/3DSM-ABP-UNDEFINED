import { IsOptional, IsNumber, IsDate } from 'class-validator';
import { Type } from 'class-transformer';

export class FilterColetasDto {
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  servicoId?: number;

  @IsDate()
  @IsOptional()
  @Type(() => Date)
  dataInicio?: Date;

  @IsDate()
  @IsOptional()
  @Type(() => Date)
  dataFim?: Date;
}