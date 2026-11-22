import { Transform } from "class-transformer";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsIn, IsOptional } from "class-validator";
import { PeriodoDto } from "./periodo.dto";

function transformarBoolean(value: unknown): unknown {
  if (value === "true") {
    return true;
  }
  if (value === "false") {
    return false;
  }
  return value;
}

export class SerieTemporalQueryDto extends PeriodoDto {
  @ApiPropertyOptional({
    enum: ["hora", "dia"],
    description:
      "Granularidade da série. Se omitida, será calculada automaticamente.",
  })
  @IsOptional()
  @IsIn(["hora", "dia"], { message: "granularidade deve ser hora ou dia" })
  granularidade?: "hora" | "dia";

  @ApiPropertyOptional({
    type: Boolean,
    description: "Quando true, inclui séries por serviço.",
  })
  @IsOptional()
  @Transform(({ value }) => transformarBoolean(value))
  @IsBoolean()
  porServico?: boolean;
}
