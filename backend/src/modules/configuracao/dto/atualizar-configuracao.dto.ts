import { IsInt, IsNumber, IsOptional, Max, Min } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class AtualizarConfiguracaoDto {
  @ApiProperty({
    minimum: 10,
    maximum: 86400,
    example: 60,
    description: "Intervalo de descoberta em segundos.",
  })
  @IsInt({ message: "O intervalo de descoberta deve ser um número inteiro." })
  @Min(10, { message: "O intervalo de descoberta mínimo é 10 segundos." })
  @Max(86400, { message: "O intervalo de descoberta máximo é 86400 segundos." })
  intervaloDescobertaSegundos!: number;

  @ApiProperty({
    minimum: 10,
    maximum: 3600,
    example: 30,
    description: "Intervalo de coleta em segundos.",
  })
  @IsInt({ message: "O intervalo de coleta deve ser um número inteiro." })
  @Min(10, { message: "O intervalo de coleta mínimo é 10 segundos." })
  @Max(3600, { message: "O intervalo de coleta máximo é 3600 segundos." })
  intervaloColetaSegundos!: number;

  @ApiPropertyOptional({
    type: Number,
    minimum: 0,
    nullable: true,
    example: 500.5,
    description: "Meta mensal de emissões em kgCO₂e.",
  })
  @IsOptional()
  @IsNumber({}, { message: "A meta mensal deve ser um número." })
  @Min(0, { message: "A meta mensal não pode ser negativa." })
  metaMensalKgCo2e?: number | null;
}
