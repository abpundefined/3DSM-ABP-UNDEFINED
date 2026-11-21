import { Injectable } from "@nestjs/common";
import { converterPeriodo } from "./date-conversion.helper";
import { MetricaRanking, RankingQueryDto } from "./dto/ranking-query.dto";
import { IndicadoresRepository } from "./indicadores.repository";
import type {
  ImpactoPorServico,
  ServicoParaRanking,
} from "./indicadores.repository";
import {
  calcularVariacaoPercentual,
  periodoAnterior,
  VariacaoPercentual,
} from "./variacao-periodo";

const LOCAL_NAO_INFORMADO = "Localização não informada";
const NOMES_DESCONHECIDOS = new Set(["desconhecida", "desconhecido"]);

interface ItemRanking {
  posicao: number;
  servicoId: number;
  nome: string;
  energiaKwh: number;
  emissaoGCo2e: number;
  coletasValidas: number;
  selo: string;
  regiaoCodigo?: string;
  regiao?: string;
  pais?: string;
}

function parteConhecida(valor?: string | null): string | null {
  const limpo = valor?.trim();
  if (!limpo || NOMES_DESCONHECIDOS.has(limpo.toLocaleLowerCase("pt-BR"))) {
    return null;
  }
  return limpo;
}

function formatarRegiao(regiao: NonNullable<ServicoParaRanking["regiao"]>) {
  const partes = [
    parteConhecida(regiao.pais),
    parteConhecida(regiao.cidade) ?? parteConhecida(regiao.regiao),
  ].filter((parte): parte is string => parte !== null);

  return partes.length > 0 ? partes.join(" • ") : LOCAL_NAO_INFORMADO;
}

function formatarPais(regiao: NonNullable<ServicoParaRanking["regiao"]>) {
  return parteConhecida(regiao.pais) ?? LOCAL_NAO_INFORMADO;
}

type ItemRankingSemPosicao = Omit<ItemRanking, "posicao">;

interface ServicoSemDados {
  servicoId: number;
  nome: string;
  selo: string;
}

export interface VariacaoPorServico extends ServicoSemDados {
  emissaoAtualGCo2e: number | null;
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

const LIMITE_SELO_A = 10;
const LIMITE_SELO_B = 20;
const LIMITE_SELO_C = 30;
const LIMITE_SELO_D = 40;
const LIMITE_SELO_E = 50;

export function calcularSeloEficiencia(
  emissaoMediaPorHora: number | null | undefined,
): string {
  if (emissaoMediaPorHora == null) {
    return "—";
  }

  if (emissaoMediaPorHora <= LIMITE_SELO_A) return "A";
  if (emissaoMediaPorHora <= LIMITE_SELO_B) return "B";
  if (emissaoMediaPorHora <= LIMITE_SELO_C) return "C";
  if (emissaoMediaPorHora <= LIMITE_SELO_D) return "D";
  if (emissaoMediaPorHora <= LIMITE_SELO_E) return "E";
  return "F";
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
    const duracaoEmHoras = (fim.getTime() - inicio.getTime()) / 3_600_000;

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
      const emissaoAtualGCo2e = impacto?.emissaoGCo2e ?? null;
      const selo = calcularSeloEficiencia(
        emissaoAtualGCo2e === null || duracaoEmHoras <= 0
          ? null
          : emissaoAtualGCo2e / duracaoEmHoras,
      );

      if (impacto || anterior) {
        const emissaoAnteriorGCo2e = anterior?.emissaoGCo2e ?? null;
        variacaoPorServico.push({
          servicoId: servico.id,
          nome: servico.nome,
          selo,
          emissaoAtualGCo2e,
          emissaoAnteriorGCo2e,
          diferencaGCo2e:
            emissaoAtualGCo2e === null || emissaoAnteriorGCo2e === null
              ? null
              : emissaoAtualGCo2e - emissaoAnteriorGCo2e,
          variacaoPercentual:
            emissaoAtualGCo2e === null
              ? null
              : calcularVariacaoPercentual(
                  emissaoAtualGCo2e,
                  emissaoAnteriorGCo2e,
                ),
        });
      }

      if (!impacto || valorDaMetrica(impacto, metrica) === null) {
        if (servico.estadoAtual !== "REMOVIDO") {
          semDados.push({ servicoId: servico.id, nome: servico.nome, selo });
        }
        continue;
      }

      itens.push({
        servicoId: servico.id,
        nome: servico.nome,
        energiaKwh: impacto.energiaKwh ?? 0,
        emissaoGCo2e: impacto.emissaoGCo2e ?? 0,
        coletasValidas: impacto.coletasValidas,
        selo,
        ...(servico.regiaoCodigo ? { regiaoCodigo: servico.regiaoCodigo } : {}),
        ...(servico.regiao
          ? {
              regiao: formatarRegiao(servico.regiao),
              pais: formatarPais(servico.regiao),
            }
          : {}),
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
          somarMetrica(impactos, MetricaRanking.ENERGIA),
          somarMetrica(impactosAnteriores, MetricaRanking.ENERGIA),
        ),
        emissaoGCo2e: calcularVariacaoPercentual(
          somarMetrica(impactos, MetricaRanking.EMISSAO),
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
