import { FONTE_EQUIVALENCIAS } from '../constants/equivalencias.ts';

export type EquivalenciasCo2e = {
  kmCarro: number;
  cargasCelular: number;
};

export type EquivalenciasFormatadas = {
  carro: string;
  celular: string;
};

function formatarNumero(valor: number, casas: number): string {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  }).format(valor);
}

export function converterEquivalenciasCo2e(
  emissaoGCo2e: number | null | undefined,
): EquivalenciasCo2e | null {
  if (
    emissaoGCo2e === null ||
    emissaoGCo2e === undefined ||
    !Number.isFinite(emissaoGCo2e) ||
    emissaoGCo2e < 0
  ) {
    return null;
  }

  return {
    kmCarro: emissaoGCo2e / FONTE_EQUIVALENCIAS.carroGCo2ePorKm,
    cargasCelular: emissaoGCo2e / FONTE_EQUIVALENCIAS.celularGCo2ePorCarga,
  };
}

export function formatarEquivalenciasCo2e(
  emissaoGCo2e: number | null | undefined,
): EquivalenciasFormatadas | null {
  const convertido = converterEquivalenciasCo2e(emissaoGCo2e);
  if (convertido === null) {
    return null;
  }

  const carro =
    convertido.kmCarro === 0
      ? '≈ 0 km rodados de carro'
      : convertido.kmCarro < 0.01
        ? '≈ < 0,01 km rodados de carro'
        : `≈ ${formatarNumero(convertido.kmCarro, convertido.kmCarro < 10 ? 2 : 1)} km rodados de carro`;

  const cargasArredondadas = Math.round(convertido.cargasCelular);
  const celular =
    convertido.cargasCelular === 0
      ? '≈ 0 cargas de celular'
      : convertido.cargasCelular < 1
        ? '≈ < 1 carga de celular'
        : cargasArredondadas === 1
          ? '≈ 1 carga de celular'
          : `≈ ${formatarNumero(cargasArredondadas, 0)} cargas de celular`;

  return { carro, celular };
}
