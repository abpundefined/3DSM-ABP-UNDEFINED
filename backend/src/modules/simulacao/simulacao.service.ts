import { Injectable, NotFoundException } from "@nestjs/common";
import {
  RegiaoSimulada,
  simularRegioes,
} from "../../common/regras/simulacao-regiao";
import { RegiaoMonitorada, SimulacaoRepository } from "./simulacao.repository";

export type RegiaoNaSimulacao = RegiaoSimulada &
  Omit<RegiaoMonitorada, "codigo"> & { amostrasIntensidade: number };

export interface SimulacaoRegiao {
  periodo: { inicio: string; fim: string };
  servico: { servicoId: number; nome: string; regiaoCodigo: string };
  energiaKwh: number | null;
  coletasConsideradas: number;
  emissaoAtualGCo2e: number | null;
  melhorRegiaoCodigo: string | null;
  regioes: RegiaoNaSimulacao[];
}

@Injectable()
export class SimulacaoService {
  constructor(private readonly simulacaoRepository: SimulacaoRepository) {}

  async simular(
    servicoId: number,
    inicio: Date,
    fim: Date,
  ): Promise<SimulacaoRegiao> {
    const servico = await this.simulacaoRepository.buscarServico(servicoId);
    if (!servico) {
      throw new NotFoundException("Serviço não encontrado.");
    }

    const [energia, regioes, medias] = await Promise.all([
      this.simulacaoRepository.somarEnergia(servicoId, inicio, fim),
      this.simulacaoRepository.listarRegioes(),
      this.simulacaoRepository.mediaIntensidadePorRegiao(inicio, fim),
    ]);
    const mediaPorRegiao = new Map(
      medias.map((media) => [media.regiaoCodigo, media]),
    );
    const dadosPorRegiao = new Map(
      regioes.map((regiao) => [regiao.codigo, regiao]),
    );

    const simulacao = simularRegioes(
      energia.energiaKwh,
      servico.regiaoCodigo,
      regioes.map((regiao) => ({
        codigo: regiao.codigo,
        intensidadeGCo2ePorKwh:
          mediaPorRegiao.get(regiao.codigo)?.intensidadeMedia ?? null,
      })),
    );

    return {
      periodo: { inicio: inicio.toISOString(), fim: fim.toISOString() },
      servico: {
        servicoId: servico.id,
        nome: servico.nome,
        regiaoCodigo: servico.regiaoCodigo,
      },
      energiaKwh: energia.energiaKwh,
      coletasConsideradas: energia.coletas,
      emissaoAtualGCo2e: simulacao.emissaoAtualGCo2e,
      melhorRegiaoCodigo: simulacao.melhorRegiaoCodigo,
      regioes: simulacao.regioes.map((regiao) => {
        const {
          pais,
          regiao: nome,
          cidade,
        } = dadosPorRegiao.get(regiao.codigo)!;

        return {
          codigo: regiao.codigo,
          pais,
          regiao: nome,
          cidade,
          intensidadeGCo2ePorKwh: regiao.intensidadeGCo2ePorKwh,
          amostrasIntensidade: mediaPorRegiao.get(regiao.codigo)?.amostras ?? 0,
          emissaoEstimadaGCo2e: regiao.emissaoEstimadaGCo2e,
          diferencaGCo2e: regiao.diferencaGCo2e,
          diferencaPercentual: regiao.diferencaPercentual,
          atual: regiao.atual,
          menorEmissao: regiao.menorEmissao,
        };
      }),
    };
  }
}
