import { Link, useSearchParams } from 'react-router';
import ContadorCo2AoVivo from '../components/common/ContadorCo2AoVivo';
import EmissionEquivalences from '../components/common/EmissionEquivalences';
import Icon from '../components/common/Icon';
import MethodologyLink from '../components/common/MethodologyLink';
import MetricCard from '../components/common/MetricCard';
import VariacaoPeriodo from '../components/common/VariacaoPeriodo';
import ComparisonSelectionBar from '../components/comparacao/ComparisonSelectionBar';
import DashboardDemo from '../components/dashboard/DashboardDemo';
import LiveDashboard from '../components/dashboard/LiveDashboard';
import ServiceCounter from '../components/dashboard/ServiceCounter';
import PainelOportunidadesDashboard from '../components/oportunidades/PainelOportunidadesDashboard';
import { demoTotals } from '../mocks/dashboard';
import { oportunidadesDemo } from '../mocks/oportunidades';
import usePageTitle from '../hooks/usePageTitle';
import usePeriod from '../hooks/usePeriod';
import { calcularTaxaPorTotalEPeriodo } from '../utils/contadorCo2';
import { ehModoDemo, MODO_DEMO_ESTATICO } from '../utils/modoDemo';
import '../components/dashboard/demo.css';
import '../components/dashboard/live.css';
import '../components/comparacao/comparacao.css';

const DEMO_EMISSION_RATE_G_PER_SECOND = calcularTaxaPorTotalEPeriodo(
  demoTotals.carbonKg * 1000,
);

export default function Dashboard() {
  const [searchParams] = useSearchParams();
  const isDemo = ehModoDemo(searchParams);
  const { apiQuery, linkSearch } = usePeriod();
  usePageTitle(isDemo ? 'Dashboard · demonstração' : 'Dashboard');

  return (
    <div className="dashboard-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">MONITORAMENTO AMBIENTAL</p>
          <h1>Dashboard</h1>
          <p className="page-subtitle">
            Uma visão clara dos seus serviços e do impacto que eles geram.
          </p>
        </div>
        <div className="page-heading-actions">
          {isDemo && (
            <div className="collection-status">
              <Icon name="clock" />
              <div>
                <strong>Exemplo de 07 de outubro de 2026</strong>
                <span>Atualização simulada às 14:32</span>
              </div>
            </div>
          )}
          <Link
            to={
              isDemo
                ? '/relatorio?demo=1'
                : { pathname: '/relatorio', search: linkSearch }
            }
            className="button button--secondary"
          >
            <Icon name="printer" />
            Relatório do período
          </Link>
        </div>
      </div>
      <ComparisonSelectionBar />
      <section
        className={`demo-toolbar${isDemo ? ' demo-toolbar--active' : ''}`}
        aria-label="Modo de visualização"
      >
        <div>
          <span className="demo-toolbar-icon">
            <Icon name={isDemo ? 'info' : 'grid'} />
          </span>
          <div>
            <strong>
              {isDemo
                ? 'Modo demonstração · Dados fictícios'
                : 'Explore uma prévia do dashboard'}
            </strong>
            <p>
              {isDemo
                ? 'Valores ilustrativos para avaliar os gráficos, os indicadores e o layout.'
                : 'Veja como os indicadores e gráficos ficam com dados de exemplo.'}
            </p>
          </div>
        </div>
        {!MODO_DEMO_ESTATICO && (
          <Link
            to={isDemo ? '/' : '/?demo=1'}
            className="button button--secondary"
          >
            {isDemo ? 'Sair da demonstração' : 'Ver demonstração'}
            <Icon name={isDemo ? 'back' : 'arrow'} />
          </Link>
        )}
      </section>
      {isDemo ? (
        <>
          <ServiceCounter
            active={demoTotals.active}
            monitored={demoTotals.services}
          />
          <ContadorCo2AoVivo
            taxaGPorSegundo={DEMO_EMISSION_RATE_G_PER_SECOND}
            isDemo
          />
          <section aria-label="Indicadores gerais" className="metrics-grid">
            <MetricCard
              label="Consumo energético total"
              value={demoTotals.energyKwh}
              unit="kWh"
              description="Total ilustrativo de 07/10/2026"
              icon="bolt"
              tone="leaf"
            >
              <VariacaoPeriodo valor={null} />
              <MethodologyLink />
            </MetricCard>
            <MetricCard
              label="Emissão total de CO₂e"
              value={demoTotals.carbonKg}
              unit="kgCO₂e"
              description="Total ilustrativo de 07/10/2026"
              icon="cloud"
              tone="olive"
            >
              <VariacaoPeriodo valor={null} />
              <EmissionEquivalences emissaoGCo2e={demoTotals.carbonKg * 1000} />
              <MethodologyLink />
            </MetricCard>
            <MetricCard
              label="Serviços ativos"
              value={demoTotals.active}
              description={`${demoTotals.noMetrics} sem métricas`}
              icon="server"
              tone="forest"
            />
            <MetricCard
              label="Serviços indisponíveis"
              value={demoTotals.unavailable}
              description="Serviços fictícios sem acesso"
              icon="alert"
              tone="olive"
            />
          </section>
          <DashboardDemo />
          <PainelOportunidadesDashboard
            estado={{ status: 'pronto', dados: oportunidadesDemo }}
            linkSearch={MODO_DEMO_ESTATICO ? '' : '?demo=1'}
            isDemo
          />
        </>
      ) : (
        <LiveDashboard
          key={apiQuery}
          periodQuery={apiQuery}
          linkSearch={linkSearch}
        />
      )}
    </div>
  );
}
