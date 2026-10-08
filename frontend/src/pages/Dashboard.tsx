import { Link, useSearchParams } from 'react-router';
import Icon from '../components/common/Icon';
import MetricCard from '../components/common/MetricCard';
import DashboardEmpty from '../components/dashboard/DashboardEmpty';
import DashboardDemo from '../components/dashboard/DashboardDemo';
import { demoTotals } from '../mocks/dashboard';
import usePageTitle from '../hooks/usePageTitle';
import '../components/dashboard/demo.css';

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
        <div className="collection-status">
          <Icon name="clock" />
          <div>
            <strong>
              {isDemo
                ? 'Exemplo de 07 de outubro de 2026'
                : 'Aguardando primeira coleta'}
            </strong>
            <span>
              {isDemo
                ? 'Atualização simulada às 14:32'
                : 'Última atualização ainda indisponível'}
            </span>
          </div>
        </div>
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
      <section aria-label="Indicadores gerais" className="metrics-grid">
        <MetricCard
          label="Serviços monitorados"
          value={isDemo ? demoTotals.services : undefined}
          description={
            isDemo
              ? `${demoTotals.active} ativos · ${demoTotals.unavailable} indisponível · ${demoTotals.noMetrics} sem métricas`
              : 'Disponibilidade da infraestrutura'
          }
          icon="server"
          tone="forest"
        />
        <MetricCard
          label="Energia estimada"
          value={isDemo ? demoTotals.energyKwh : undefined}
          unit="kWh"
          description={
            isDemo
              ? 'Total ilustrativo de 07/10/2026'
              : 'Consumo dos recursos computacionais'
          }
          icon="bolt"
          tone="leaf"
        />
        <MetricCard
          label="Emissões estimadas"
          value={isDemo ? demoTotals.carbonKg : undefined}
          unit="kgCO₂e"
          description={
            isDemo
              ? 'Total ilustrativo de 07/10/2026'
              : 'Dióxido de carbono equivalente'
          }
          icon="cloud"
          tone="olive"
        />
      </section>
      {isDemo ? <DashboardDemo /> : <DashboardEmpty />}
    </div>
  );
}
