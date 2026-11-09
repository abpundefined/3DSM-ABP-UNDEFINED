import { ApiProperty } from "@nestjs/swagger";
import {
  EstadoCalculoEnum,
  EstadoColetaEnum,
} from "../../modules/coletas/estados-coleta.enum";

export class ServicoRespostaDto {
  @ApiProperty() id!: number;
  @ApiProperty() idExterno!: string;
  @ApiProperty() nome!: string;
  @ApiProperty() regiaoCodigo!: string;
  @ApiProperty() caminhoMetricas!: string;
  @ApiProperty({
    enum: [
      "DISPONIVEL",
      "INDISPONIVEL",
      "SEM_METRICAS",
      "REMOVIDO",
      "DESCONHECIDO",
    ],
  })
  estadoAtual!: string;
  @ApiProperty({ type: String, format: "date-time" }) descobertoEm!: Date;
  @ApiProperty({ type: String, format: "date-time" }) ultimaVezListadoEm!: Date;
  @ApiProperty({ type: String, format: "date-time" }) atualizadoEm!: Date;
}

export class ServicoDescobertoRespostaDto {
  @ApiProperty() idExterno!: string;
  @ApiProperty() nome!: string;
  @ApiProperty() localizacao!: string;
  @ApiProperty({ type: String, nullable: true }) cidade!: string | null;
  @ApiProperty({ type: String, nullable: true }) pais!: string | null;
  @ApiProperty({ type: String, nullable: true }) regiao!: string | null;
  @ApiProperty({ type: String, nullable: true }) regiaoCodigo!: string | null;
  @ApiProperty({ type: Number, nullable: true }) latitude!: number | null;
  @ApiProperty({ type: Number, nullable: true }) longitude!: number | null;
  @ApiProperty() caminhoMetricas!: string;
}

export class RegiaoRespostaDto {
  @ApiProperty() codigo!: string;
  @ApiProperty() pais!: string;
  @ApiProperty() regiao!: string;
  @ApiProperty({ type: String, nullable: true }) cidade!: string | null;
  @ApiProperty({ type: Number, nullable: true }) latitude!: number | null;
  @ApiProperty({ type: Number, nullable: true }) longitude!: number | null;
  @ApiProperty({ type: String, format: "date-time" }) atualizadaEm!: Date;
}

export class ColetaRespostaDto {
  @ApiProperty() id!: number;
  @ApiProperty() servicoId!: number;
  @ApiProperty({ type: String, nullable: true }) regiaoCodigoNaColeta!:
    string | null;
  @ApiProperty({ type: String, format: "date-time" }) iniciadaEm!: Date;
  @ApiProperty({ type: String, format: "date-time", nullable: true })
  finalizadaEm!: Date | null;
  @ApiProperty({ type: Number, nullable: true }) intervaloColetaSegundos!:
    number | null;
  @ApiProperty({ enum: EstadoColetaEnum }) estadoColeta!: EstadoColetaEnum;
  @ApiProperty({ type: String, nullable: true }) codigoErro!: string | null;
  @ApiProperty({ type: String, nullable: true }) mensagemErro!: string | null;
  @ApiProperty({ type: Number, nullable: true }) cpuPercent!: number | null;
  @ApiProperty({ type: Number, nullable: true }) memoryGb!: number | null;
  @ApiProperty({ type: Number, nullable: true }) diskGb!: number | null;
  @ApiProperty({ type: Number, nullable: true }) networkGb!: number | null;
  @ApiProperty({ type: Number, nullable: true })
  intensidadeCarbonoGCo2ePorKwh!: number | null;
  @ApiProperty({ type: String, format: "date-time", nullable: true })
  consultadaCarbonoEm!: Date | null;
  @ApiProperty({ type: String, format: "date-time", nullable: true })
  inicioPeriodo!: Date | null;
  @ApiProperty({ type: String, format: "date-time", nullable: true })
  fimPeriodo!: Date | null;
  @ApiProperty({ type: Number, nullable: true }) energiaKwh!: number | null;
  @ApiProperty({ type: Number, nullable: true }) emissaoGCo2e!: number | null;
  @ApiProperty({ enum: EstadoCalculoEnum }) estadoCalculo!: EstadoCalculoEnum;
  @ApiProperty({ type: String, nullable: true }) versaoCalculo!: string | null;
}

export class ServicoResumoRespostaDto {
  @ApiProperty() idExterno!: string;
  @ApiProperty() nome!: string;
}

export class HistoricoColetaRespostaDto extends ColetaRespostaDto {
  @ApiProperty({ type: ServicoResumoRespostaDto })
  servico!: ServicoResumoRespostaDto;
}

export class DetalheColetaRespostaDto extends ColetaRespostaDto {
  @ApiProperty({ type: ServicoRespostaDto }) servico!: ServicoRespostaDto;
  @ApiProperty({ type: RegiaoRespostaDto, nullable: true })
  regiao!: RegiaoRespostaDto | null;
}

export class UltimaColetaRespostaDto {
  @ApiProperty({ enum: ["CACHE_FALLBACK"] }) fonte!: string;
  @ApiProperty() mensagem!: string;
  @ApiProperty({ type: ColetaRespostaDto }) dados!: ColetaRespostaDto;
}

export class ConfiguracaoRespostaDto {
  @ApiProperty() intervaloDescobertaSegundos!: number;
  @ApiProperty() intervaloColetaSegundos!: number;
  @ApiProperty({ type: String, format: "date-time", nullable: true })
  atualizadaEm!: Date | null;
  @ApiProperty() padrao!: boolean;
}

export class PeriodoIndicadoresRespostaDto {
  @ApiProperty({ type: String, format: "date-time" }) inicio!: Date;
  @ApiProperty({ type: String, format: "date-time" }) fim!: Date;
}

export class ServicosIndicadoresRespostaDto {
  @ApiProperty() monitorados!: number;
  @ApiProperty() disponiveis!: number;
  @ApiProperty() indisponiveis!: number;
  @ApiProperty() semMetricas!: number;
  @ApiProperty() desconhecidos!: number;
  @ApiProperty() removidos!: number;
}

export class IndicadoresRespostaDto {
  @ApiProperty({ type: PeriodoIndicadoresRespostaDto })
  periodo!: PeriodoIndicadoresRespostaDto;
  @ApiProperty({ description: "Energia total em kWh." })
  energiaTotalKwh!: number;
  @ApiProperty({ description: "Emissão total em gCO₂e." })
  emissaoTotalGCo2e!: number;
  @ApiProperty() coletasCalculadas!: number;
  @ApiProperty({ type: ServicosIndicadoresRespostaDto })
  servicos!: ServicosIndicadoresRespostaDto;
  @ApiProperty({ type: String, format: "date-time", nullable: true })
  ultimaColetaEm!: Date | null;
  @ApiProperty({ type: String, format: "date-time" }) geradoEm!: Date;
}
