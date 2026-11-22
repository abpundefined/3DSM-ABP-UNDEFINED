import { Injectable } from "@nestjs/common";
import {
  CelulaHorarioRegiao,
  gerarOportunidades,
  ResultadoOportunidades,
} from "../../common/regras/oportunidades";
import {
  OportunidadesRepository,
  RegiaoMonitoradaOportunidade,
} from "./oportunidades.repository";

export interface RespostaOportunidades extends ResultadoOportunidades {
  periodo: { inicio: string; fim: string };
}

function formatarRotuloRegiao(regiao: RegiaoMonitoradaOportunidade): string {
  const local = regiao.cidade?.trim() || regiao.regiao.trim();
  const pais = regiao.pais.trim();
  if (pais && local) {
    return `${pais} · ${local}`;
  }
  return pais || local || regiao.codigo;
}

@Injectable()
export class OportunidadesService {
  constructor(
    private readonly oportunidadesRepository: OportunidadesRepository,
  ) {}

  async listar(inicio: Date, fim: Date): Promise<RespostaOportunidades> {
    const [servicos, metricas, regioes, intensidades, celulasHorarias] =
      await Promise.all([
        this.oportunidadesRepository.listarServicos(),
        this.oportunidadesRepository.agregarMetricasPorServico(inicio, fim),
        this.oportunidadesRepository.listarRegioesMonitoradas(),
        this.oportunidadesRepository.mediaIntensidadePorRegiao(inicio, fim),
        this.oportunidadesRepository.obterMatrizHorariaPorRegiao(inicio, fim),
      ]);

    const metricasPorServico = new Map(
      metricas.map((item) => [item.servicoId, item]),
    );
    const intensidadePorRegiao = new Map(
      intensidades.map((item) => [item.regiaoCodigo, item.intensidadeMedia]),
    );
    const matrizPorRegiao = new Map<string, CelulaHorarioRegiao[]>();

    for (const celula of celulasHorarias) {
      const lista = matrizPorRegiao.get(celula.regiaoCodigo);
      const item: CelulaHorarioRegiao = {
        diaSemana: celula.diaSemana,
        hora: celula.hora,
        media: celula.media,
        quantidadeAmostras: celula.quantidadeAmostras,
      };
      if (lista) {
        lista.push(item);
      } else {
        matrizPorRegiao.set(celula.regiaoCodigo, [item]);
      }
    }

    const resultado = gerarOportunidades(
      servicos.map((servico) => {
        const metrica = metricasPorServico.get(servico.id);
        return {
          servicoId: servico.id,
          nome: servico.nome,
          estadoAtual: servico.estadoAtual,
          regiaoCodigo: servico.regiaoCodigo,
          energiaKwh: metrica?.energiaKwh ?? null,
          emissaoGCo2e: metrica?.emissaoGCo2e ?? null,
          cpuMediaPercent: metrica?.cpuMediaPercent ?? null,
        };
      }),
      regioes.map((regiao) => ({
        codigo: regiao.codigo,
        rotulo: formatarRotuloRegiao(regiao),
        intensidadeMediaGCo2ePorKwh:
          intensidadePorRegiao.get(regiao.codigo) ?? null,
      })),
      matrizPorRegiao,
    );

    return {
      periodo: { inicio: inicio.toISOString(), fim: fim.toISOString() },
      ...resultado,
    };
  }
}
