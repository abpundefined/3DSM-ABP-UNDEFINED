export const LIMITE_QUADRO_LENTO_MS = 66;
export const MAX_QUADROS_LENTOS_CONSECUTIVOS = 8;
export const VELOCIDADE_ROTACAO_RAD_POR_SEGUNDO = 0.22;

export type Ponto3dProjetado = {
  x: number;
  y: number;
  z: number;
  visivel: boolean;
};

export type EstadoPulso = {
  escala: number;
  opacidade: number;
};

export function detectarSuporteWebgl(
  criarCanvas: () => HTMLCanvasElement | null = () =>
    typeof document !== 'undefined' ? document.createElement('canvas') : null,
): boolean {
  try {
    const canvas = criarCanvas();
    if (!canvas || typeof canvas.getContext !== 'function') {
      return false;
    }

    const contexto =
      canvas.getContext('webgl2', { failIfMajorPerformanceCaveat: true }) ??
      canvas.getContext('webgl', { failIfMajorPerformanceCaveat: true }) ??
      canvas.getContext('webgl2') ??
      canvas.getContext('webgl');

    return contexto !== null;
  } catch {
    return false;
  }
}

export function avaliarDesempenhoLento(
  deltasMs: readonly number[],
  limiteMs = LIMITE_QUADRO_LENTO_MS,
  minimoConsecutivos = MAX_QUADROS_LENTOS_CONSECUTIVOS,
): boolean {
  if (minimoConsecutivos <= 0) {
    return false;
  }

  let consecutivos = 0;
  for (const delta of deltasMs) {
    if (Number.isFinite(delta) && delta > limiteMs) {
      consecutivos += 1;
      if (consecutivos >= minimoConsecutivos) {
        return true;
      }
    } else {
      consecutivos = 0;
    }
  }

  return false;
}

export function projetarPonto3d(
  latitude: number,
  longitude: number,
  rotacaoYRad: number,
  inclinacaoXRad: number,
  raio: number,
  centroX: number,
  centroY: number,
): Ponto3dProjetado {
  const latRad = (latitude * Math.PI) / 180;
  const lonRad = (longitude * Math.PI) / 180 + rotacaoYRad;

  const cosLat = Math.cos(latRad);
  const x0 = cosLat * Math.sin(lonRad);
  const y0 = Math.sin(latRad);
  const z0 = cosLat * Math.cos(lonRad);

  const cosTilt = Math.cos(inclinacaoXRad);
  const sinTilt = Math.sin(inclinacaoXRad);
  const y1 = y0 * cosTilt - z0 * sinTilt;
  const z1 = y0 * sinTilt + z0 * cosTilt;

  return {
    x: centroX + x0 * raio,
    y: centroY - y1 * raio,
    z: z1,
    visivel: z1 > 0.04,
  };
}

export function calcularEstadoPulso(
  faixa: number | null,
  tempoSegundos: number,
  movimentoReduzido: boolean,
): EstadoPulso {
  if (movimentoReduzido || faixa === null || faixa <= 0) {
    return { escala: 1, opacidade: 0 };
  }

  const velocidade = 0.65 + faixa * 0.2;
  const fase = (tempoSegundos * velocidade) % 1;
  const escala = 1 + fase * (1.2 + faixa * 0.22);
  const opacidade = Math.max(0, (1 - fase) * (0.45 + faixa * 0.09));

  return { escala, opacidade };
}

export function gerarMalhaEsfera(latSegmentos = 36, lonSegmentos = 48) {
  const posicoes: number[] = [];
  const uvs: number[] = [];
  const normais: number[] = [];
  const indices: number[] = [];

  for (let lat = 0; lat <= latSegmentos; lat += 1) {
    const v = lat / latSegmentos;
    const phi = (0.5 - v) * Math.PI;
    const cosPhi = Math.cos(phi);
    const sinPhi = Math.sin(phi);

    for (let lon = 0; lon <= lonSegmentos; lon += 1) {
      const u = lon / lonSegmentos;
      const theta = (u - 0.5) * 2 * Math.PI;
      const sinTheta = Math.sin(theta);
      const cosTheta = Math.cos(theta);

      const x = cosPhi * sinTheta;
      const y = sinPhi;
      const z = cosPhi * cosTheta;

      posicoes.push(x, y, z);
      normais.push(x, y, z);
      uvs.push(u, v);
    }
  }

  const stride = lonSegmentos + 1;
  for (let lat = 0; lat < latSegmentos; lat += 1) {
    for (let lon = 0; lon < lonSegmentos; lon += 1) {
      const a = lat * stride + lon;
      const b = a + stride;
      indices.push(a, b, a + 1);
      indices.push(b, b + 1, a + 1);
    }
  }

  return {
    posicoes: new Float32Array(posicoes),
    normais: new Float32Array(normais),
    uvs: new Float32Array(uvs),
    indices: new Uint16Array(indices),
  };
}
