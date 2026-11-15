import 'maplibre-gl/dist/maplibre-gl.css';
import { maplibreGL } from '@maplibre/maplibre-gl-leaflet';
import { setWorkerUrl, type StyleSpecification } from 'maplibre-gl';
import urlDoWorker from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';
import { traduzirRotulos } from '../../utils/estiloDoMapa';

setWorkerUrl(urlDoWorker);

function temWebGL() {
  const canvas = document.createElement('canvas');
  return Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl'));
}

export async function criarCamadaVetorial(
  urlDoEstilo: string,
  atribuicao: string,
  sinal: AbortSignal,
) {
  if (!temWebGL()) {
    throw new Error('O navegador não tem WebGL.');
  }

  const resposta = await fetch(urlDoEstilo, { signal: sinal });
  if (!resposta.ok) {
    throw new Error(`Estilo do mapa indisponível (HTTP ${resposta.status}).`);
  }
  const estilo = (await resposta.json()) as StyleSpecification;

  return maplibreGL({
    style: traduzirRotulos(estilo),
    renderWorldCopies: false,
    attributionControl: { customAttribution: atribuicao },
  });
}
