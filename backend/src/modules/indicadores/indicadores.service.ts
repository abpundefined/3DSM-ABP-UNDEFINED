import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { EstadoMonitoramento } from "../../generated/prisma/enums";
import {
  escolherGranularidade,
  gerarIntervalos,
} from "../../common/utils/intervalos-periodo";
import {
  converterPeriodo,
  intervaloMesCalendarioAnterior,
} from "./date-conversion.helper";
import { HistoricoServicoQueryDto } from "./dto/historico-servico-query.dto";
import { IntensidadeHorariosQueryDto } from "./dto/intensidade-horarios-query.dto";
import { PeriodoPredefinido } from "./dto/periodo.dto";
import { SerieTemporalQueryDto } from "./dto/serie-temporal-query.dto";
import { SerieTemporalResponseDto } from "./dto/serie-temporal-response.dto";
import {
  ContagemPorEstado,
  IndicadoresRepository,
  PontoSerieTemporalPorServico,
} from "./indicadores.repository";

export interface ItemHistoricoServico {
  inicio: string;
  energiaKwh: number | null;
  emissaoGCo2e: number | null;
  cpuMedia: number | null;
  memoriaMediaMb: number | null;
  coletas: number | null;
  ativo: number;
  indisponivel: number;
  semMetricas: number;
}

export interface ResumoServicos {
  monitorados: number;
  disponiveis: number;
  indisponiveis: number;
  semMetricas: number;
  desconhecidos: number;
  removidos: number;
}

export interface IndicadoresConsolidados {
  periodo: { inicio: string; fim: string };
  variacao?: {
    energiaTotalKwh: VariacaoIndicador;
    emissaoTotalGCo2e: VariacaoIndicador;
    coletasCalculadas: VariacaoIndicador;
  };
  energiaTotalKwh: number;
  emissaoTotalGCo2e: number;
  coletasCalculadas: number;
  servicos: ResumoServicos;
  ultimaColetaEm: Date | null;
  geradoEm: Date;
}

export interface VariacaoIndicador {
  absoluta: number;
  percentual: number | null;
}

@Injectable()
export class IndicadoresService {
  constructor(private readonly indicadoresRepository: IndicadoresRepository) {}

  async obterMatrizHorarios(query: IntensidadeHorariosQueryDto) {
    const consulta =
      query.inicio === undefined &&
      query.fim === undefined &&
      query.periodo === undefined
        ? { ...query, periodo: PeriodoPredefinido.ULTIMOS_30_DIAS }
        : query;
    const { inicio, fim } = converterPeriodo(consulta);
    const dados = await this.indicadoresRepository.obterDadosMatrizIntensidade(
      inicio,
      fim,
      query.regiao,
    );
    const matriz = Array.from({ length: 7 }, () =>
      Array.from({ length: 24 }, () => ({
        media: null as number | null,
        quantidadeAmostras: null as number | null,
      })),
    );

    for (const dado of dados) {
      matriz[dado.diaSemana][dado.hora] = {
        media: dado.media,
        quantidadeAmostras: dado.quantidadeAmostras,
      };
    }

    let melhorJanela: {
      diaSemana: number;
      horaInicio: number;
      mediaJanela: number;
    } | null = null;

    const horasNaSemana = matriz.length * matriz[0].length;

    for (
      let indiceInicio = 0;
      indiceInicio < horasNaSemana;
      indiceInicio += 1
    ) {
      const indicesJanela = [
        indiceInicio % horasNaSemana,
        (indiceInicio + 1) % horasNaSemana,
        (indiceInicio + 2) % horasNaSemana,
      ];
      const horas = indicesJanela.map(
        (indice) => matriz[Math.floor(indice / 24)][indice % 24],
      );

      if (
        horas.some(
          (hora) =>
            hora.media === null ||
            hora.quantidadeAmostras === null ||
            hora.quantidadeAmostras === 0,
        )
      ) {
        continue;
      }

      const totalAmostras = horas.reduce(
        (total, hora) => total + hora.quantidadeAmostras!,
        0,
      );
      const intensidadePonderada = horas.reduce(
        (total, hora) => total + hora.media! * hora.quantidadeAmostras!,
        0,
      );
      const mediaJanela = intensidadePonderada / totalAmostras;
      const diaSemana = Math.floor(indiceInicio / 24);
      const horaInicio = indiceInicio % 24;

      if (melhorJanela === null || mediaJanela < melhorJanela.mediaJanela) {
        melhorJanela = { diaSemana, horaInicio, mediaJanela };
      }
    }

    return {
      fusoHorario: "America/Sao_Paulo",
      matriz,
      melhorJanela,
    };
  }

  obterSerieTemporal(
    query: SerieTemporalQueryDto,
  ): Promise<SerieTemporalResponseDto> {
    const { inicio, fim } = converterPeriodo(query);
    const granularidade =
      query.granularidade ?? escolherGranularidade(inicio, fim);
    const intervalos = gerarIntervalos(inicio, fim, granularidade);

    return Promise.all([
      this.indicadoresRepository.obterAgregacaoSerieTemporal(
        inicio,
        fim,
        granularidade,
      ),
      query.porServico
        ? this.indicadoresRepository.listarServicosParaRanking()
        : Promise.resolve([]),
      query.porServico
        ? this.indicadoresRepository.obterSerieAgrupadaPorServico(
            inicio,
            fim,
            granularidade,
          )
        : Promise.resolve([]),
    ]).then(([agregacao, servicos, seriePorServico]) => {
      const agregacaoPorInicio = new Map(
        agregacao.map((ponto) => [ponto.inicio.getTime(), ponto]),
      );
      const servicosPorId = new Map<
        number,
        {
          servicoId: number;
          nome: string;
          pontos: Map<number, PontoSerieTemporalPorServico>;
        }
      >();

      const servicosComDados = new Set(
        seriePorServico.map((ponto) => ponto.servicoId),
      );

      for (const servico of servicos) {
        if (
          servico.estadoAtual === "REMOVIDO" &&
          !servicosComDados.has(servico.id)
        ) {
          continue;
        }

        servicosPorId.set(servico.id, {
          servicoId: servico.id,
          nome: servico.nome,
          pontos: new Map(),
        });
      }

      for (const ponto of seriePorServico) {
        const servico = servicosPorId.get(ponto.servicoId);
        if (servico) {
          servico.pontos.set(ponto.inicio.getTime(), ponto);
        }
      }

      return {
        periodo: { inicio: inicio.toISOString(), fim: fim.toISOString() },
        granularidade,
        intervalos: intervalos.map((intervalo) => intervalo.toISOString()),
        global: intervalos.map((intervalo) => {
          const ponto = agregacaoPorInicio.get(intervalo.getTime());
          return {
            inicio: intervalo.toISOString(),
            energiaKwh: ponto?.energiaKwh ?? null,
            emissaoGCo2e: ponto?.emissaoGCo2e ?? null,
          };
        }),
        servicos: Array.from(servicosPorId.values()).map((servico) => ({
          servicoId: servico.servicoId,
          nome: servico.nome,
          serie: intervalos.map((intervalo) => {
            const ponto = servico.pontos.get(intervalo.getTime());
            return {
              inicio: intervalo.toISOString(),
              energiaKwh: ponto?.energiaKwh ?? null,
              emissaoGCo2e: ponto?.emissaoGCo2e ?? null,
            };
          }),
        })),
      };
    });
  }

  async obterHistoricoServico(
    id: string,
    query: HistoricoServicoQueryDto,
  ): Promise<ItemHistoricoServico[]> {
    const servico = await this.indicadoresRepository.buscarServicoPorId(id);

    if (!servico) {
      throw new NotFoundException(`Serviço ${id} não encontrado.`);
    }

    const { inicio, fim } = converterPeriodo(query);
    const granularidade =
      query.granularidade ?? escolherGranularidade(inicio, fim);
    const intervalos = gerarIntervalos(inicio, fim, granularidade);
    const serie = await this.indicadoresRepository.obterSerieTemporal(
      id,
      inicio,
      fim,
      granularidade,
    );
    const seriePorInicio = new Map(
      serie.map((ponto) => [ponto.inicio.getTime(), ponto]),
    );

    return intervalos.map((intervalo) => {
      const ponto = seriePorInicio.get(intervalo.getTime());

      return {
        inicio: intervalo.toISOString(),
        energiaKwh: ponto?.energiaKwh ?? null,
        emissaoGCo2e: ponto?.emissaoGCo2e ?? null,
        cpuMedia: ponto?.cpuMedia ?? null,
        memoriaMediaMb: ponto?.memoriaMediaMb ?? null,
        coletas: ponto?.coletas ?? null,
        ativo: ponto?.ativo ?? 0,
        indisponivel: ponto?.indisponivel ?? 0,
        semMetricas: ponto?.semMetricas ?? 0,
      };
    });
  }

  async obter(
    inicio: Date,
    fim: Date,
    tipoPeriodo?: PeriodoPredefinido,
  ): Promise<IndicadoresConsolidados> {
    const geradoEm = new Date();

    if (
      !Number.isFinite(inicio.getTime()) ||
      !Number.isFinite(fim.getTime()) ||
      inicio.getTime() >= fim.getTime()
    ) {
      throw new BadRequestException("inicio deve ser anterior a fim.");
    }

    const periodoComparacao =
      tipoPeriodo === PeriodoPredefinido.MES_ANTERIOR
        ? intervaloMesCalendarioAnterior(inicio)
        : null;

    const [totais, contagens, ultimaColetaEm, totaisComparacao] =
      await Promise.all([
        this.indicadoresRepository.somarImpactoNoPeriodo(inicio, fim),
        this.indicadoresRepository.contarServicosPorEstado(),
        this.indicadoresRepository.buscarUltimaColetaEm(),
        periodoComparacao
          ? this.indicadoresRepository.somarImpactoNoPeriodo(
              periodoComparacao.inicio,
              periodoComparacao.fim,
            )
          : Promise.resolve(null),
      ]);

    const energiaTotalKwh = totais.energiaKwh ?? 0;
    const emissaoTotalGCo2e = totais.emissaoGCo2e ?? 0;
    const variacao = totaisComparacao
      ? {
          energiaTotalKwh: this.calcularVariacao(
            energiaTotalKwh,
            totaisComparacao.energiaKwh ?? 0,
          ),
          emissaoTotalGCo2e: this.calcularVariacao(
            emissaoTotalGCo2e,
            totaisComparacao.emissaoGCo2e ?? 0,
          ),
          coletasCalculadas: this.calcularVariacao(
            totais.coletasCalculadas,
            totaisComparacao.coletasCalculadas,
          ),
        }
      : undefined;

    return {
      periodo: { inicio: inicio.toISOString(), fim: fim.toISOString() },
      ...(variacao ? { variacao } : {}),
      energiaTotalKwh,
      emissaoTotalGCo2e,
      coletasCalculadas: totais.coletasCalculadas,
      servicos: this.resumirServicos(contagens),
      ultimaColetaEm,
      geradoEm,
    };
  }

  private calcularVariacao(
    valorAtual: number,
    valorComparacao: number,
  ): VariacaoIndicador {
    const absoluta = valorAtual - valorComparacao;

    return {
      absoluta,
      percentual:
        valorComparacao === 0
          ? valorAtual === 0
            ? 0
            : null
          : (absoluta / valorComparacao) * 100,
    };
  }

  private resumirServicos(contagens: ContagemPorEstado[]): ResumoServicos {
    const quantidade = (estado: EstadoMonitoramento) =>
      contagens.find((contagem) => contagem.estado === estado)?.quantidade ?? 0;

    const disponiveis = quantidade("DISPONIVEL");
    const indisponiveis = quantidade("INDISPONIVEL");
    const semMetricas = quantidade("SEM_METRICAS");
    const desconhecidos = quantidade("DESCONHECIDO");

    return {
      monitorados: disponiveis + indisponiveis + semMetricas + desconhecidos,
      disponiveis,
      indisponiveis,
      semMetricas,
      desconhecidos,
      removidos: quantidade("REMOVIDO"),
    };
  }
}
