import {
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsString,
    IsEnum,
    IsDate
} from 'class-validator';
import {Type} from 'class-transformer';

export enum EstadoColetaEnum {
    SUCESSO = 'SUCESSO',
    SEM_METRICAS = 'SEM_METRICAS',
    FALHA = 'FALHA',
}

export class CreateColetaDto{
    @IsNumber()
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
    @Type(()=> Date)
    iniciadaEm?: Date;

    @IsDate()
    @IsOptional()
    @Type(()=> Date)
    finalizadaEm?: Date;

    @IsNumber()
    @IsOptional()
    intervaloColetaSegundos?: number;

    @IsString()
  @IsOptional()
  codigoErro?: string;

  @IsString()
  @IsOptional()
  mensagemErro?: string;

  @IsNumber()
  @IsOptional()
  cpuPercent?: number;

  @IsNumber()
  @IsOptional()
  memoryGb?: number;

  @IsNumber()
  @IsOptional()
  diskGb?: number;

  @IsNumber()
  @IsOptional()
  networkGb?: number;

  @IsNumber()
  @IsOptional()
  intensidadeCarbonoGCo2ePorKwh?: number;

  @IsNumber()
  @IsOptional()
  energiaKwh?: number;

  @IsNumber()
  @IsOptional()
  emissaoGCo2e?: number;
}