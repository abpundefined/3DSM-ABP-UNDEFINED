import type { Granularidade, RespostaSerie } from '../types/serie';

export const INTERVALO_QUADRO_CORRIDA_MS = 650;
export const LIMITE_BARRAS_CORRIDA = 10;

export type ItemQuadroCorrida = {
  servicoId: number;
  nome: string;
  acumuladoGCo2e: number;
  posicao: number;
  percentualLargura: number;
};

export type QuadroCorrida = {
  indice: number;
  inicio: string;
  rotulo: string;
  totalAcumuladoGCo2e: number;
  maxValorGCo2e: number;
  itens: ItemQuadroCorrida[];
};

const FUSO_BRASILIA = 'America/Sao_Paulo';

const formatadorHora = new Intl.DateTimeFormat('pt-BR', {
  timeZone: FUSO_BRASILIA,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

const formatadorDia = new Intl.DateTimeFormat('pt-BR', {
  timeZone: FUSO_BRASILIA,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

export function formatarRotuloQuadroCorrida(
  inicio: string,
  granularidade: Granularidade,
): string {
  const data = new Date(inicio);
  if (!Number.isFinite(data.getTime())) {
    return inicio;
  }

  return (granularidade === 'dia' ? formatadorDia : formatadorHora).format(
    data,
  );
}

export function montarQuadrosCorrida(
  dados: RespostaSerie,
  limite = LIMITE_BARRAS_CORRIDA,
): QuadroCorrida[] {
  const { intervalos, granularidade, servicos } = dados;
  if (intervalos.length === 0 || servicos.length === 0 || limite <= 0) {
    return [];
  }

  const acumulados = new Map<number, number>(
    servicos.map((servico) => [servico.servicoId, 0]),
  );

  const quadros: QuadroCorrida[] = intervalos.map((inicio, indice) => {
    for (const servico of servicos) {
      const valor = servico.serie[indice]?.emissaoGCo2e;
      if (typeof valor === 'number' && Number.isFinite(valor) && valor > 0) {
        acumulados.set(
          servico.servicoId,
          (acumulados.get(servico.servicoId) ?? 0) + valor,
        );
      }
    }

    const ordenados = servicos
      .map((servico) => ({
        servicoId: servico.servicoId,
        nome: servico.nome,
        acumuladoGCo2e: acumulados.get(servico.servicoId) ?? 0,
      }))
      .filter((item) => item.acumuladoGCo2e > 0)
      .sort(
        (a, b) =>
          b.acumuladoGCo2e - a.acumuladoGCo2e ||
          a.nome.localeCompare(b.nome, 'pt-BR') ||
          a.servicoId - b.servicoId,
      );

    const totalAcumuladoGCo2e = ordenados.reduce(
      (soma, item) => soma + item.acumuladoGCo2e,
      0,
    );
    const visiveis = ordenados.slice(0, limite);
    const maxValorGCo2e = visiveis[0]?.acumuladoGCo2e ?? 0;

    const itens: ItemQuadroCorrida[] = visiveis.map((item, pos) => ({
      ...item,
      posicao: pos + 1,
      percentualLargura:
        maxValorGCo2e > 0
          ? Math.max(4, (item.acumuladoGCo2e / maxValorGCo2e) * 100)
          : 0,
    }));

    return {
      indice,
      inicio,
      rotulo: formatarRotuloQuadroCorrida(inicio, granularidade),
      totalAcumuladoGCo2e,
      maxValorGCo2e,
      itens,
    };
  });

  if (quadros.every((quadro) => quadro.itens.length === 0)) {
    return [];
  }

  return quadros;
}

export function proximoQuadroCorrida(
  indiceAtual: number,
  totalQuadros: number,
): number | null {
  if (totalQuadros <= 1 || indiceAtual >= totalQuadros - 1) {
    return null;
  }

  return Math.max(0, indiceAtual + 1);
}
