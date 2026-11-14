import { geoDistance } from 'd3-geo';
import type { ServicoNoMapa, TotaisAmbientais } from '../types/mapa';

export type Rotacao = [number, number, number];

export type LocalNoGlobo = {
  chave: string;
  latitude: number;
  longitude: number;
  local: string;
  servicos: ServicoNoMapa[];
  totais: TotaisAmbientais;
};

export const ROTACAO_INICIAL: Rotacao = [55, -15, 0];
export const LATITUDE_MAXIMA = 70;

function limitar(valor: number, minimo: number, maximo: number) {
  return Math.min(maximo, Math.max(minimo, valor));
}

function somar(atual: number | null, valor: number | null) {
  return valor === null ? atual : (atual ?? 0) + valor;
}

export function normalizarLongitude(longitude: number) {
  if (longitude >= -180 && longitude < 180) {
    return longitude;
  }

  return ((((longitude + 180) % 360) + 360) % 360) - 180;
}

export function agruparPorLocal(servicos: ServicoNoMapa[]): LocalNoGlobo[] {
  const locais = new Map<string, LocalNoGlobo>();

  for (const servico of servicos) {
    const chave = `${servico.latitude},${servico.longitude}`;
    const atual = locais.get(chave) ?? {
      chave,
      latitude: servico.latitude,
      longitude: servico.longitude,
      local: servico.local,
      servicos: [],
      totais: { energiaKwh: null, emissaoGCo2e: null },
    };

    atual.servicos.push(servico);
    atual.totais = {
      energiaKwh: somar(atual.totais.energiaKwh, servico.totais.energiaKwh),
      emissaoGCo2e: somar(
        atual.totais.emissaoGCo2e,
        servico.totais.emissaoGCo2e,
      ),
    };
    locais.set(chave, atual);
  }

  return [...locais.values()];
}

export function centralizar(longitude: number, latitude: number): Rotacao {
  return [
    normalizarLongitude(-longitude),
    limitar(-latitude, -LATITUDE_MAXIMA, LATITUDE_MAXIMA),
    0,
  ];
}

export function arrastar(
  inicial: Rotacao,
  deslocamentoX: number,
  deslocamentoY: number,
  grausPorPixel: number,
): Rotacao {
  return [
    normalizarLongitude(inicial[0] + deslocamentoX * grausPorPixel),
    limitar(
      inicial[1] - deslocamentoY * grausPorPixel,
      -LATITUDE_MAXIMA,
      LATITUDE_MAXIMA,
    ),
    inicial[2],
  ];
}

export function interpolarRotacao(
  de: Rotacao,
  para: Rotacao,
  progresso: number,
): Rotacao {
  const diferencaLongitude = normalizarLongitude(para[0] - de[0]);

  return [
    normalizarLongitude(de[0] + diferencaLongitude * progresso),
    de[1] + (para[1] - de[1]) * progresso,
    de[2] + (para[2] - de[2]) * progresso,
  ];
}

export function suavizar(progresso: number) {
  const t = limitar(progresso, 0, 1);
  return t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2;
}

export function estaVisivel(
  rotacao: Rotacao,
  longitude: number,
  latitude: number,
) {
  const centro: [number, number] = [-rotacao[0], -rotacao[1]];
  return geoDistance([longitude, latitude], centro) < Math.PI / 2;
}
