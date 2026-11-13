import { Injectable } from "@nestjs/common";
import type { EstadoMonitoramento } from "../../generated/prisma/enums";
import {
  escolherGranularidade,
  gerarIntervalos,
  Granularidade,
} from "../../common/utils/intervalos-periodo";
import {
  ImpactoPorIntervalo,
  MapaRepository,
  ServicoComRegiao,
} from "./mapa.repository";

export interface TotaisAmbientais {
  energiaKwh: number | null;
  emissaoGCo2e: number | null;
}

export interface ServicoNoMapa {
  servicoId: number;
  nome: string;
  estado: EstadoMonitoramento;
  regiaoCodigo: string;
  latitude: number;
  longitude: number;
  local: string;
  totais: TotaisAmbientais;
  serie: (number | null)[];
}

export interface ServicoSemCoordenadas {
  servicoId: number;
  nome: string;
  estado: EstadoMonitoramento;
  regiaoCodigo: string;
  totais: TotaisAmbientais;
}

export interface MapaConsolidado {
  periodo: { inicio: string; fim: string };
  granularidade: Granularidade;
  intervalos: string[];
  servicos: ServicoNoMapa[];
  semCoordenadas: ServicoSemCoordenadas[];
}

interface ImpactoDoServico {
  totais: TotaisAmbientais;
  serie: (number | null)[];
}

const LOCAL_NAO_INFORMADO = "Localização não informada";
const NOMES_DESCONHECIDOS = new Set(["desconhecida", "desconhecido"]);

function somar(atual: number | null, valor: number | null) {
  return valor === null ? atual : (atual ?? 0) + valor;
}

function coordenadasValidas(regiao: ServicoComRegiao["regiao"]) {
  const { latitude, longitude } = regiao;

  if (
    latitude === null ||
    longitude === null ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    Math.abs(latitude) > 90 ||
    Math.abs(longitude) > 180
  ) {
    return null;
  }

  return { latitude, longitude };
}

function formatarLocal({ pais, regiao, cidade }: ServicoComRegiao["regiao"]) {
  const partes = [pais, cidade ?? regiao]
    .map((parte) => parte?.trim())
    .filter(
      (parte): parte is string =>
        !!parte && !NOMES_DESCONHECIDOS.has(parte.toLocaleLowerCase("pt-BR")),
    );

  return partes.length > 0 ? partes.join(" · ") : LOCAL_NAO_INFORMADO;
}

function agruparPorServico(
  impactos: ImpactoPorIntervalo[],
  intervalos: Date[],
): Map<number, ImpactoDoServico> {
  const posicoes = new Map(
    intervalos.map((intervalo, indice) => [intervalo.getTime(), indice]),
  );
  const porServico = new Map<number, ImpactoDoServico>();

  for (const impacto of impactos) {
    const posicao = posicoes.get(impacto.inicioIntervalo.getTime());
    if (posicao === undefined) {
      continue;
    }

    let acumulado = porServico.get(impacto.servicoId);
    if (!acumulado) {
      acumulado = {
        totais: { energiaKwh: null, emissaoGCo2e: null },
        serie: intervalos.map(() => null),
      };
      porServico.set(impacto.servicoId, acumulado);
    }

    acumulado.serie[posicao] = somar(
      acumulado.serie[posicao],
      impacto.emissaoGCo2e,
    );
    acumulado.totais.energiaKwh = somar(
      acumulado.totais.energiaKwh,
      impacto.energiaKwh,
    );
    acumulado.totais.emissaoGCo2e = somar(
      acumulado.totais.emissaoGCo2e,
      impacto.emissaoGCo2e,
    );
  }

  return porServico;
}

@Injectable()
export class MapaService {
  constructor(private readonly mapaRepository: MapaRepository) {}

  async obter(inicio: Date, fim: Date): Promise<MapaConsolidado> {
    const granularidade = escolherGranularidade(inicio, fim);
    const intervalos = gerarIntervalos(inicio, fim, granularidade);

    const [servicos, impactos] = await Promise.all([
      this.mapaRepository.listarServicosComRegiao(),
      this.mapaRepository.somarImpactoPorIntervalo(inicio, fim, granularidade),
    ]);
    const impactoPorServico = agruparPorServico(impactos, intervalos);

    const resposta: MapaConsolidado = {
      periodo: { inicio: inicio.toISOString(), fim: fim.toISOString() },
      granularidade,
      intervalos: intervalos.map((intervalo) => intervalo.toISOString()),
      servicos: [],
      semCoordenadas: [],
    };

    for (const servico of servicos) {
      const impacto = impactoPorServico.get(servico.id);
      if (servico.estadoAtual === "REMOVIDO" && !impacto) {
        continue;
      }

      const totais = impacto?.totais ?? {
        energiaKwh: null,
        emissaoGCo2e: null,
      };
      const coordenadas = coordenadasValidas(servico.regiao);

      if (!coordenadas) {
        resposta.semCoordenadas.push({
          servicoId: servico.id,
          nome: servico.nome,
          estado: servico.estadoAtual,
          regiaoCodigo: servico.regiaoCodigo,
          totais,
        });
        continue;
      }

      resposta.servicos.push({
        servicoId: servico.id,
        nome: servico.nome,
        estado: servico.estadoAtual,
        regiaoCodigo: servico.regiaoCodigo,
        ...coordenadas,
        local: formatarLocal(servico.regiao),
        totais,
        serie: impacto?.serie ?? intervalos.map(() => null),
      });
    }

    return resposta;
  }
}
