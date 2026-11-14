import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from 'react';
import { geoGraticule10, geoOrthographic, geoPath } from 'd3-geo';
import { feature } from 'topojson-client';
import terra from 'world-atlas/land-110m.json';
import usePrefersReducedMotion from '../../hooks/usePrefersReducedMotion';
import type { ServicoNoMapa } from '../../types/mapa';
import {
  ROTACAO_INICIAL,
  agruparPorLocal,
  arrastar,
  centralizar,
  estaVisivel,
  interpolarRotacao,
  suavizar,
  type LocalNoGlobo,
  type Rotacao,
} from '../../utils/globo';
import { formatarEnergia } from '../../utils/mapaDados';
import {
  criarEscalaEmissao,
  formatarEmissao,
  maiorEmissao,
} from '../../utils/mapaEscala';

const TAMANHO = 520;
const RAIO = 236;
const GRAUS_POR_PIXEL = 0.35;
const PASSO_DO_TECLADO = 12;
const DURACAO_DO_ZOOM_MS = 900;
const ZOOM_FINAL = 2.6;
const LIMITE_DE_CLIQUE_PX = 4;

const continentes = feature(terra, terra.objects.land);
const grade = geoGraticule10();

type GloboInterativoProps = {
  servicos: ServicoNoMapa[];
  onSelecionar: (local: LocalNoGlobo) => void;
};

type Arrasto = { x: number; y: number; inicial: Rotacao; moveu: boolean };

function descreverLocal(local: LocalNoGlobo) {
  const nomes = local.servicos.map(({ nome }) => nome).join(', ');
  const emissao =
    local.totais.emissaoGCo2e === null
      ? 'sem dados de emissão'
      : formatarEmissao(local.totais.emissaoGCo2e);
  return `${local.local}: ${nomes}. ${emissao}`;
}

export default function GloboInterativo({
  servicos,
  onSelecionar,
}: GloboInterativoProps) {
  const [rotacao, setRotacao] = useState<Rotacao>(ROTACAO_INICIAL);
  const [zoom, setZoom] = useState(1);
  const [destaque, setDestaque] = useState<string | null>(null);
  const rotacaoRef = useRef<Rotacao>(ROTACAO_INICIAL);
  const arrastoRef = useRef<Arrasto | null>(null);
  const animacaoRef = useRef<number | null>(null);
  const movimentoReduzido = usePrefersReducedMotion();

  const locais = useMemo(() => agruparPorLocal(servicos), [servicos]);
  const escala = useMemo(
    () =>
      criarEscalaEmissao(
        maiorEmissao(locais.map(({ totais }) => totais.emissaoGCo2e)),
        { raioMinimo: 5, raioMaximo: 18 },
      ),
    [locais],
  );

  const projecao = useMemo(
    () =>
      geoOrthographic()
        .scale(RAIO * zoom)
        .translate([TAMANHO / 2, TAMANHO / 2])
        .rotate(rotacao)
        .clipAngle(90),
    [rotacao, zoom],
  );
  const caminho = geoPath(projecao);

  useEffect(
    () => () => {
      if (animacaoRef.current !== null) {
        cancelAnimationFrame(animacaoRef.current);
      }
    },
    [],
  );

  function girarPara(proxima: Rotacao) {
    rotacaoRef.current = proxima;
    setRotacao(proxima);
  }

  function selecionar(local: LocalNoGlobo) {
    if (animacaoRef.current !== null) {
      return;
    }
    if (movimentoReduzido) {
      onSelecionar(local);
      return;
    }

    const inicio = rotacaoRef.current;
    const destino = centralizar(local.longitude, local.latitude);
    let comeco: number | null = null;

    const passo = (agora: number) => {
      comeco ??= agora;
      const progresso = Math.min(1, (agora - comeco) / DURACAO_DO_ZOOM_MS);
      const suave = suavizar(progresso);
      girarPara(interpolarRotacao(inicio, destino, suave));
      setZoom(1 + (ZOOM_FINAL - 1) * suave);

      if (progresso < 1) {
        animacaoRef.current = requestAnimationFrame(passo);
      } else {
        animacaoRef.current = null;
        onSelecionar(local);
      }
    };
    animacaoRef.current = requestAnimationFrame(passo);
  }

  function iniciarArrasto(evento: PointerEvent<SVGSVGElement>) {
    if (animacaoRef.current !== null || evento.button !== 0) {
      return;
    }
    arrastoRef.current = {
      x: evento.clientX,
      y: evento.clientY,
      inicial: rotacaoRef.current,
      moveu: false,
    };
  }

  function moverArrasto(evento: PointerEvent<SVGSVGElement>) {
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
    girarPara(arrastar(arrasto.inicial, dx, dy, GRAUS_POR_PIXEL));
  }

  function encerrarArrasto(evento: PointerEvent<SVGSVGElement>) {
    if (evento.currentTarget.hasPointerCapture(evento.pointerId)) {
      evento.currentTarget.releasePointerCapture(evento.pointerId);
    }
    window.setTimeout(() => {
      arrastoRef.current = null;
    }, 0);
  }

  function girarPeloTeclado(evento: KeyboardEvent<HTMLDivElement>) {
    if (evento.target !== evento.currentTarget) {
      return;
    }

    const deslocamentos: Record<string, [number, number]> = {
      ArrowLeft: [PASSO_DO_TECLADO, 0],
      ArrowRight: [-PASSO_DO_TECLADO, 0],
      ArrowUp: [0, PASSO_DO_TECLADO],
      ArrowDown: [0, -PASSO_DO_TECLADO],
    };
    const deslocamento = deslocamentos[evento.key];
    if (!deslocamento || animacaoRef.current !== null) {
      return;
    }

    evento.preventDefault();
    girarPara(arrastar(rotacaoRef.current, ...deslocamento, 1));
  }

  function clicarNoLocal(local: LocalNoGlobo) {
    if (arrastoRef.current?.moveu) {
      return;
    }
    selecionar(local);
  }

  const visiveis = locais
    .filter((local) => estaVisivel(rotacao, local.longitude, local.latitude))
    .sort(
      (a, b) =>
        escala.raio(b.totais.emissaoGCo2e) - escala.raio(a.totais.emissaoGCo2e),
    );
  const localEmDestaque = visiveis.find(({ chave }) => chave === destaque);
  const posicaoDoDestaque = localEmDestaque
    ? projecao([localEmDestaque.longitude, localEmDestaque.latitude])
    : null;

  return (
    <div
      className="globo"
      role="group"
      aria-label="Globo com os serviços monitorados"
      aria-describedby="globo-instrucoes"
      tabIndex={0}
      onKeyDown={girarPeloTeclado}
    >
      <svg
        className="globo-svg"
        viewBox={`0 0 ${TAMANHO} ${TAMANHO}`}
        data-rotacao={rotacao.map((valor) => valor.toFixed(1)).join(',')}
        onPointerDown={iniciarArrasto}
        onPointerMove={moverArrasto}
        onPointerUp={encerrarArrasto}
        onPointerCancel={encerrarArrasto}
      >
        <g aria-hidden="true">
          <path
            className="globo-oceano"
            d={caminho({ type: 'Sphere' }) ?? ''}
          />
          <path className="globo-grade" d={caminho(grade) ?? ''} />
          <path className="globo-terra" d={caminho(continentes) ?? ''} />
        </g>
        {visiveis.map((local) => {
          const ponto = projecao([local.longitude, local.latitude]);
          if (!ponto) {
            return null;
          }
          const faixa = escala.faixa(local.totais.emissaoGCo2e);

          return (
            <circle
              key={local.chave}
              className={`globo-ponto ${faixa === null ? 'globo-ponto--sem-dados' : `globo-ponto--faixa-${faixa}`}`}
              cx={ponto[0]}
              cy={ponto[1]}
              r={escala.raio(local.totais.emissaoGCo2e)}
              role="button"
              tabIndex={0}
              aria-label={`Aproximar no mapa: ${descreverLocal(local)}`}
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
            />
          );
        })}
      </svg>
      {localEmDestaque && posicaoDoDestaque && (
        <div
          className="globo-dica"
          style={{
            left: `${(posicaoDoDestaque[0] / TAMANHO) * 100}%`,
            top: `${(posicaoDoDestaque[1] / TAMANHO) * 100}%`,
          }}
          aria-hidden="true"
        >
          <strong>{localEmDestaque.local}</strong>
          <span>
            {localEmDestaque.servicos.map(({ nome }) => nome).join(', ')}
          </span>
          <span>
            {formatarEnergia(localEmDestaque.totais.energiaKwh)} ·{' '}
            {localEmDestaque.totais.emissaoGCo2e === null
              ? 'Sem dados'
              : formatarEmissao(localEmDestaque.totais.emissaoGCo2e)}
          </span>
        </div>
      )}
      <p id="globo-instrucoes" className="globo-instrucoes">
        Arraste ou use as setas do teclado para girar. Clique em um ponto para
        aproximar no mapa.
      </p>
    </div>
  );
}
