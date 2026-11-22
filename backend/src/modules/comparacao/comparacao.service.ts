import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  escolherGranularidade,
  gerarIntervalos,
} from "../../common/utils/intervalos-periodo";
import { converterPeriodo } from "../indicadores/date-conversion.helper";
import { ComparacaoQueryDto } from "./comparacao-query.dto";
import { ComparacaoRepository } from "./comparacao.repository";

@Injectable()
export class ComparacaoService {
  constructor(private readonly repository: ComparacaoRepository) {}

  async obter(query: ComparacaoQueryDto) {
    const partes =
      typeof query.servicos === "string" ? query.servicos.split(",") : [];
    if (
      partes.length < 2 ||
      partes.length > 5 ||
      partes.some((parte) => !/^\d+$/.test(parte))
    ) {
      throw new BadRequestException(
        "Informe de 2 a 5 IDs de serviços inteiros positivos separados por vírgula.",
      );
    }

    const ids = partes.map(Number);
    if (
      ids.some((id) => !Number.isSafeInteger(id) || id < 1 || id > 2147483647)
    ) {
      throw new BadRequestException(
        "Os IDs de serviços devem ser inteiros positivos válidos.",
      );
    }
    if (new Set(ids).size !== ids.length) {
      throw new BadRequestException(
        "Os IDs de serviços não podem ser repetidos.",
      );
    }

    const { inicio, fim } = converterPeriodo(query);
    const servicos = await this.repository.listarServicos(ids);
    const servicosPorId = new Map(
      servicos.map((servico) => [servico.id, servico]),
    );
    const ausentes = ids.filter((id) => !servicosPorId.has(id));
    if (ausentes.length > 0) {
      throw new NotFoundException(
        `Serviço(s) não encontrado(s): ${ausentes.join(", ")}.`,
      );
    }

    const granularidade = escolherGranularidade(inicio, fim);
    const intervalos = gerarIntervalos(inicio, fim, granularidade);
    const [totais, serie] = await Promise.all([
      this.repository.obterTotais(ids, inicio, fim),
      this.repository.obterSerie(ids, inicio, fim, granularidade),
    ]);
    const totaisPorId = new Map(
      totais.map((total) => [total.servicoId, total]),
    );
    const seriePorServico = new Map<
      number,
      Map<number, (typeof serie)[number]>
    >();
    for (const ponto of serie) {
      let pontos = seriePorServico.get(ponto.servicoId);
      if (!pontos) {
        pontos = new Map();
        seriePorServico.set(ponto.servicoId, pontos);
      }
      pontos.set(ponto.inicio.getTime(), ponto);
    }

    return {
      periodo: { inicio: inicio.toISOString(), fim: fim.toISOString() },
      granularidade,
      servicos: servicos
        .sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id))
        .map((servico) => {
          const total = totaisPorId.get(servico.id);
          const pontos = seriePorServico.get(servico.id);
          return {
            servicoId: servico.id,
            nome: servico.nome,
            totais: {
              energiaKwh: total?.energiaKwh ?? null,
              emissaoGCo2e: total?.emissaoGCo2e ?? null,
              cpuMedia: total?.cpuMedia ?? null,
              memoriaMediaMb: total?.memoriaMediaMb ?? null,
              coletasValidas: total?.coletasValidas ?? 0,
            },
            serie: intervalos.map((intervalo) => {
              const ponto = pontos?.get(intervalo.getTime());
              return {
                inicio: intervalo.toISOString(),
                energiaKwh: ponto?.energiaKwh ?? null,
                emissaoGCo2e: ponto?.emissaoGCo2e ?? null,
              };
            }),
          };
        }),
    };
  }
}
