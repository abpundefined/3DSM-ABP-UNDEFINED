import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ConfiguracaoRepository } from "./configuracao.repository";
import { AtualizarConfiguracaoDto } from "./dto/atualizar-configuracao.dto";

export interface ConfiguracaoAtual {
  intervaloDescobertaSegundos: number;
  intervaloColetaSegundos: number;
  atualizadaEm: Date | null;
  padrao: boolean;
}

@Injectable()
export class ConfiguracaoService {
  constructor(
    private readonly configuracaoRepository: ConfiguracaoRepository,
    private readonly config: ConfigService,
  ) {}

  async obter(): Promise<ConfiguracaoAtual> {
    const atual = await this.configuracaoRepository.findAtual();

    if (atual) {
      return {
        intervaloDescobertaSegundos: atual.intervaloDescobertaSegundos,
        intervaloColetaSegundos: atual.intervaloColetaSegundos,
        atualizadaEm: atual.atualizadaEm,
        padrao: false,
      };
    }

    const intervaloPadraoSegundos = Math.round(
      Number(this.config.get<string>("METRICS_POLL_INTERVAL_MS") ?? 30000) /
        1000,
    );

    return {
      intervaloDescobertaSegundos: intervaloPadraoSegundos,
      intervaloColetaSegundos: intervaloPadraoSegundos,
      atualizadaEm: null,
      padrao: true,
    };
  }

  async atualizar(dto: AtualizarConfiguracaoDto): Promise<ConfiguracaoAtual> {
    const salva = await this.configuracaoRepository.salvar(dto);

    return {
      intervaloDescobertaSegundos: salva.intervaloDescobertaSegundos,
      intervaloColetaSegundos: salva.intervaloColetaSegundos,
      atualizadaEm: salva.atualizadaEm,
      padrao: false,
    };
  }
}
