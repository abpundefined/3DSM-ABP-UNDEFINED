import type { RegiaoSimulada, RespostaSimulacao } from '../types/simulacao';
import { mapaDemo } from './mapa.ts';

// Gerado a partir do mapa de demonstração para que os números batam entre as telas.
type Acumulado = {
  pais: string;
  cidade: string;
  energiaKwh: number;
  emissaoGCo2e: number;
};

function intensidadesDoMapa() {
  const porRegiao = new Map<string, Acumulado>();

  for (const servico of mapaDemo.servicos) {
    const [pais, cidade] = servico.local.split(' · ');
    const atual = porRegiao.get(servico.regiaoCodigo) ?? {
      pais,
      cidade,
      energiaKwh: 0,
      emissaoGCo2e: 0,
    };
    atual.energiaKwh += servico.totais.energiaKwh ?? 0;
    atual.emissaoGCo2e += servico.totais.emissaoGCo2e ?? 0;
    porRegiao.set(servico.regiaoCodigo, atual);
  }

  return [...porRegiao].map(([codigo, dados]) => ({
    codigo,
    pais: dados.pais,
    cidade: dados.cidade,
    intensidadeGCo2ePorKwh:
      dados.energiaKwh > 0
        ? Math.round((dados.emissaoGCo2e / dados.energiaKwh) * 10) / 10
        : null,
  }));
}

export function simulacaoDemo(servicoId: number): RespostaSimulacao | null {
  const servico = mapaDemo.servicos.find((s) => s.servicoId === servicoId);
  if (!servico) {
    return null;
  }

  const energiaKwh = servico.totais.energiaKwh;
  const regioes = intensidadesDoMapa().sort(
    (a, b) =>
      (a.intensidadeGCo2ePorKwh ?? Infinity) -
        (b.intensidadeGCo2ePorKwh ?? Infinity) ||
      a.codigo.localeCompare(b.codigo),
  );
  const estimar = (intensidade: number | null) =>
    energiaKwh === null || intensidade === null
      ? null
      : energiaKwh * intensidade;
  const emissaoAtualGCo2e = estimar(
    regioes.find((r) => r.codigo === servico.regiaoCodigo)
      ?.intensidadeGCo2ePorKwh ?? null,
  );
  const melhor =
    energiaKwh && energiaKwh > 0
      ? (regioes.find((r) => r.intensidadeGCo2ePorKwh !== null)?.codigo ?? null)
      : null;

  return {
    periodo: mapaDemo.periodo,
    servico: {
      servicoId,
      nome: servico.nome,
      regiaoCodigo: servico.regiaoCodigo,
    },
    energiaKwh,
    coletasConsideradas: servico.serie.filter((v) => v !== null).length,
    emissaoAtualGCo2e,
    melhorRegiaoCodigo: melhor,
    regioes: regioes.map((regiao): RegiaoSimulada => {
      const emissaoEstimadaGCo2e = estimar(regiao.intensidadeGCo2ePorKwh);
      const diferencaGCo2e =
        emissaoEstimadaGCo2e === null || emissaoAtualGCo2e === null
          ? null
          : emissaoEstimadaGCo2e - emissaoAtualGCo2e;

      return {
        codigo: regiao.codigo,
        pais: regiao.pais,
        regiao: regiao.codigo,
        cidade: regiao.cidade,
        intensidadeGCo2ePorKwh: regiao.intensidadeGCo2ePorKwh,
        amostrasIntensidade: regiao.intensidadeGCo2ePorKwh === null ? 0 : 24,
        emissaoEstimadaGCo2e,
        diferencaGCo2e,
        diferencaPercentual:
          diferencaGCo2e === null || !emissaoAtualGCo2e
            ? null
            : (diferencaGCo2e / emissaoAtualGCo2e) * 100,
        atual: regiao.codigo === servico.regiaoCodigo,
        menorEmissao: regiao.codigo === melhor,
      };
    }),
  };
}
