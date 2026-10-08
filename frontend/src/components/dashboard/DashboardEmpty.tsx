import FeedbackPanel from '../common/FeedbackPanel';
import Icon from '../common/Icon';

export default function DashboardEmpty() {
  return (
    <div className="dashboard-columns">
      <section className="services-panel" aria-labelledby="services-heading">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">INFRAESTRUTURA</p>
            <h2 id="services-heading">Serviços monitorados</h2>
          </div>
          <span className="quiet-label">Sem dados</span>
        </div>
        <FeedbackPanel
          kind="empty"
          title="Seu monitoramento começa aqui"
          description="Os serviços e suas métricas aparecerão neste painel quando a integração de monitoramento estiver disponível."
        >
          <p className="empty-caption">
            Você poderá acompanhar disponibilidade, energia e emissões em um só
            lugar.
          </p>
        </FeedbackPanel>
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
