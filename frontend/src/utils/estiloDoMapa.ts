import type { ExpressionSpecification, StyleSpecification } from 'maplibre-gl';

export const ESTILO_DO_MAPA = 'https://tiles.openfreemap.org/styles/positron';

export const ROTULO_EM_PORTUGUES: ExpressionSpecification = [
  'coalesce',
  ['get', 'name:pt'],
  ['get', 'name:latin'],
  ['get', 'name'],
];

export function usaNomeDoLugar(campo: unknown) {
  return JSON.stringify(campo ?? null).includes('name');
}

export function traduzirRotulos(
  estilo: StyleSpecification,
): StyleSpecification {
  return {
    ...estilo,
    layers: estilo.layers.map((camada) => {
      if (camada.type !== 'symbol') {
        return camada;
      }
      const campo = camada.layout?.['text-field'];
      if (!usaNomeDoLugar(campo)) {
        return camada;
      }
      return {
        ...camada,
        layout: {
          ...camada.layout,
          'text-field': ROTULO_EM_PORTUGUES,
        },
      };
    }),
  };
}
