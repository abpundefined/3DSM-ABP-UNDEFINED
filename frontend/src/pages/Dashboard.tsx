import { Link, useSearchParams } from 'react-router';
import Icon from '../components/common/Icon';
import MetricCard from '../components/common/MetricCard';
import DashboardDemo from '../components/dashboard/DashboardDemo';
import LiveDashboard from '../components/dashboard/LiveDashboard';
import { demoTotals } from '../mocks/dashboard';
import usePageTitle from '../hooks/usePageTitle';
import '../components/dashboard/demo.css';
import '../components/dashboard/live.css';

export default function Dashboard() {
  const [searchParams] = useSearchParams();
  const isDemo = searchParams.get('demo') === '1';
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
        {isDemo && <div className="collection-status">
          <Icon name="clock" />
          <div>
            <strong>Exemplo de 07 de outubro de 2026</strong>
            <span>Atualização simulada às 14:32</span>
          </div>
        </div>}
      </div>
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
        <Link
          to={isDemo ? '/' : '/?demo=1'}
          className={`button ${isDemo ? 'button--demo-exit' : 'button--accent'}`}
        >
          {isDemo ? 'Voltar ao estado vazio' : 'Ver demonstração'}
          <Icon name={isDemo ? 'back' : 'arrow'} />
        </Link>
      </section>
      {isDemo ? (
        <>
          <section aria-label="Indicadores gerais" className="metrics-grid">
            <MetricCard
              label="Serviços monitorados"
              value={demoTotals.services}
              description={`${demoTotals.active} ativos · ${demoTotals.unavailable} indisponível · ${demoTotals.noMetrics} sem métricas`}
              icon="server"
              tone="forest"
            />
            <MetricCard
              label="Energia estimada"
              value={demoTotals.energyKwh}
              unit="kWh"
              description="Total ilustrativo de 07/10/2026"
              icon="bolt"
              tone="leaf"
            />
            <MetricCard
              label="Emissões estimadas"
              value={demoTotals.carbonKg}
              unit="kgCO₂e"
              description="Total ilustrativo de 07/10/2026"
              icon="cloud"
              tone="olive"
            />
          </section>
          <DashboardDemo />
        </>
      ) : (
        <LiveDashboard />
      )}
    </div>
  );
}
