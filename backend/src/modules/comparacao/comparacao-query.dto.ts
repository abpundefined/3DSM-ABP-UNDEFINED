import { ApiProperty } from "@nestjs/swagger";
import { IsDefined, IsString } from "class-validator";
import { PeriodoDto } from "../indicadores/dto/periodo.dto";

export class ComparacaoQueryDto extends PeriodoDto {
  @ApiProperty({
    description: "De 2 a 5 IDs internos distintos, separados por vírgula.",
    example: "1,2,3",
  })
  @IsDefined({ message: "Informe de 2 a 5 IDs de serviços." })
  @IsString({
    message: "servicos deve ser uma lista de IDs separados por vírgula.",
  })
  servicos!: string;
}
