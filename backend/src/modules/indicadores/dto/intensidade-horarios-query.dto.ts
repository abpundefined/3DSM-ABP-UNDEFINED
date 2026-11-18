import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsOptional, IsString } from "class-validator";
import { PeriodoDto } from "./periodo.dto";

export class IntensidadeHorariosQueryDto extends PeriodoDto {
  @ApiProperty({ type: String, required: false })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  regiao?: string;
}
