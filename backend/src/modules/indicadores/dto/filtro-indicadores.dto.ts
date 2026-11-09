import { IsDate, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class FiltroIndicadoresDto {
  @IsOptional()
  @Type(() => Date)
  @IsDate({ message: 'dataInicio deve ser uma data válida (ISO 8601).' })
  dataInicio?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate({ message: 'dataFim deve ser uma data válida (ISO 8601).' })
  dataFim?: Date;
}
