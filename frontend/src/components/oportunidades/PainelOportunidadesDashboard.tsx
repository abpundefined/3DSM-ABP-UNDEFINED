import { Link } from 'react-router';
import type { EstadoOportunidades } from '../../hooks/useOportunidades';
import { formatEmission } from '../../utils/formatters';
import FeedbackPanel from '../common/FeedbackPanel';
import Icon from '../common/Icon';
import MethodologyLink from '../common/MethodologyLink';
import CartaoOportunidade from './CartaoOportunidade';
import './oportunidades.css';

const LIMITE_DASHBOARD = 4;

type PainelOportunidadesDashboardProps = {
  estado: EstadoOportunidades;
  linkSearch: string;
  isDemo?: boolean;
  onRecarregar?: () => void;
};

export default function PainelOportunidadesDashboard({
  estado,
  linkSearch,
  isDemo = false,
  onRecarregar,
}: PainelOportunidadesDashboardProps) {
  const linkTodas = `/oportunidades${linkSearch}`;

  return (
    <section
      className="oportunidades-dashboard"
      aria-labelledby="oportunidades-dashboard-titulo"
    >
      <div className="oportunidades-dashboard-cabecalho">
        <div>
          <p className="eyebrow">OTIMIZAÇÃO ESTIMADA</p>
          <h2 id="oportunidades-dashboard-titulo">
            Oportunidades de redução de emissão
          </h2>
          <p className="oportunidades-subtitulo">
            Sugestões estimadas a partir do histórico do período — não
            representam garantia de economia. <MethodologyLink />
          </p>
        </div>
        <Link to={linkTodas} className="button button--secondary">
          Ver todas
          <Icon name="arrow" />
        </Link>
      </div>

      {estado.status === 'carregando' && (
        <FeedbackPanel
          kind="loading"
          skeleton="cards"
          title="Calculando oportunidades de redução"
          description="Analisando regiões, uso de CPU e horários mais limpos no período."
        />
      )}

      {estado.status === 'erro' && (
        <FeedbackPanel
          kind="error"
          title="Não foi possível carregar as oportunidades"
          description={estado.mensagem}
        >
          {onRecarregar && (
            <button
              type="button"
              className="button button--primary"
              onClick={onRecarregar}
            >
              Tentar novamente
            </button>
          )}
        </FeedbackPanel>
      )}

      {estado.status === 'pronto' && (
        <>
          <div className="oportunidades-indicador-resumo">
            <div>
              <span className="oportunidades-indicador-rotulo">
                Redução potencial no período
              </span>
              <strong className="oportunidades-indicador-valor">
                {formatEmission(estado.dados.resumo.reducaoPotencialGCo2e)}
              </strong>
            </div>
            <p className="oportunidades-indicador-nota">
              {estado.dados.resumo.totalOportunidades === 0
                ? 'Nenhuma oportunidade acima dos limiares no período selecionado.'
                : `${estado.dados.resumo.totalOportunidades} ${estado.dados.resumo.totalOportunidades === 1 ? 'sugestão estimada identificada' : 'sugestões estimadas identificadas'}${isDemo ? ' (modo demonstração)' : ''}.`}
            </p>
          </div>

          {estado.dados.oportunidades.length > 0 && (
            <ul className="oportunidades-grade">
              {estado.dados.oportunidades
                .slice(0, LIMITE_DASHBOARD)
                .map((item) => (
                  <li key={item.id}>
                    <CartaoOportunidade
                      oportunidade={item}
                      linkSearch={linkSearch}
                      nivelTitulo="h3"
                    />
                  </li>
                ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}
