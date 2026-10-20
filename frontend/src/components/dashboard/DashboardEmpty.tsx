import FeedbackPanel from '../common/FeedbackPanel';
import Icon from '../common/Icon';
import { useEffect, useState } from 'react';
import { apiRequest } from '../../services/api';
import type { ServiceStatus } from '../../types/dashboard';
import { serviceStatusPresentation } from './demoPresentation';

// Contrato de GET /servicos; os estados correspondem ao enum persistido pelo backend.
type MonitoredService = {
  id: number;
  nome: string;
  regiaoCodigo: string;
  estadoAtual:
    | 'DISPONIVEL'
    | 'INDISPONIVEL'
    | 'SEM_METRICAS'
    | 'REMOVIDO'
    | 'DESCONHECIDO';
};

// Adapta os estados do backend aos identificadores visuais usados pelo dashboard.
function toStatus(status: MonitoredService['estadoAtual']): ServiceStatus {
  if (status === 'INDISPONIVEL') return 'unavailable';
  if (status === 'SEM_METRICAS') return 'noMetrics';
  return 'active';
}

function ServiceStatusList() {
  const [services, setServices] = useState<MonitoredService[] | null>(null);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let mounted = true;
    // Busca os estados atuais e repete a consulta para refletir as coletas seguintes.
    const load = async () => {
      try {
        const result = await apiRequest<MonitoredService[]>('/servicos');
        if (mounted) {
          // Registros removidos ficam no banco para histórico, mas não são serviços monitorados atuais.
          setServices(
            (result ?? []).filter((service) => service.estadoAtual !== 'REMOVIDO'),
          );
          setHasError(false);
        }
      } catch {
        if (mounted) setHasError(true);
      }
    };

    void load();
    // Atualiza a interface periodicamente sem exigir recarregamento da página.
    const timer = window.setInterval(() => void load(), 30000);
    return () => {
      mounted = false;
      window.clearInterval(timer);
    };
  }, []);

  // Informa ao operador quando a lista carrega, falha ou ainda não tem serviços.
  if (hasError) {
    return (
      <FeedbackPanel
        kind="error"
        title="Não foi possível carregar os serviços"
        description="Verifique a conexão com o servidor. Tentaremos novamente em instantes."
      />
    );
  }
  if (services === null) {
    return (
      <FeedbackPanel
        kind="loading"
        title="Carregando serviços"
        description="Consultando o status do monitoramento."
      />
    );
  }
  if (!services.length) {
    return (
      <FeedbackPanel
        kind="empty"
        title="Nenhum serviço monitorado"
        description="Os serviços descobertos pelo monitoramento aparecerão aqui."
      />
    );
  }

  return (
    <ul
      className="monitored-service-list"
      aria-label="Status dos serviços monitorados"
    >
      {services.map((service) => {
        const status = toStatus(service.estadoAtual);
        // Um serviço ainda sem coleta não deve ser apresentado como ativo.
        const presentation =
          service.estadoAtual === 'DESCONHECIDO'
            ? { label: 'Aguardando coleta', icon: 'info' as const }
            : serviceStatusPresentation[status];
        return (
          <li key={service.id}>
            <span>
              <strong>{service.nome}</strong>
              <small>{service.regiaoCodigo}</small>
            </span>
            <span className={`service-badge service-badge--${status}`}>
              <Icon name={presentation.icon} />
              {presentation.label}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

export default function DashboardEmpty() {
  return (
    <div className="dashboard-columns">
      <section className="services-panel" aria-labelledby="services-heading">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">INFRAESTRUTURA</p>
            <h2 id="services-heading">Serviços monitorados</h2>
          </div>
          <span className="quiet-label">Atualização automática</span>
        </div>
        <ServiceStatusList />
        <details className="monitoring-help">
          <summary>
            Como funciona o monitoramento <Icon name="chevron" />
          </summary>
          <div>
            <ol>
              <li>
                <strong>Descobrir os serviços.</strong> O GreenER identifica as
                aplicações disponíveis no agregador de métricas.
              </li>
              <li>
                <strong>Acompanhar os recursos.</strong> As coletas registram o
                uso computacional de cada serviço ao longo do tempo.
              </li>
              <li>
                <strong>Entender o impacto.</strong> Esses dados ajudam a
                estimar energia e emissões de carbono.
              </li>
            </ol>
            <p>
              A consulta do dashboard é pública. O acesso administrativo será
              necessário para configurar as coletas.
            </p>
          </div>
        </details>
      </section>
      <aside className="indicator-guide" aria-labelledby="guide-heading">
        <p className="eyebrow">DO RECURSO AO IMPACTO</p>
        <h2 id="guide-heading">O que você vai acompanhar</h2>
        <p className="guide-intro">
          Cada indicador conta uma parte da história.
        </p>
        <ul>
          <li>
            <span className="guide-icon guide-icon--forest">
              <Icon name="cpu" />
            </span>
            <div>
              <h3>Processamento</h3>
              <p>Uso de CPU dos serviços monitorados.</p>
            </div>
          </li>
          <li>
            <span className="guide-icon guide-icon--leaf">
              <Icon name="memory" />
            </span>
            <div>
              <h3>Memória</h3>
              <p>Recursos de memória utilizados por cada serviço.</p>
            </div>
          </li>
          <li>
            <span className="guide-icon guide-icon--olive">
              <Icon name="bolt" />
            </span>
            <div>
              <h3>Energia</h3>
              <p>Consumo estimado, expresso em quilowatt-hora (kWh).</p>
            </div>
          </li>
          <li>
            <span className="guide-icon guide-icon--moss">
              <Icon name="cloud" />
            </span>
            <div>
              <h3>Emissões</h3>
              <p>Impacto estimado em quilogramas de CO₂ equivalente.</p>
            </div>
          </li>
        </ul>
        <div className="guide-note">
          <Icon name="info" />
          <p>
            O símbolo <strong>—</strong> indica um dado indisponível. Ele não
            representa consumo zero.
          </p>
        </div>
      </aside>
    </div>
  );
}
