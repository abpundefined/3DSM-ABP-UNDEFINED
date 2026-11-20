import { demoHistory, demoServices } from '../../mocks/dashboard';
import {
  calcularComponentesPorMetricas,
  somarComponentes,
} from '../../utils/composicaoEnergia';
import { META_CARBONO_DEMO } from '../../utils/metaCarbono';
import ComposicaoEnergia from '../common/ComposicaoEnergia';
import ImpactTrendChart from '../charts/ImpactTrendChart';
import ServiceStatusChart from '../charts/ServiceStatusChart';
import ImpactRanking from '../charts/ImpactRanking';
import DemoServicesTable from './DemoServicesTable';
import PainelMetaCarbono from './PainelMetaCarbono';

const demoComposicao = somarComponentes(
  demoServices.map((service, index) =>
    service.cpuPercent === null || service.memoryGb === null
      ? null
      : calcularComponentesPorMetricas({
          cpuPercent: service.cpuPercent,
          memoryGb: service.memoryGb,
          diskGb: 10 + (index % 5) * 8,
          networkGb: 2 + (index % 4) * 3,
        }),
  ),
);

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
      <ComposicaoEnergia
        componentes={demoComposicao}
        subtitulo="Soma ilustrativa da potência estimada por recurso entre os serviços ativos."
        isDemo
      />
      <div className="demo-detail-grid">
        <DemoServicesTable services={demoServices} />
        <ImpactRanking services={demoServices} />
      </div>
    </div>
  );
}
