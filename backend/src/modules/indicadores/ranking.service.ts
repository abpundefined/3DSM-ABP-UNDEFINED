import { Injectable } from "@nestjs/common";
import { converterPeriodo } from "./date-conversion.helper";
import { MetricaRanking, RankingQueryDto } from "./dto/ranking-query.dto";
import { IndicadoresRepository } from "./indicadores.repository";
import type { ImpactoPorServico } from "./indicadores.repository";
import {
  calcularVariacaoPercentual,
  periodoAnterior,
  VariacaoPercentual,
} from "./variacao-periodo";

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

export interface VariacaoPorServico extends ServicoSemDados {
  emissaoAtualGCo2e: number;
  emissaoAnteriorGCo2e: number | null;
  diferencaGCo2e: number | null;
  variacaoPercentual: number | null;
}

export interface RankingResultado {
  periodo: { inicio: string; fim: string };
  periodoAnterior: { inicio: string; fim: string };
  variacaoPercentual: VariacaoPercentual;
  variacaoPorServico: VariacaoPorServico[];
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

function somarMetrica(
  impactos: ImpactoPorServico[],
  metrica: MetricaRanking,
): number | null {
  return impactos.reduce<number | null>((total, impacto) => {
    const valor = valorDaMetrica(impacto, metrica);
    return valor === null ? total : (total ?? 0) + valor;
  }, null);
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
    const janelaAnterior = periodoAnterior(inicio, fim);
    const metrica = query.metrica ?? MetricaRanking.ENERGIA;

    const [servicos, impactos, impactosAnteriores] = await Promise.all([
      this.indicadoresRepository.listarServicosParaRanking(),
      this.indicadoresRepository.somarImpactoPorServico(inicio, fim),
      this.indicadoresRepository.somarImpactoPorServico(
        janelaAnterior.inicio,
        janelaAnterior.fim,
      ),
    ]);

    const impactosPorServico = new Map<number, ImpactoPorServico>(
      impactos.map((impacto) => [impacto.servicoId, impacto] as const),
    );
    const anterioresPorServico = new Map(
      impactosAnteriores.map((impacto) => [impacto.servicoId, impacto]),
    );

    const itens: ItemRankingSemPosicao[] = [];
    const semDados: ServicoSemDados[] = [];
    const variacaoPorServico: VariacaoPorServico[] = [];

    for (const servico of servicos) {
      const impacto = impactosPorServico.get(servico.id);
      const anterior = anterioresPorServico.get(servico.id);

      if (impacto || anterior) {
        const emissaoAtualGCo2e = impacto?.emissaoGCo2e ?? 0;
        const emissaoAnteriorGCo2e = anterior?.emissaoGCo2e ?? null;
        variacaoPorServico.push({
          servicoId: servico.id,
          nome: servico.nome,
          emissaoAtualGCo2e,
          emissaoAnteriorGCo2e,
          diferencaGCo2e:
            emissaoAnteriorGCo2e === null
              ? null
              : emissaoAtualGCo2e - emissaoAnteriorGCo2e,
          variacaoPercentual: calcularVariacaoPercentual(
            emissaoAtualGCo2e,
            emissaoAnteriorGCo2e,
          ),
        });
      }

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
    variacaoPorServico.sort(
      (a, b) =>
        a.nome.localeCompare(b.nome, "pt-BR") || a.servicoId - b.servicoId,
    );

    return {
      periodo: { inicio: inicio.toISOString(), fim: fim.toISOString() },
      periodoAnterior: {
        inicio: janelaAnterior.inicio.toISOString(),
        fim: janelaAnterior.fim.toISOString(),
      },
      variacaoPercentual: {
        energiaKwh: calcularVariacaoPercentual(
          somarMetrica(impactos, MetricaRanking.ENERGIA) ?? 0,
          somarMetrica(impactosAnteriores, MetricaRanking.ENERGIA),
        ),
        emissaoGCo2e: calcularVariacaoPercentual(
          somarMetrica(impactos, MetricaRanking.EMISSAO) ?? 0,
          somarMetrica(impactosAnteriores, MetricaRanking.EMISSAO),
        ),
      },
      variacaoPorServico,
      metrica,
      itens: itensLimitados.map((item, indice) => ({
        ...item,
        posicao: indice + 1,
      })),
      semDados,
    };
  }
}
