import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent,
  type PointerEvent,
} from 'react';
import { geoGraticule10, geoOrthographic, geoPath } from 'd3-geo';
import { feature, mesh } from 'topojson-client';
import mundo from 'world-atlas/countries-110m.json';
import usePrefersReducedMotion from '../../hooks/usePrefersReducedMotion';
import type { ServicoNoMapa } from '../../types/mapa';
import {
  ROTACAO_INICIAL,
  ZOOM_DE_TRANSICAO,
  ZOOM_MINIMO_DO_GLOBO,
  agruparPorLocal,
  amortecer,
  aproximarZoom,
  arrastar,
  centralizar,
  centroDaRotacao,
  estaVisivel,
  girarComVelocidade,
  interpolarRotacao,
  limitarVelocidade,
  limitarZoomDoGlobo,
  normalizarLongitude,
  suavizar,
  tempoComAtrito,
  zoomEquivalenteNoMapa,
  zoomPelaRoda,
  type LocalNoGlobo,
  type Rotacao,
  type Velocidade,
} from '../../utils/globo';
import { somarNoMomento, type Momento } from '../../utils/linhaDoTempo';
import { formatarEnergia } from '../../utils/mapaDados';
import { formatarEmissao, type EscalaEmissao } from '../../utils/mapaEscala';
import ControlesDeZoom from './ControlesDeZoom';

const TAMANHO = 520;
const RAIO = 236;
const GRAUS_POR_PIXEL = 0.35;
const PASSO_DO_TECLADO = 12;
const DURACAO_DO_ZOOM_MS = 900;
const ZOOM_FINAL = 2.6;
const PASSO_DO_BOTAO = 1.5;
const LIMITE_DE_CLIQUE_PX = 4;
const GIRO_AUTOMATICO = 0.006;
const ESPERA_PARA_GIRAR_MS = 2500;
const ATRITO_MS = 400;
const VELOCIDADE_MINIMA = 0.002;
const VELOCIDADE_MAXIMA = 0.5;
const SUAVIZACAO_DO_ZOOM_MS = 140;
const TEMPO_PARADO_MS = 100;
const INTERVALO_MAXIMO_MS = 200;
const RAMPA_DO_GIRO_MS = 1200;
export const ZOOM_DE_RETORNO = 2.6;

const continentes = feature(mundo, mundo.objects.land);
const fronteiras = mesh(mundo, mundo.objects.countries, (a, b) => a !== b);
const grade = geoGraticule10();

function criarEstrelas(quantidade: number) {
  let semente = 7;
  const aleatorio = () => {
    semente = (semente * 16807) % 2147483647;
    return semente / 2147483647;
  };
  return Array.from({ length: quantidade }, () => ({
    x: aleatorio() * TAMANHO,
    y: aleatorio() * TAMANHO,
    raio: 0.4 + aleatorio() * 0.9,
    opacidade: 0.25 + aleatorio() * 0.55,
  }));
}

const estrelas = criarEstrelas(90);
const PARALAXE_DAS_ESTRELAS = 0.25;

export type CentroDoGlobo = {
  latitude: number;
  longitude: number;
  zoom: number;
};

type GloboInterativoProps = {
  servicos: ServicoNoMapa[];
  escala: EscalaEmissao;
  momento?: Momento | null;
  rotacaoInicial?: Rotacao;
  zoomInicial?: number;
  onSelecionar: (local: LocalNoGlobo) => void;
  onEntrarNoMapa: (centro: CentroDoGlobo) => void;
};

type Arrasto = {
  x: number;
  y: number;
  inicial: Rotacao;
  moveu: boolean;
  amostra: { tempo: number; rotacao: Rotacao };
};

type Pinca = { distancia: number; zoomInicial: number };

function formatarEmissaoOuVazio(valor: number | null) {
  return valor === null ? 'sem dados de emissão' : formatarEmissao(valor);
}

function descreverLocal(local: LocalNoGlobo, momento: Momento | null) {
  const nomes = local.servicos.map(({ nome }) => nome).join(', ');
  const emissao = formatarEmissaoOuVazio(
    somarNoMomento(local.servicos, momento?.indice ?? null),
  );
  return `${local.local}: ${nomes}. ${momento ? `Em ${momento.rotulo}, ${emissao}` : emissao}`;
}

function distanciaEntre(pontos: { x: number; y: number }[]) {
  return Math.hypot(pontos[0].x - pontos[1].x, pontos[0].y - pontos[1].y);
}

export default function GloboInterativo({
  servicos,
  escala,
  momento = null,
  rotacaoInicial = ROTACAO_INICIAL,
  zoomInicial = ZOOM_MINIMO_DO_GLOBO,
  onSelecionar,
  onEntrarNoMapa,
}: GloboInterativoProps) {
  const [zoomAlvo, setZoomAlvo] = useState(ZOOM_MINIMO_DO_GLOBO);
  const [destaque, setDestaque] = useState<string | null>(null);
  const [giroEscolhido, setGiroEscolhido] = useState<boolean | null>(null);
  const movimentoReduzido = usePrefersReducedMotion();
  const giroAtivo = giroEscolhido ?? !movimentoReduzido;

  const svgRef = useRef<SVGSVGElement>(null);
  const camadasRef = useRef<{
    estrelas: SVGGElement | null;
    halo: SVGCircleElement | null;
    oceano: SVGPathElement | null;
    grade: SVGPathElement | null;
    terra: SVGPathElement | null;
    fronteiras: SVGPathElement | null;
    luz: SVGPathElement | null;
  }>({
    estrelas: null,
    halo: null,
    oceano: null,
    grade: null,
    terra: null,
    fronteiras: null,
    luz: null,
  });
  const dicaRef = useRef<HTMLDivElement>(null);
  const destaqueRef = useRef<string | null>(null);
  const rotacaoRef = useRef<Rotacao>(rotacaoInicial);
  const zoomRef = useRef(zoomInicial);
  const zoomAlvoRef = useRef(ZOOM_MINIMO_DO_GLOBO);
  const velocidadeRef = useRef<Velocidade>([0, 0]);
  const arrastoRef = useRef<Arrasto | null>(null);
  const pincaRef = useRef<Pinca | null>(null);
  const ponteirosRef = useRef(new Map<number, { x: number; y: number }>());
  const selecaoRef = useRef<number | null>(null);
  const ultimaInteracaoRef = useRef(0);
  const pausadoRef = useRef({ destaque: false, foco: false });
  const direcaoDoGiroRef = useRef(1);
  const forcaDoGiroRef = useRef(0);
  const entrouNoMapaRef = useRef(false);
  const giroAtivoRef = useRef(giroAtivo);
  const movimentoReduzidoRef = useRef(movimentoReduzido);
  const aoEntrarNoMapaRef = useRef(onEntrarNoMapa);
  const desenharRef = useRef(() => {});

  const idDosGradientes = useId();
  const idDaLuz = `${idDosGradientes}-luz`;
  const idDoHalo = `${idDosGradientes}-halo`;
  const locais = useMemo(() => agruparPorLocal(servicos), [servicos]);
  const locaisRef = useRef(locais);
  const indice = momento?.indice ?? null;
  const emissaoDoLocal = (local: LocalNoGlobo) =>
    somarNoMomento(local.servicos, indice);

  function desenhar() {
    const svg = svgRef.current;
    const camadas = camadasRef.current;
    if (!svg) {
      return;
    }

    const rotacao = rotacaoRef.current;
    const zoom = zoomRef.current;
    const projecao = geoOrthographic()
      .scale(RAIO * zoom)
      .translate([TAMANHO / 2, TAMANHO / 2])
      .rotate(rotacao)
      .clipAngle(90);
    const caminho = geoPath(projecao);
    const esfera = caminho({ type: 'Sphere' }) ?? '';

    svg.dataset.rotacao = rotacao.map((valor) => valor.toFixed(1)).join(',');
    svg.dataset.zoom = zoom.toFixed(2);
    camadas.halo?.setAttribute('r', String(RAIO * zoom * 1.12));
    camadas.oceano?.setAttribute('d', esfera);
    camadas.luz?.setAttribute('d', esfera);
    camadas.grade?.setAttribute('d', caminho(grade) ?? '');
    camadas.terra?.setAttribute('d', caminho(continentes) ?? '');
    camadas.fronteiras?.setAttribute('d', caminho(fronteiras) ?? '');

    const deslocamento = rotacao[0] * PARALAXE_DAS_ESTRELAS;
    camadas.estrelas?.querySelectorAll('circle').forEach((circulo, posicao) => {
      const x =
        (((estrelas[posicao].x + deslocamento) % TAMANHO) + TAMANHO) % TAMANHO;
      circulo.setAttribute('cx', String(x));
    });

    const posicoes = new Map<string, [number, number] | null>();
    for (const local of locaisRef.current) {
      const ponto = estaVisivel(rotacao, local.longitude, local.latitude)
        ? projecao([local.longitude, local.latitude])
        : null;
      posicoes.set(local.chave, ponto);
    }
    svg
      .querySelectorAll<SVGCircleElement>('[data-local]')
      .forEach((circulo) => {
        const ponto = posicoes.get(circulo.dataset.local ?? '');
        if (ponto) {
          circulo.setAttribute('cx', String(ponto[0]));
          circulo.setAttribute('cy', String(ponto[1]));
          circulo.style.removeProperty('display');
        } else {
          circulo.style.display = 'none';
        }
      });

    const pontoDaDica = destaqueRef.current
      ? posicoes.get(destaqueRef.current)
      : null;
    pausadoRef.current.destaque = Boolean(pontoDaDica);
    const dica = dicaRef.current;
    if (dica) {
      if (pontoDaDica) {
        dica.style.left = `${(pontoDaDica[0] / TAMANHO) * 100}%`;
        dica.style.top = `${(pontoDaDica[1] / TAMANHO) * 100}%`;
        dica.style.removeProperty('display');
      } else {
        dica.style.display = 'none';
      }
    }
  }

  useLayoutEffect(() => {
    locaisRef.current = locais;
    destaqueRef.current = destaque;
    desenhar();
  });

  useEffect(() => {
    giroAtivoRef.current = giroAtivo;
    movimentoReduzidoRef.current = movimentoReduzido;
    aoEntrarNoMapaRef.current = onEntrarNoMapa;
    desenharRef.current = desenhar;
  });

  useEffect(() => {
    const entrarNoMapa = () => {
      if (entrouNoMapaRef.current) {
        return;
      }
      entrouNoMapaRef.current = true;
      const largura = svgRef.current?.getBoundingClientRect().width ?? TAMANHO;
      const raioEmPixels = RAIO * zoomRef.current * (largura / TAMANHO);
      aoEntrarNoMapaRef.current({
        ...centroDaRotacao(rotacaoRef.current),
        zoom: zoomEquivalenteNoMapa(raioEmPixels),
      });
    };

    let quadroId = 0;
    let anterior: number | null = null;
    ultimaInteracaoRef.current = performance.now();

    const quadro = (agora: number) => {
      const intervalo =
        anterior === null ? 0 : Math.min(INTERVALO_MAXIMO_MS, agora - anterior);
      anterior = agora;

      if (selecaoRef.current === null && !arrastoRef.current?.moveu) {
        let mudou = false;
        const velocidade = velocidadeRef.current;
        const pausado =
          pausadoRef.current.destaque ||
          pausadoRef.current.foco ||
          pincaRef.current !== null ||
          agora - ultimaInteracaoRef.current < ESPERA_PARA_GIRAR_MS;

        if (velocidade[0] !== 0 || velocidade[1] !== 0) {
          rotacaoRef.current = girarComVelocidade(
            rotacaoRef.current,
            velocidade,
            tempoComAtrito(intervalo, ATRITO_MS),
          );
          velocidadeRef.current = amortecer(
            velocidade,
            intervalo,
            ATRITO_MS,
            VELOCIDADE_MINIMA,
          );
          if (velocidadeRef.current[0] === 0 && velocidade[0] !== 0) {
            direcaoDoGiroRef.current = Math.sign(velocidade[0]);
          }
          forcaDoGiroRef.current = 0;
          mudou = true;
        } else if (giroAtivoRef.current && !pausado && intervalo > 0) {
          forcaDoGiroRef.current = Math.min(
            1,
            forcaDoGiroRef.current + intervalo / RAMPA_DO_GIRO_MS,
          );
          const forca = suavizar(forcaDoGiroRef.current);
          rotacaoRef.current = girarComVelocidade(
            rotacaoRef.current,
            [GIRO_AUTOMATICO * direcaoDoGiroRef.current * forca, 0],
            intervalo,
          );
          mudou = true;
        } else {
          forcaDoGiroRef.current = 0;
        }

        if (zoomRef.current !== zoomAlvoRef.current) {
          zoomRef.current = movimentoReduzidoRef.current
            ? zoomAlvoRef.current
            : aproximarZoom(
                zoomRef.current,
                zoomAlvoRef.current,
                intervalo,
                SUAVIZACAO_DO_ZOOM_MS,
              );
          mudou = true;
        }
        if (mudou) {
          desenharRef.current();
        }
        if (zoomRef.current >= ZOOM_DE_TRANSICAO - 0.02) {
          entrarNoMapa();
        }
      }

      quadroId = requestAnimationFrame(quadro);
    };

    quadroId = requestAnimationFrame(quadro);
    return () => {
      cancelAnimationFrame(quadroId);
      if (selecaoRef.current !== null) {
        cancelAnimationFrame(selecaoRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) {
      return;
    }

    const aoRolar = (evento: WheelEvent) => {
      if (selecaoRef.current !== null) {
        return;
      }
      evento.preventDefault();
      const fator = evento.deltaMode === WheelEvent.DOM_DELTA_LINE ? 16 : 1;
      const proximo = zoomPelaRoda(zoomAlvoRef.current, evento.deltaY * fator);
      ultimaInteracaoRef.current = evento.timeStamp;
      zoomAlvoRef.current = proximo;
      setZoomAlvo(proximo);
    };

    svg.addEventListener('wheel', aoRolar, { passive: false });
    return () => svg.removeEventListener('wheel', aoRolar);
  }, []);

  function marcarInteracao(tempo: number) {
    ultimaInteracaoRef.current = tempo;
  }

  function girarPara(proxima: Rotacao) {
    rotacaoRef.current = proxima;
    desenhar();
  }

  function mudarZoom(proximo: number, tempo: number) {
    marcarInteracao(tempo);
    zoomAlvoRef.current = proximo;
    setZoomAlvo(proximo);
  }

  function selecionar(local: LocalNoGlobo) {
    if (selecaoRef.current !== null) {
      return;
    }
    velocidadeRef.current = [0, 0];
    if (movimentoReduzido) {
      onSelecionar(local);
      return;
    }

    const inicio = rotacaoRef.current;
    const zoomInicial = zoomRef.current;
    const destino = centralizar(local.longitude, local.latitude);
    let comeco: number | null = null;

    const passo = (agora: number) => {
      comeco ??= agora;
      const progresso = Math.min(1, (agora - comeco) / DURACAO_DO_ZOOM_MS);
      const suave = suavizar(progresso);
      const proximoZoom = zoomInicial + (ZOOM_FINAL - zoomInicial) * suave;
      zoomRef.current = proximoZoom;
      zoomAlvoRef.current = proximoZoom;
      girarPara(interpolarRotacao(inicio, destino, suave));

      if (progresso < 1) {
        selecaoRef.current = requestAnimationFrame(passo);
      } else {
        selecaoRef.current = null;
        onSelecionar(local);
      }
    };
    selecaoRef.current = requestAnimationFrame(passo);
  }

  function aoPressionar(evento: PointerEvent<SVGSVGElement>) {
    if (selecaoRef.current !== null) {
      return;
    }
    if (evento.pointerType === 'mouse' && evento.button !== 0) {
      return;
    }
    marcarInteracao(evento.timeStamp);
    velocidadeRef.current = [0, 0];
    ponteirosRef.current.set(evento.pointerId, {
      x: evento.clientX,
      y: evento.clientY,
    });

    if (ponteirosRef.current.size === 2) {
      evento.currentTarget.setPointerCapture(evento.pointerId);
      pincaRef.current = {
        distancia: distanciaEntre([...ponteirosRef.current.values()]),
        zoomInicial: zoomAlvoRef.current,
      };
      if (arrastoRef.current) {
        arrastoRef.current.moveu = true;
      }
      return;
    }

    arrastoRef.current = {
      x: evento.clientX,
      y: evento.clientY,
      inicial: rotacaoRef.current,
      moveu: false,
      amostra: { tempo: evento.timeStamp, rotacao: rotacaoRef.current },
    };
  }

  function aoMover(evento: PointerEvent<SVGSVGElement>) {
    if (!ponteirosRef.current.has(evento.pointerId)) {
      return;
    }
    ponteirosRef.current.set(evento.pointerId, {
      x: evento.clientX,
      y: evento.clientY,
    });
    marcarInteracao(evento.timeStamp);

    const pinca = pincaRef.current;
    if (pinca) {
      const distancia = distanciaEntre([...ponteirosRef.current.values()]);
      mudarZoom(
        limitarZoomDoGlobo(pinca.zoomInicial * (distancia / pinca.distancia)),
        evento.timeStamp,
      );
      return;
    }

    const arrasto = arrastoRef.current;
    if (!arrasto) {
      return;
    }

    const dx = evento.clientX - arrasto.x;
    const dy = evento.clientY - arrasto.y;
    if (!arrasto.moveu && Math.hypot(dx, dy) < LIMITE_DE_CLIQUE_PX) {
      return;
    }
    if (!arrasto.moveu) {
      arrasto.moveu = true;
      evento.currentTarget.setPointerCapture(evento.pointerId);
    }

    const proxima = arrastar(
      arrasto.inicial,
      dx,
      dy,
      GRAUS_POR_PIXEL / zoomRef.current,
    );
    const decorrido = evento.timeStamp - arrasto.amostra.tempo;
    if (decorrido > 0) {
      const instantanea: Velocidade = [
        normalizarLongitude(proxima[0] - arrasto.amostra.rotacao[0]) /
          decorrido,
        (proxima[1] - arrasto.amostra.rotacao[1]) / decorrido,
      ];
      const anterior = velocidadeRef.current;
      velocidadeRef.current = limitarVelocidade(
        [
          anterior[0] * 0.4 + instantanea[0] * 0.6,
          anterior[1] * 0.4 + instantanea[1] * 0.6,
        ],
        VELOCIDADE_MAXIMA,
      );
      arrasto.amostra = { tempo: evento.timeStamp, rotacao: proxima };
    }
    girarPara(proxima);
  }

  function aoSoltar(evento: PointerEvent<SVGSVGElement>) {
    if (evento.currentTarget.hasPointerCapture(evento.pointerId)) {
      evento.currentTarget.releasePointerCapture(evento.pointerId);
    }
    ponteirosRef.current.delete(evento.pointerId);
    marcarInteracao(evento.timeStamp);

    if (pincaRef.current) {
      if (ponteirosRef.current.size < 2) {
        pincaRef.current = null;
        velocidadeRef.current = [0, 0];
      }
    } else {
      const arrasto = arrastoRef.current;
      const parado =
        !arrasto?.moveu ||
        evento.timeStamp - arrasto.amostra.tempo > TEMPO_PARADO_MS;
      if (parado || movimentoReduzido) {
        velocidadeRef.current = [0, 0];
      }
    }

    window.setTimeout(() => {
      if (ponteirosRef.current.size === 0) {
        arrastoRef.current = null;
      }
    }, 0);
  }

  function aoUsarTeclado(evento: KeyboardEvent<HTMLDivElement>) {
    if (evento.target !== evento.currentTarget || selecaoRef.current !== null) {
      return;
    }

    if (evento.key === '+' || evento.key === '=') {
      evento.preventDefault();
      mudarZoom(
        limitarZoomDoGlobo(zoomAlvoRef.current * PASSO_DO_BOTAO),
        evento.timeStamp,
      );
      return;
    }
    if (evento.key === '-') {
      evento.preventDefault();
      mudarZoom(
        limitarZoomDoGlobo(zoomAlvoRef.current / PASSO_DO_BOTAO),
        evento.timeStamp,
      );
      return;
    }

    const deslocamentos: Record<string, [number, number]> = {
      ArrowLeft: [PASSO_DO_TECLADO, 0],
      ArrowRight: [-PASSO_DO_TECLADO, 0],
      ArrowUp: [0, -PASSO_DO_TECLADO],
      ArrowDown: [0, PASSO_DO_TECLADO],
    };
    const deslocamento = deslocamentos[evento.key];
    if (!deslocamento) {
      return;
    }

    evento.preventDefault();
    marcarInteracao(evento.timeStamp);
    if (movimentoReduzido) {
      girarPara(
        arrastar(rotacaoRef.current, deslocamento[0], -deslocamento[1], 1),
      );
      return;
    }
    velocidadeRef.current = [
      velocidadeRef.current[0] + deslocamento[0] / ATRITO_MS,
      velocidadeRef.current[1] + deslocamento[1] / ATRITO_MS,
    ];
  }

  function aoSairDoFoco(evento: FocusEvent<HTMLDivElement>) {
    if (!evento.currentTarget.contains(evento.relatedTarget)) {
      pausadoRef.current.foco = false;
    }
  }

  function clicarNoLocal(local: LocalNoGlobo) {
    if (arrastoRef.current?.moveu) {
      return;
    }
    selecionar(local);
  }

  const ordenados = [...locais].sort(
    (a, b) => escala.raio(emissaoDoLocal(b)) - escala.raio(emissaoDoLocal(a)),
  );
  const localEmDestaque = locais.find(({ chave }) => chave === destaque);

  return (
    <div
      className="globo"
      role="group"
      aria-label="Globo com os serviços monitorados"
      aria-describedby="globo-instrucoes"
      tabIndex={0}
      onKeyDown={aoUsarTeclado}
      onFocus={(evento) => {
        pausadoRef.current.foco =
          evento.target.matches(':focus-visible') &&
          !evento.target.closest('.controles-zoom');
      }}
      onBlur={aoSairDoFoco}
    >
      <svg
        ref={svgRef}
        className="globo-svg"
        viewBox={`0 0 ${TAMANHO} ${TAMANHO}`}
        onPointerDown={aoPressionar}
        onPointerMove={aoMover}
        onPointerUp={aoSoltar}
        onPointerCancel={aoSoltar}
      >
        <defs>
          <radialGradient id={idDaLuz} cx="34%" cy="28%" r="78%">
            <stop offset="0" stopColor="#ffffff" stopOpacity="0.12" />
            <stop offset="0.5" stopColor="#ffffff" stopOpacity="0" />
            <stop offset="0.82" stopColor="#000000" stopOpacity="0.12" />
            <stop offset="1" stopColor="#000000" stopOpacity="0.42" />
          </radialGradient>
          <radialGradient id={idDoHalo}>
            <stop offset="0.86" stopColor="#8bd49a" stopOpacity="0" />
            <stop offset="0.9" stopColor="#8bd49a" stopOpacity="0.28" />
            <stop offset="1" stopColor="#8bd49a" stopOpacity="0" />
          </radialGradient>
        </defs>
        <g aria-hidden="true">
          <g
            className="globo-estrelas"
            ref={(elemento) => {
              camadasRef.current.estrelas = elemento;
            }}
          >
            {estrelas.map((estrela, posicao) => (
              <circle
                key={posicao}
                cy={estrela.y}
                r={estrela.raio}
                opacity={estrela.opacidade}
              />
            ))}
          </g>
          <circle
            className="globo-halo"
            ref={(elemento) => {
              camadasRef.current.halo = elemento;
            }}
            cx={TAMANHO / 2}
            cy={TAMANHO / 2}
            fill={`url(#${idDoHalo})`}
          />
          <path
            className="globo-oceano"
            ref={(elemento) => {
              camadasRef.current.oceano = elemento;
            }}
          />
          <path
            className="globo-grade"
            ref={(elemento) => {
              camadasRef.current.grade = elemento;
            }}
          />
          <path
            className="globo-terra"
            ref={(elemento) => {
              camadasRef.current.terra = elemento;
            }}
          />
          <path
            className="globo-fronteiras"
            ref={(elemento) => {
              camadasRef.current.fronteiras = elemento;
            }}
          />
          <path
            className="globo-luz"
            ref={(elemento) => {
              camadasRef.current.luz = elemento;
            }}
            fill={`url(#${idDaLuz})`}
          />
        </g>
        {ordenados.map((local) => {
          const emissao = emissaoDoLocal(local);
          const faixa = escala.faixa(emissao);
          const raio = escala.raio(emissao);

          return [
            faixa !== null && faixa >= 4 && (
              <circle
                key={`${local.chave}-pulso`}
                className={`globo-pulso globo-ponto--faixa-${faixa}`}
                data-local={local.chave}
                r={raio}
                aria-hidden="true"
              />
            ),
            <circle
              key={local.chave}
              className={`globo-ponto ${faixa === null ? 'globo-ponto--sem-dados' : `globo-ponto--faixa-${faixa}`}`}
              data-local={local.chave}
              r={raio}
              role="button"
              tabIndex={0}
              aria-label={`Aproximar no mapa: ${descreverLocal(local, momento)}`}
              onClick={() => clicarNoLocal(local)}
              onKeyDown={(evento) => {
                if (evento.key === 'Enter' || evento.key === ' ') {
                  evento.preventDefault();
                  selecionar(local);
                }
              }}
              onPointerEnter={() => setDestaque(local.chave)}
              onPointerLeave={() => setDestaque(null)}
              onFocus={() => setDestaque(local.chave)}
              onBlur={() => setDestaque(null)}
            />,
          ];
        })}
      </svg>
      <ControlesDeZoom
        onAproximar={(evento) =>
          mudarZoom(
            limitarZoomDoGlobo(zoomAlvoRef.current * PASSO_DO_BOTAO),
            evento.timeStamp,
          )
        }
        onAfastar={(evento) =>
          mudarZoom(
            limitarZoomDoGlobo(zoomAlvoRef.current / PASSO_DO_BOTAO),
            evento.timeStamp,
          )
        }
        afastarDesabilitado={zoomAlvo <= ZOOM_MINIMO_DO_GLOBO}
      >
        <button
          type="button"
          aria-label={giroAtivo ? 'Pausar rotação' : 'Girar o globo'}
          title={giroAtivo ? 'Pausar rotação' : 'Girar o globo'}
          onClick={(evento) => {
            marcarInteracao(evento.timeStamp);
            setGiroEscolhido(!giroAtivo);
          }}
        >
          {giroAtivo ? (
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <rect x="4" y="3" width="3" height="10" rx="1" />
              <rect x="9" y="3" width="3" height="10" rx="1" />
            </svg>
          ) : (
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d="M5 3.5v9a.5.5 0 0 0 .77.42l7-4.5a.5.5 0 0 0 0-.84l-7-4.5A.5.5 0 0 0 5 3.5Z" />
            </svg>
          )}
        </button>
      </ControlesDeZoom>
      {localEmDestaque && (
        <div className="globo-dica" ref={dicaRef} aria-hidden="true">
          <strong>{localEmDestaque.local}</strong>
          <span>
            {localEmDestaque.servicos.map(({ nome }) => nome).join(', ')}
          </span>
          <span>
            {momento
              ? `Em ${momento.rotulo}`
              : formatarEnergia(localEmDestaque.totais.energiaKwh)}{' '}
            · {formatarEmissaoOuVazio(emissaoDoLocal(localEmDestaque))}
          </span>
        </div>
      )}
      <p id="globo-instrucoes" className="globo-instrucoes">
        Arraste para girar e use a roda do mouse ou os botões + e − para
        aproximar até entrar no mapa. Clique em um ponto para ir direto a ele.
      </p>
    </div>
  );
}
