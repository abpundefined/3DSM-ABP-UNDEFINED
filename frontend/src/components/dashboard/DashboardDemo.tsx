import { demoHistory, demoServices } from '../../mocks/dashboard';
import ImpactTrendChart from '../charts/ImpactTrendChart';
import ServiceStatusChart from '../charts/ServiceStatusChart';
import ImpactRanking from '../charts/ImpactRanking';
import DemoServicesTable from './DemoServicesTable';

export default function DashboardDemo() {
  return (
    <div className="demo-dashboard">
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
