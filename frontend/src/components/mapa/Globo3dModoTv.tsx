import { useEffect, useMemo, useRef } from 'react';
import { geoEquirectangular, geoGraticule10, geoPath } from 'd3-geo';
import { feature, mesh } from 'topojson-client';
import type { GeometryCollection, Topology } from 'topojson-specification';
import mundo from 'world-atlas/countries-110m.json';
import usePrefersReducedMotion from '../../hooks/usePrefersReducedMotion';
import type { ServicoNoMapa } from '../../types/mapa';
import { agruparPorLocal, type LocalNoGlobo } from '../../utils/globo';
import {
  avaliarDesempenhoLento,
  calcularEstadoPulso,
  detectarSuporteWebgl,
  gerarMalhaEsfera,
  MAX_QUADROS_LENTOS_CONSECUTIVOS,
  projetarPonto3d,
  VELOCIDADE_ROTACAO_RAD_POR_SEGUNDO,
} from '../../utils/globo3dTv';
import { somarNoMomento, type Momento } from '../../utils/linhaDoTempo';
import { formatarEmissao, type EscalaEmissao } from '../../utils/mapaEscala';
import './globo-3d-tv.css';

const TAMANHO_CANVAS = 560;
const RAIO_ESFERA_CSS = 228;
const INCLINACAO_X_RAD = -0.26;
const ROTACAO_INICIAL_RAD = 0.85;
const CORES_FAIXA: Record<number, string> = {
  1: '#ce8708',
  2: '#eb9a04',
  3: '#ffb348',
  4: '#ffd29c',
  5: '#ffefdc',
};
const COR_SEM_DADOS = '#8a948d';

const atlas = mundo as unknown as Topology<{
  countries: GeometryCollection;
  land: GeometryCollection;
}>;
const continentes = feature(atlas, atlas.objects.land);
const fronteiras = mesh(atlas, atlas.objects.countries, (a, b) => a !== b);
const grade = geoGraticule10();
const malhaEsfera = gerarMalhaEsfera(36, 48);

const VERTEX_SHADER = `
attribute vec3 aPosicao;
attribute vec3 aNormal;
attribute vec2 aUv;

uniform float uRotY;
uniform float uTiltX;
uniform float uEscala;

varying vec3 vNormal;
varying vec2 vUv;

void main() {
  float cy = cos(uRotY);
  float sy = sin(uRotY);
  vec3 r1 = vec3(
    aPosicao.x * cy + aPosicao.z * sy,
    aPosicao.y,
    -aPosicao.x * sy + aPosicao.z * cy
  );

  float cx = cos(uTiltX);
  float sx = sin(uTiltX);
  vec3 r2 = vec3(
    r1.x,
    r1.y * cx - r1.z * sx,
    r1.y * sx + r1.z * cx
  );

  vNormal = normalize(r2);
  vUv = aUv;
  gl_Position = vec4(r2.x * uEscala, r2.y * uEscala, -r2.z * 0.5, 1.0);
}
`;

const FRAGMENT_SHADER = `
precision mediump float;

uniform sampler2D uTextura;
varying vec3 vNormal;
varying vec2 vUv;

void main() {
  vec3 base = texture2D(uTextura, vUv).rgb;
  vec3 luzDir = normalize(vec3(-0.45, 0.48, 0.85));
  float difusa = max(dot(vNormal, luzDir), 0.0);
  float ambiente = 0.42;
  float fresnel = pow(1.0 - max(vNormal.z, 0.0), 2.4);
  vec3 atmosfera = vec3(0.42, 0.86, 0.56) * fresnel * 0.65;
  vec3 cor = base * (ambiente + difusa * 0.72) + atmosfera;
  gl_FragColor = vec4(cor, 1.0);
}
`;

function criarTexturaTerra(): HTMLCanvasElement | null {
  if (typeof document === 'undefined') {
    return null;
  }

  const largura = 1024;
  const altura = 512;
  const canvas = document.createElement('canvas');
  canvas.width = largura;
  canvas.height = altura;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return null;
  }

  const projecao = geoEquirectangular()
    .fitExtent(
      [
        [0, 0],
        [largura, altura],
      ],
      { type: 'Sphere' },
    )
    .precision(0.5);
  const caminho = geoPath(projecao, ctx);

  ctx.fillStyle = '#122b1b';
  ctx.fillRect(0, 0, largura, altura);

  ctx.beginPath();
  caminho(grade);
  ctx.strokeStyle = 'rgba(139, 212, 154, 0.16)';
  ctx.lineWidth = 0.8;
  ctx.stroke();

  ctx.beginPath();
  caminho(continentes);
  ctx.fillStyle = '#2d6840';
  ctx.fill();
  ctx.strokeStyle = 'rgba(231, 246, 234, 0.52)';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.beginPath();
  caminho(fronteiras);
  ctx.strokeStyle = 'rgba(231, 246, 234, 0.25)';
  ctx.lineWidth = 0.7;
  ctx.stroke();

  return canvas;
}

function compilarShader(
  gl: WebGLRenderingContext,
  tipo: number,
  codigo: string,
): WebGLShader | null {
  const shader = gl.createShader(tipo);
  if (!shader) {
    return null;
  }
  gl.shaderSource(shader, codigo);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

type Globo3dModoTvProps = {
  servicos: ServicoNoMapa[];
  escala: EscalaEmissao;
  momento?: Momento | null;
  onFallback2d: () => void;
};

type PontoLocal = {
  local: LocalNoGlobo;
  faixa: number | null;
  raioBase: number;
  cor: string;
  emissaoTexto: string;
};

export default function Globo3dModoTv({
  servicos,
  escala,
  momento = null,
  onFallback2d,
}: Globo3dModoTvProps) {
  const movimentoReduzido = usePrefersReducedMotion();
  const webglCanvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const onFallbackRef = useRef(onFallback2d);

  useEffect(() => {
    onFallbackRef.current = onFallback2d;
  }, [onFallback2d]);

  const pontos = useMemo<PontoLocal[]>(() => {
    const locais = agruparPorLocal(servicos);
    const indice = momento?.indice ?? null;

    return locais.map((local) => {
      const emissao = somarNoMomento(local.servicos, indice);
      const faixa = escala.faixa(emissao);
      return {
        local,
        faixa,
        raioBase: escala.raio(emissao),
        cor: faixa === null ? COR_SEM_DADOS : (CORES_FAIXA[faixa] ?? '#ffb348'),
        emissaoTexto: emissao === null ? 'sem dados' : formatarEmissao(emissao),
      };
    });
  }, [escala, momento?.indice, servicos]);

  useEffect(() => {
    const canvasGl = webglCanvasRef.current;
    const canvasOverlay = overlayCanvasRef.current;
    if (!canvasGl || !canvasOverlay) {
      return;
    }

    if (!detectarSuporteWebgl()) {
      onFallbackRef.current();
      return;
    }

    const gl =
      canvasGl.getContext('webgl2', {
        alpha: true,
        antialias: true,
        powerPreference: 'high-performance',
      }) ??
      canvasGl.getContext('webgl', {
        alpha: true,
        antialias: true,
        powerPreference: 'high-performance',
      });

    if (!gl) {
      onFallbackRef.current();
      return;
    }

    const vs = compilarShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
    const fs = compilarShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
    const programa = gl.createProgram();
    if (!vs || !fs || !programa) {
      onFallbackRef.current();
      return;
    }

    gl.attachShader(programa, vs);
    gl.attachShader(programa, fs);
    gl.linkProgram(programa);
    if (!gl.getProgramParameter(programa, gl.LINK_STATUS)) {
      gl.deleteProgram(programa);
      onFallbackRef.current();
      return;
    }

    const texturaCanvas = criarTexturaTerra();
    if (!texturaCanvas) {
      onFallbackRef.current();
      return;
    }

    const posBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, malhaEsfera.posicoes, gl.STATIC_DRAW);

    const normBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, normBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, malhaEsfera.normais, gl.STATIC_DRAW);

    const uvBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, malhaEsfera.uvs, gl.STATIC_DRAW);

    const idxBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, idxBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, malhaEsfera.indices, gl.STATIC_DRAW);

    const textura = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, textura);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      texturaCanvas,
    );

    const aPosicao = gl.getAttribLocation(programa, 'aPosicao');
    const aNormal = gl.getAttribLocation(programa, 'aNormal');
    const aUv = gl.getAttribLocation(programa, 'aUv');
    const uRotY = gl.getUniformLocation(programa, 'uRotY');
    const uTiltX = gl.getUniformLocation(programa, 'uTiltX');
    const uEscala = gl.getUniformLocation(programa, 'uEscala');
    const uTextura = gl.getUniformLocation(programa, 'uTextura');

    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);
    gl.viewport(0, 0, canvasGl.width, canvasGl.height);

    const ctxOverlay = canvasOverlay.getContext('2d');
    const escalaClip = (RAIO_ESFERA_CSS * 2) / TAMANHO_CANVAS;

    const desenharQuadro = (rotacaoY: number, tempoSegundos: number) => {
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.useProgram(programa);

      gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
      gl.enableVertexAttribArray(aPosicao);
      gl.vertexAttribPointer(aPosicao, 3, gl.FLOAT, false, 0, 0);

      gl.bindBuffer(gl.ARRAY_BUFFER, normBuffer);
      gl.enableVertexAttribArray(aNormal);
      gl.vertexAttribPointer(aNormal, 3, gl.FLOAT, false, 0, 0);

      gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
      gl.enableVertexAttribArray(aUv);
      gl.vertexAttribPointer(aUv, 2, gl.FLOAT, false, 0, 0);

      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, idxBuffer);

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, textura);
      gl.uniform1i(uTextura, 0);
      gl.uniform1f(uRotY, rotacaoY);
      gl.uniform1f(uTiltX, INCLINACAO_X_RAD);
      gl.uniform1f(uEscala, escalaClip);

      gl.drawElements(
        gl.TRIANGLES,
        malhaEsfera.indices.length,
        gl.UNSIGNED_SHORT,
        0,
      );

      if (!ctxOverlay) {
        return;
      }

      ctxOverlay.clearRect(0, 0, TAMANHO_CANVAS, TAMANHO_CANVAS);
      const centro = TAMANHO_CANVAS / 2;

      for (const ponto of pontos) {
        const proj = projetarPonto3d(
          ponto.local.latitude,
          ponto.local.longitude,
          rotacaoY,
          INCLINACAO_X_RAD,
          RAIO_ESFERA_CSS,
          centro,
          centro,
        );
        if (!proj.visivel) {
          continue;
        }

        const pulso = calcularEstadoPulso(
          ponto.faixa,
          tempoSegundos,
          movimentoReduzido,
        );
        if (pulso.opacidade > 0) {
          ctxOverlay.beginPath();
          ctxOverlay.arc(
            proj.x,
            proj.y,
            ponto.raioBase * pulso.escala,
            0,
            Math.PI * 2,
          );
          ctxOverlay.strokeStyle = ponto.cor;
          ctxOverlay.globalAlpha = pulso.opacidade;
          ctxOverlay.lineWidth = 2.4;
          ctxOverlay.stroke();
          ctxOverlay.globalAlpha = 1;
        }

        ctxOverlay.beginPath();
        ctxOverlay.arc(proj.x, proj.y, ponto.raioBase, 0, Math.PI * 2);
        ctxOverlay.fillStyle = ponto.cor;
        ctxOverlay.fill();
        ctxOverlay.strokeStyle = '#0c1711';
        ctxOverlay.lineWidth = 2;
        ctxOverlay.stroke();
      }
    };

    const handleContextLost = (event: Event) => {
      event.preventDefault();
      onFallbackRef.current();
    };
    canvasGl.addEventListener('webglcontextlost', handleContextLost);

    desenharQuadro(ROTACAO_INICIAL_RAD, 0);

    let rafId: number | null = null;
    if (!movimentoReduzido) {
      let rotacao = ROTACAO_INICIAL_RAD;
      let ultimoTempo = performance.now();
      const inicio = ultimoTempo;
      const historicoDeltas: number[] = [];

      const animar = (agora: number) => {
        const deltaMs = agora - ultimoTempo;
        ultimoTempo = agora;

        historicoDeltas.push(deltaMs);
        if (historicoDeltas.length > MAX_QUADROS_LENTOS_CONSECUTIVOS) {
          historicoDeltas.shift();
        }
        if (avaliarDesempenhoLento(historicoDeltas)) {
          onFallbackRef.current();
          return;
        }

        const deltaSegundos = Math.min(deltaMs, 100) / 1000;
        rotacao =
          (rotacao + VELOCIDADE_ROTACAO_RAD_POR_SEGUNDO * deltaSegundos) %
          (Math.PI * 2);
        desenharQuadro(rotacao, (agora - inicio) / 1000);
        rafId = window.requestAnimationFrame(animar);
      };

      rafId = window.requestAnimationFrame(animar);
    }

    return () => {
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
      }
      canvasGl.removeEventListener('webglcontextlost', handleContextLost);
      gl.deleteTexture(textura);
      gl.deleteBuffer(posBuffer);
      gl.deleteBuffer(normBuffer);
      gl.deleteBuffer(uvBuffer);
      gl.deleteBuffer(idxBuffer);
      gl.deleteProgram(programa);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
    };
  }, [movimentoReduzido, pontos]);

  return (
    <div
      className="globo globo-3d-tv"
      role="img"
      aria-label={`Globo 3D com ${pontos.length} ${pontos.length === 1 ? 'local monitorado' : 'locais monitorados'} no modo TV`}
      data-testid="globo-3d-tv"
      data-animado={movimentoReduzido ? 'false' : 'true'}
    >
      <div className="globo-3d-tv-palco">
        <canvas
          ref={webglCanvasRef}
          className="globo-3d-tv-canvas"
          width={TAMANHO_CANVAS}
          height={TAMANHO_CANVAS}
          aria-hidden="true"
        />
        <canvas
          ref={overlayCanvasRef}
          className="globo-3d-tv-canvas globo-3d-tv-overlay"
          width={TAMANHO_CANVAS}
          height={TAMANHO_CANVAS}
          aria-hidden="true"
        />
      </div>
      <div className="globo-3d-tv-selo">
        <span>Globo 3D · WebGL</span>
        {movimentoReduzido && <span>Movimento reduzido</span>}
      </div>
    </div>
  );
}
