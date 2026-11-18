import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsOptional, IsString } from "class-validator";
import { PeriodoDto } from "./periodo.dto";

export class IntensidadeHorariosQueryDto extends PeriodoDto {
  @ApiProperty({
    type: String,
    required: false,
    example: "br-sudeste",
    description:
      "Código da região. Sem ele, a matriz considera as coletas de todas as regiões.",
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: "Informe a região ou omita o parâmetro regiao." })
  regiao?: string;
}
