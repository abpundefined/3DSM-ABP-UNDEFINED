import { useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import FeedbackPanel from '../components/common/FeedbackPanel';
import Icon from '../components/common/Icon';
import MethodologyLink from '../components/common/MethodologyLink';
import PeriodSelector from '../components/common/PeriodSelector';
import CartaoOportunidade from '../components/oportunidades/CartaoOportunidade';
import useOportunidades, {
  type EstadoOportunidades,
} from '../hooks/useOportunidades';
import usePageTitle from '../hooks/usePageTitle';
import usePeriod from '../hooks/usePeriod';
import { oportunidadesDemo } from '../mocks/oportunidades';
import type { FiltroTipoOportunidade } from '../types/oportunidades';
import { formatEmission } from '../utils/formatters';
import { ehModoDemo, MODO_DEMO_ESTATICO } from '../utils/modoDemo';
import {
  filtrarOportunidadesPorTipo,
  rotuloTipoOportunidade,
  TIPOS_OPORTUNIDADE,
} from '../utils/oportunidades';
import '../components/oportunidades/oportunidades.css';

export default function Oportunidades() {
  const [searchParams] = useSearchParams();
  const isDemo = ehModoDemo(searchParams);
  const { apiQuery, linkSearch } = usePeriod();
  const { estado, recarregar } = useOportunidades(apiQuery, !isDemo);
  const [filtroTipo, setFiltroTipo] = useState<FiltroTipoOportunidade>('TODOS');

  usePageTitle(
    isDemo
      ? 'Oportunidades de redução · demonstração'
      : 'Oportunidades de redução',
  );

  const exibido: EstadoOportunidades = isDemo
    ? { status: 'pronto', dados: oportunidadesDemo }
    : estado;

  const buscaLink = isDemo ? (MODO_DEMO_ESTATICO ? '' : '?demo=1') : linkSearch;

  const filtradas =
    exibido.status === 'pronto'
      ? filtrarOportunidadesPorTipo(exibido.dados.oportunidades, filtroTipo)
      : [];

  return (
    <div className="oportunidades-page">
      <header className="page-heading">
        <div>
          <p className="eyebrow">OTIMIZAÇÃO</p>
          <h1>Oportunidades de redução</h1>
          <p className="page-subtitle">
            Ações sugeridas para reduzir emissões de CO₂e, ordenadas pela maior
            economia estimada no período.
          </p>
        </div>
        <Link
          to={isDemo && !MODO_DEMO_ESTATICO ? '/?demo=1' : '/'}
          className="button button--secondary"
        >
          <Icon name="back" />
          Voltar ao dashboard
        </Link>
      </header>

      <aside className="oportunidades-aviso" role="note">
        <Icon name="info" />
        <p>
          <strong>Sugestão estimada, não garantia:</strong> os ganhos abaixo são
          projeções operacionais baseadas no histórico do período selecionado e
          não substituem análise de latência, custo ou capacidade.{' '}
          <MethodologyLink />
        </p>
      </aside>

      {exibido.status === 'carregando' && (
        <>
          <FeedbackPanel
            kind="loading"
            skeleton="cards"
            title="Carregando oportunidades"
            description="Avaliando os serviços monitorados no período selecionado."
          />
          {!isDemo && <PeriodSelector />}
        </>
      )}

      {exibido.status === 'erro' && (
        <>
          <FeedbackPanel
            kind="error"
            title="Não foi possível carregar as oportunidades"
            description={exibido.mensagem}
          >
            <button
              type="button"
              className="button button--primary"
              onClick={recarregar}
            >
              Tentar novamente
            </button>
          </FeedbackPanel>
          {!isDemo && <PeriodSelector />}
        </>
      )}

      {exibido.status === 'pronto' && (
        <>
          <section
            className="oportunidades-indicador-resumo"
            aria-label="Resumo das oportunidades"
          >
            <div>
              <span className="oportunidades-indicador-rotulo">
                Redução potencial no período
              </span>
              <strong className="oportunidades-indicador-valor">
                {formatEmission(exibido.dados.resumo.reducaoPotencialGCo2e)}
              </strong>
            </div>
            <p className="oportunidades-indicador-nota">
              {exibido.dados.resumo.totalOportunidades}{' '}
              {exibido.dados.resumo.totalOportunidades === 1
                ? 'oportunidade encontrada'
                : 'oportunidades encontradas'}{' '}
              no período analisado.
            </p>
          </section>

          {!isDemo && <PeriodSelector />}

          <div
            className="oportunidades-filtros"
            role="group"
            aria-label="Filtrar oportunidades por tipo"
          >
            <button
              type="button"
              className="oportunidades-filtro"
              aria-pressed={filtroTipo === 'TODOS'}
              onClick={() => setFiltroTipo('TODOS')}
            >
              Todos ({exibido.dados.resumo.totalOportunidades})
            </button>
            {TIPOS_OPORTUNIDADE.map((tipo) => (
              <button
                key={tipo}
                type="button"
                className="oportunidades-filtro"
                aria-pressed={filtroTipo === tipo}
                onClick={() => setFiltroTipo(tipo)}
              >
                {rotuloTipoOportunidade(tipo)} (
                {exibido.dados.resumo.porTipo[tipo]})
              </button>
            ))}
          </div>

          {filtradas.length === 0 ? (
            <FeedbackPanel
              kind="empty"
              title="Nenhuma oportunidade para este filtro"
              description="Nenhum serviço atingiu os limiares configurados para esta categoria no período."
            />
          ) : (
            <ul className="oportunidades-grade">
              {filtradas.map((item) => (
                <li key={item.id}>
                  <CartaoOportunidade
                    oportunidade={item}
                    linkSearch={buscaLink}
                    nivelTitulo="h2"
                  />
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
