import { Injectable } from "@nestjs/common";
import { converterPeriodo } from "./date-conversion.helper";
import { MetricaRanking, RankingQueryDto } from "./dto/ranking-query.dto";
import { IndicadoresRepository } from "./indicadores.repository";
import type { ImpactoPorServico } from "./indicadores.repository";

interface ItemRanking {
  posicao: number;
  servicoId: number;
  nome: string;
  energiaKwh: number;
  emissaoGCo2e: number;
  coletasValidas: number;
}

type ItemRankingSemPosicao = Omit<ItemRanking, "posicao">;

interface ServicoSemDados {
  servicoId: number;
  nome: string;
}

export interface RankingResultado {
  periodo: { inicio: string; fim: string };
  metrica: MetricaRanking;
  itens: ItemRanking[];
  semDados: ServicoSemDados[];
}

function valorDaMetrica(
  impacto: ImpactoPorServico,
  metrica: MetricaRanking,
): number | null {
  return metrica === MetricaRanking.EMISSAO
    ? impacto.emissaoGCo2e
    : impacto.energiaKwh;
}

function ordenarPorMetrica(
  a: ItemRankingSemPosicao,
  b: ItemRankingSemPosicao,
  metrica: MetricaRanking,
): number {
  const diferenca =
    metrica === MetricaRanking.EMISSAO
      ? b.emissaoGCo2e - a.emissaoGCo2e
      : b.energiaKwh - a.energiaKwh;

  return (
    diferenca ||
    a.nome.localeCompare(b.nome, "pt-BR") ||
    a.servicoId - b.servicoId
  );
}

@Injectable()
export class RankingService {
  constructor(private readonly indicadoresRepository: IndicadoresRepository) {}

  async obterRanking(query: RankingQueryDto): Promise<RankingResultado> {
    const { inicio, fim } = converterPeriodo(query);
    const metrica = query.metrica ?? MetricaRanking.ENERGIA;

    // Forçamos a tipagem no destructuring para o ESLint nunca assumir 'any'
    const [servicos, impactos] = (await Promise.all([
      this.indicadoresRepository.listarServicosParaRanking(),
      this.indicadoresRepository.somarImpactoPorServico(inicio, fim),
    ])) as [
      { id: number; nome: string; estadoAtual: string }[],
      ImpactoPorServico[],
    ];

    const impactosPorServico = new Map<number, ImpactoPorServico>(
      impactos.map((impacto) => [impacto.servicoId, impacto] as const),
    );

    const itens: ItemRankingSemPosicao[] = [];
    const semDados: ServicoSemDados[] = [];

    for (const servico of servicos) {
      const impacto = impactosPorServico.get(servico.id);

      if (!impacto || valorDaMetrica(impacto, metrica) === null) {
        if (servico.estadoAtual !== "REMOVIDO") {
          semDados.push({ servicoId: servico.id, nome: servico.nome });
        }
        continue;
      }

      itens.push({
        servicoId: servico.id,
        nome: servico.nome,
        energiaKwh: impacto.energiaKwh ?? 0,
        emissaoGCo2e: impacto.emissaoGCo2e ?? 0,
        coletasValidas: impacto.coletasValidas,
      });
    }

    itens.sort((a, b) => ordenarPorMetrica(a, b, metrica));

    semDados.sort(
      (a, b) =>
        a.nome.localeCompare(b.nome, "pt-BR") || a.servicoId - b.servicoId,
    );

    const itensLimitados = itens.slice(0, query.limite ?? 10);

    return {
      periodo: { inicio: inicio.toISOString(), fim: fim.toISOString() },
      metrica,
      itens: itensLimitados.map((item, indice) => ({
        ...item,
        posicao: indice + 1,
      })),
      semDados,
    };
  }
}
