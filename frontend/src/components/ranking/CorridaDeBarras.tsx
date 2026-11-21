import { useEffect, useId, useMemo, useState } from 'react';
import { Link } from 'react-router';
import FeedbackPanel from '../common/FeedbackPanel';
import useFlipList from '../../hooks/useFlipList';
import usePrefersReducedMotion from '../../hooks/usePrefersReducedMotion';
import useSerie, { type EstadoDaSerie } from '../../hooks/useSerie';
import { serieDemoRanking } from '../../mocks/ranking';
import {
  INTERVALO_QUADRO_CORRIDA_MS,
  montarQuadrosCorrida,
  proximoQuadroCorrida,
  type QuadroCorrida,
} from '../../utils/corridaBarras';
import { formatEmission } from '../../utils/formatters';
import './corrida-barras.css';

const PALETA_CORES = [
  'var(--corrida-cor-1)',
  'var(--corrida-cor-2)',
  'var(--corrida-cor-3)',
  'var(--corrida-cor-4)',
  'var(--corrida-cor-5)',
  'var(--corrida-cor-6)',
] as const;

function corDoServico(servicoId: number): string {
  const indice = Math.abs(servicoId) % PALETA_CORES.length;
  return PALETA_CORES[indice];
}

function JogadorCorridaDeBarras({
  quadros,
  linkSearch,
}: {
  quadros: QuadroCorrida[];
  linkSearch: string;
}) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const [indice, setIndice] = useState(0);
  const [reproduzindo, setReproduzindo] = useState(
    () => !prefersReducedMotion && quadros.length > 1,
  );
  const indiceSeguro = Math.min(indice, Math.max(0, quadros.length - 1));
  const quadroAtual = quadros[indiceSeguro];
  const ultimoIndice = quadros.length - 1;

  useEffect(() => {
    if (!reproduzindo) {
      return;
    }

    const timer = window.setTimeout(() => {
      const proximo = proximoQuadroCorrida(indiceSeguro, quadros.length);
      if (proximo === null) {
        setReproduzindo(false);
        return;
      }
      setIndice(proximo);
    }, INTERVALO_QUADRO_CORRIDA_MS);

    return () => window.clearTimeout(timer);
  }, [indiceSeguro, quadros.length, reproduzindo]);

  const chaveOrdem = quadroAtual.itens
    .map((item) => String(item.servicoId))
    .join(',');
  const listaRef = useFlipList<HTMLOListElement>(chaveOrdem);

  function alternarReproducao() {
    if (reproduzindo) {
      setReproduzindo(false);
      return;
    }
    if (indiceSeguro >= ultimoIndice) {
      setIndice(0);
    }
    setReproduzindo(quadros.length > 1);
  }

  function escolherQuadro(novoIndice: number) {
    setReproduzindo(false);
    setIndice(Math.max(0, Math.min(ultimoIndice, novoIndice)));
  }

  return (
    <div className="corrida-jogador">
      <div className="corrida-cabecalho">
        <div>
          <h2 id="corrida-ranking-titulo">Evolução do ranking de emissões</h2>
          <p className="ranking-resumo">
            Emissão acumulada de CO₂e por serviço ao longo do período analisado.
          </p>
        </div>
        <div className="corrida-quadro-info">
          <span className="corrida-data-rotulo">Quadro atual</span>
          <strong className="corrida-data" data-testid="corrida-data-atual">
            {quadroAtual.rotulo}
          </strong>
          <span className="corrida-meta">
            Quadro {indiceSeguro + 1} de {quadros.length} · Total:{' '}
            {formatEmission(quadroAtual.totalAcumuladoGCo2e)}
          </span>
        </div>
      </div>

      <div className="corrida-controles">
        <button
          type="button"
          className="corrida-botao-principal"
          onClick={alternarReproducao}
          disabled={quadros.length <= 1}
        >
          {reproduzindo ? 'Pausar' : 'Reproduzir'}
        </button>

        <input
          type="range"
          className="corrida-trilho"
          min={0}
          max={ultimoIndice}
          step={1}
          value={indiceSeguro}
          aria-label="Quadro da evolução"
          aria-valuetext={`${quadroAtual.rotulo} (${indiceSeguro + 1} de ${quadros.length})`}
          onChange={(evento) => escolherQuadro(Number(evento.target.value))}
        />

        <button
          type="button"
          className="corrida-botao-secundario"
          onClick={() => escolherQuadro(0)}
          disabled={indiceSeguro === 0}
        >
          Início
        </button>
      </div>

      {prefersReducedMotion && (
        <p className="corrida-aviso-reduzido">
          Movimento reduzido ativo: a reprodução automática está pausada. Use o
          controle deslizante para percorrer os quadros.
        </p>
      )}

      {quadroAtual.itens.length === 0 ? (
        <p className="ranking-resumo">
          Nenhuma emissão acumulada até {quadroAtual.rotulo}.
        </p>
      ) : (
        <ol
          ref={listaRef}
          className="corrida-lista"
          aria-label={`Ranking acumulado em ${quadroAtual.rotulo}`}
        >
          {quadroAtual.itens.map((item) => (
            <li
              key={item.servicoId}
              data-flip-id={String(item.servicoId)}
              className="corrida-item"
            >
              <span className="corrida-posicao">{item.posicao}º</span>
              <Link
                className="corrida-nome"
                to={`/servicos/${item.servicoId}${linkSearch}`}
              >
                {item.nome}
              </Link>
              <div className="corrida-trilho-barra" aria-hidden="true">
                <span
                  className="corrida-preenchimento"
                  style={{
                    width: `${item.percentualLargura}%`,
                    background: corDoServico(item.servicoId),
                  }}
                />
              </div>
              <strong className="corrida-valor">
                {formatEmission(item.acumuladoGCo2e)}
              </strong>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

export default function CorridaDeBarras({
  isDemo,
  apiQuery,
  linkSearch,
}: {
  isDemo: boolean;
  apiQuery: string;
  linkSearch: string;
}) {
  const tituloId = useId();
  const { estado, recarregar } = useSerie(apiQuery, !isDemo);
  const exibido: EstadoDaSerie = useMemo(
    () => (isDemo ? { status: 'pronto', dados: serieDemoRanking() } : estado),
    [estado, isDemo],
  );

  const quadros = useMemo(
    () =>
      exibido.status === 'pronto' ? montarQuadrosCorrida(exibido.dados) : [],
    [exibido],
  );

  const chaveSerie =
    exibido.status === 'pronto'
      ? `${exibido.dados.periodo.inicio}|${exibido.dados.periodo.fim}|${quadros.length}`
      : 'vazio';

  return (
    <section
      className="ranking-bloco corrida-painel"
      aria-labelledby={
        exibido.status === 'pronto' && quadros.length > 0
          ? 'corrida-ranking-titulo'
          : tituloId
      }
    >
      {(exibido.status !== 'pronto' || quadros.length === 0) && (
        <h2 id={tituloId}>Evolução do ranking de emissões</h2>
      )}

      {exibido.status === 'carregando' && (
        <FeedbackPanel
          kind="loading"
          skeleton="chart"
          title="Carregando a evolução do ranking"
          description="Montando a série acumulada de emissões ao longo do período."
        />
      )}

      {exibido.status === 'erro' && (
        <FeedbackPanel
          kind="error"
          title="Não foi possível carregar a evolução"
          description={exibido.mensagem}
        >
          <button
            className="button button--primary"
            type="button"
            onClick={recarregar}
          >
            Tentar novamente
          </button>
        </FeedbackPanel>
      )}

      {exibido.status === 'pronto' && quadros.length === 0 && (
        <FeedbackPanel
          kind="empty"
          title="Sem série suficiente para a evolução"
          description="Não há intervalos com emissões registradas neste período. Escolha outro período ou aguarde novas coletas."
        />
      )}

      {exibido.status === 'pronto' && quadros.length > 0 && (
        <JogadorCorridaDeBarras
          key={chaveSerie}
          quadros={quadros}
          linkSearch={linkSearch}
        />
      )}
    </section>
  );
}
