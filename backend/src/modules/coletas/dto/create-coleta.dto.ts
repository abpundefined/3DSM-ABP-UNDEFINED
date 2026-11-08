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

export { EstadoCalculoEnum, EstadoColetaEnum };

export class CreateColetaDto {
  @IsInt({
    message: "O ID do serviço deve ser um número inteiro (sem decimais).",
  })
  @IsNotEmpty()
  servicoId!: number;

  @IsEnum(EstadoColetaEnum)
  @IsNotEmpty()
  estadoColeta!: EstadoColetaEnum;

  @IsString()
  @IsOptional()
  regiaoCodigoNaColeta?: string;

  @IsDate()
  @IsOptional()
  @Type(() => Date)
  iniciadaEm?: Date;

  @IsDate()
  @IsOptional()
  @Type(() => Date)
  finalizadaEm?: Date;

  @IsInt({
    message: "O intervalo de coleta deve ser um número inteiro em segundos.",
  })
  @Min(1, { message: "O intervalo de coleta deve ser de no mínimo 1 segundo." })
  @IsOptional()
  intervaloColetaSegundos?: number;

  @IsString()
  @IsOptional()
  codigoErro?: string;

  @IsString()
  @IsOptional()
  mensagemErro?: string;

  @IsNumber()
  @Min(0, { message: "O uso de CPU não pode ser negativo." })
  @Max(100, { message: "O uso de CPU não pode ultrapassar 100%." })
  @IsOptional()
  cpuPercent?: number;

  @IsNumber()
  @Min(0, { message: "A memória não pode ter valor negativo." })
  @IsOptional()
  memoryGb?: number;

  @IsNumber()
  @Min(0, { message: "O disco não pode ter valor negativo." })
  @IsOptional()
  diskGb?: number;

  @IsNumber()
  @Min(0, { message: "A rede não pode ter valor negativo." })
  @IsOptional()
  networkGb?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  intensidadeCarbonoGCo2ePorKwh?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  energiaKwh?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  emissaoGCo2e?: number;

  @IsEnum(EstadoCalculoEnum)
  @IsOptional()
  estadoCalculo?: EstadoCalculoEnum;
}
