import { Injectable } from "@nestjs/common";
import type { EstadoMonitoramento } from "../../generated/prisma/enums";
import { resumirColetas } from "../../common/regras/resumo-coletas";
import {
  IntegracaoSaudeDto,
  SaudeRespostaDto,
  ServicosPorEstadoDto,
} from "./dto/saude-resposta.dto";
import {
  NomeIntegracao,
  RegistroIntegracoesService,
} from "./registro-integracoes.service";
import { ContagemServicos, SaudeRepository } from "./saude.repository";

const UMA_HORA_MS = 60 * 60 * 1000;

const contarPorEstado = (
  contagens: ContagemServicos[],
): ServicosPorEstadoDto => {
  const resultado: Record<EstadoMonitoramento, number> = {
    DISPONIVEL: 0,
    INDISPONIVEL: 0,
    SEM_METRICAS: 0,
    REMOVIDO: 0,
    DESCONHECIDO: 0,
  };

  for (const { estado, quantidade } of contagens) {
    resultado[estado] = quantidade;
  }

  return resultado;
};

@Injectable()
export class SaudeService {
  constructor(
    private readonly registro: RegistroIntegracoesService,
    private readonly repository: SaudeRepository,
  ) {}

  async obter(): Promise<SaudeRespostaDto> {
    const agora = new Date();
    const [coletas, servicos] = await Promise.all([
      this.repository.contarColetasDesde(
        new Date(agora.getTime() - UMA_HORA_MS),
      ),
      this.repository.contarServicosPorEstado(),
    ]);
    const agregador = this.descrever("agregador");

    return {
      geradoEm: agora.toISOString(),
      agregador,
      apiCarbono: this.descrever("apiCarbono"),
      ultimaDescobertaEm: agregador.ultimoSucessoEm,
      coletasUltimaHora: resumirColetas(coletas),
      servicosPorEstado: contarPorEstado(servicos),
    };
  }

  private descrever(nome: NomeIntegracao): IntegracaoSaudeDto {
    const consulta = this.registro.obter(nome);

    if (!consulta) {
      return {
        estado: "SEM_CONSULTA",
        ultimaConsultaEm: null,
        tempoRespostaMs: null,
        ultimoSucessoEm: null,
        mensagemErro: null,
      };
    }

    return {
      estado: consulta.sucesso ? "OPERACIONAL" : "FALHA",
      ultimaConsultaEm: consulta.ultimaConsultaEm.toISOString(),
      tempoRespostaMs: consulta.tempoRespostaMs,
      ultimoSucessoEm: consulta.ultimoSucessoEm?.toISOString() ?? null,
      mensagemErro: consulta.mensagemErro,
    };
  }
}
