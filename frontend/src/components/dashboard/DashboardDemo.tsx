import { demoHistory, demoServices } from '../../mocks/dashboard';
import { META_CARBONO_DEMO } from '../../utils/metaCarbono';
import ImpactTrendChart from '../charts/ImpactTrendChart';
import ServiceStatusChart from '../charts/ServiceStatusChart';
import ImpactRanking from '../charts/ImpactRanking';
import DemoServicesTable from './DemoServicesTable';
import PainelMetaCarbono from './PainelMetaCarbono';

export default function DashboardDemo() {
  return (
    <div className="demo-dashboard">
      <PainelMetaCarbono
        estado={{ status: 'pronto', dados: META_CARBONO_DEMO }}
        isDemo
      />
      <div className="demo-chart-grid">
        <ImpactTrendChart history={demoHistory} />
        <ServiceStatusChart services={demoServices} />
      </div>
      <div className="demo-detail-grid">
        <DemoServicesTable services={demoServices} />
        <ImpactRanking services={demoServices} />
      </div>
    </div>
  );
}
