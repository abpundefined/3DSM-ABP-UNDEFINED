import {
  IsNotEmpty,
  IsNumber,
  IsInt,
  Min,
  Max,
  IsOptional,
  IsString,
  IsEnum,
  IsDate,
} from "class-validator";
import { Type } from "class-transformer";
import { EstadoCalculoEnum, EstadoColetaEnum } from "../estados-coleta.enum";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export { EstadoCalculoEnum, EstadoColetaEnum };

export class CreateColetaDto {
  @ApiProperty({ example: 1, description: "ID interno do serviço." })
  @IsInt({
    message: 'O ID do serviço deve ser um número inteiro (sem decimais).',
  })
  @IsNotEmpty()
  servicoId!: number;

  @ApiProperty({ enum: EstadoColetaEnum, example: EstadoColetaEnum.SUCESSO })
  @IsEnum(EstadoColetaEnum)
  @IsNotEmpty()
  estadoColeta!: EstadoColetaEnum;

  @ApiPropertyOptional({
    type: String,
    description: "Código da região na coleta.",
  })
  @IsString()
  @IsOptional()
  regiaoCodigoNaColeta?: string;

  @ApiPropertyOptional({ type: String, format: "date-time" })
  @IsDate()
  @IsOptional()
  @Type(() => Date)
  iniciadaEm?: Date;

  @ApiPropertyOptional({ type: String, format: "date-time" })
  @IsDate()
  @IsOptional()
  @Type(() => Date)
  finalizadaEm?: Date;

  @ApiPropertyOptional({
    type: Number,
    minimum: 1,
    description: "Intervalo da coleta em segundos.",
  })
  @IsInt({
    message: 'O intervalo de coleta deve ser um número inteiro em segundos.',
  })
  @Min(1, { message: 'O intervalo de coleta deve ser de no mínimo 1 segundo.' })
  @IsOptional()
  intervaloColetaSegundos?: number;

  @ApiPropertyOptional({ type: String })
  @IsString()
  @IsOptional()
  codigoErro?: string;

  @ApiPropertyOptional({ type: String })
  @IsString()
  @IsOptional()
  mensagemErro?: string;

  @ApiPropertyOptional({
    type: Number,
    minimum: 0,
    maximum: 100,
    description: "Uso de CPU em porcentagem.",
  })
  @IsNumber()
  @Min(0, { message: 'O uso de CPU não pode ser negativo.' })
  @Max(100, { message: 'O uso de CPU não pode ultrapassar 100%.' })
  @IsOptional()
  cpuPercent?: number;

  @ApiPropertyOptional({
    type: Number,
    minimum: 0,
    description: "Memória em GB.",
  })
  @IsNumber()
  @Min(0, { message: 'A memória não pode ter valor negativo.' })
  @IsOptional()
  memoryGb?: number;

  @ApiPropertyOptional({
    type: Number,
    minimum: 0,
    description: "Disco em GB.",
  })
  @IsNumber()
  @Min(0, { message: 'O disco não pode ter valor negativo.' })
  @IsOptional()
  diskGb?: number;

  @ApiPropertyOptional({ type: Number, minimum: 0, description: "Rede em GB." })
  @IsNumber()
  @Min(0, { message: 'A rede não pode ter valor negativo.' })
  @IsOptional()
  networkGb?: number;

  @ApiPropertyOptional({
    type: Number,
    minimum: 0,
    description: "Intensidade de carbono em gCO₂e/kWh.",
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  intensidadeCarbonoGCo2ePorKwh?: number;

  @ApiPropertyOptional({
    type: Number,
    minimum: 0,
    description: "Energia em kWh.",
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  energiaKwh?: number;

  @ApiPropertyOptional({
    type: Number,
    minimum: 0,
    description: "Emissão em gCO₂e.",
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  emissaoGCo2e?: number;

  @ApiPropertyOptional({
    enum: EstadoCalculoEnum,
    description:
      "Estado do cálculo; o backend redefine este campo ao registrar a coleta.",
  })
  @IsEnum(EstadoCalculoEnum)
  @IsOptional()
  estadoCalculo?: EstadoCalculoEnum;
}
