import { useCallback, useEffect, useId, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router';
import { buildServiceDrawerSummary } from '../../utils/serviceDetail';
import Icon from '../common/Icon';
import MethodologyLink from '../common/MethodologyLink';
import type { LiveService } from './liveTypes';

type ServiceQuickDrawerProps = {
  service: LiveService | null;
  collectionIntervalSeconds: number | null;
  returnFocusTo: HTMLElement | null;
  onClose: () => void;
};

/**
 * Accessible slide-over drawer displaying current telemetry and impact
 * for a selected service card, with Esc handling and focus restoration.
 */
export default function ServiceQuickDrawer({
  service,
  collectionIntervalSeconds,
  returnFocusTo,
  onClose,
}: ServiceQuickDrawerProps) {
  const titleId = useId();
  const descriptionId = useId();
  const drawerRef = useRef<HTMLElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const summary = useMemo(
    () =>
      service
        ? buildServiceDrawerSummary(service, collectionIntervalSeconds)
        : null,
    [service, collectionIntervalSeconds],
  );

  const handleClose = useCallback(() => {
    const focusTarget = returnFocusTo ?? previousFocusRef.current;
    onClose();
    if (focusTarget?.isConnected) {
      window.requestAnimationFrame(() => {
        focusTarget.focus();
      });
    }
  }, [returnFocusTo, onClose]);

  useEffect(() => {
    if (!service) {
      return;
    }

    previousFocusRef.current =
      returnFocusTo ??
      (document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null);

    const frameId = window.requestAnimationFrame(() => {
      drawerRef.current?.focus();
    });

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        handleClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [service, returnFocusTo, handleClose]);

  if (!service || !summary) {
    return null;
  }

  return createPortal(
    <div
      className="service-drawer-backdrop"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          handleClose();
        }
      }}
    >
      <aside
        ref={drawerRef}
        className="service-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        tabIndex={-1}
      >
        <header className="service-drawer-header">
          <div>
            <p className="eyebrow">DETALHE RÁPIDO DO SERVIÇO</p>
            <h2 id={titleId}>{summary.title}</h2>
            <p id={descriptionId} className="service-drawer-subtitle">
              {summary.locationLabel}
            </p>
          </div>
          <div className="service-drawer-header-actions">
            <span
              className={`service-badge service-badge--${summary.status.className}`}
            >
              <Icon name={summary.status.icon} />
              {summary.status.label}
            </span>
            <button
              type="button"
              className="service-drawer-close"
              onClick={handleClose}
              aria-label="Fechar painel"
            >
              ×
            </button>
          </div>
        </header>

        <div
          className="service-drawer-body"
          tabIndex={0}
          aria-label="Métricas atuais do serviço"
        >
          <section
            className="service-drawer-section"
            aria-label="Impacto ambiental da última coleta"
          >
            <h3>Última coleta</h3>
            <dl className="service-drawer-impact-grid">
              <div>
                <dt>Energia</dt>
                <dd>{summary.energy}</dd>
              </div>
              <div>
                <dt>CO₂e emitido</dt>
                <dd>{summary.emissions}</dd>
              </div>
              <div>
                <dt>Intensidade de carbono</dt>
                <dd>{summary.carbonIntensity}</dd>
              </div>
              <div>
                <dt>Intervalo de coleta</dt>
                <dd>{summary.collectionInterval}</dd>
              </div>
            </dl>
            <MethodologyLink />
          </section>

          <section
            className="service-drawer-section"
            aria-label="Métricas de recursos"
          >
            <h3>Recursos da última coleta válida</h3>
            <dl className="service-drawer-metrics-grid">
              <div>
                <dt>CPU</dt>
                <dd>{summary.cpu}</dd>
              </div>
              <div>
                <dt>Memória</dt>
                <dd>{summary.memory}</dd>
              </div>
              <div>
                <dt>Disco</dt>
                <dd>{summary.disk}</dd>
              </div>
              <div>
                <dt>Uso de rede (tráfego acumulado)</dt>
                <dd>{summary.network}</dd>
              </div>
            </dl>
          </section>

          <section
            className="service-drawer-section"
            aria-label="Metadados da coleta"
          >
            <dl className="service-drawer-meta-list">
              <div>
                <dt>Localização</dt>
                <dd>{summary.locationLabel}</dd>
              </div>
              <div>
                <dt>Código da região</dt>
                <dd>{summary.regionCode}</dd>
              </div>
              <div>
                <dt>Última coleta válida</dt>
                <dd>{summary.collectedAtLabel}</dd>
              </div>
            </dl>
          </section>
        </div>

        <footer className="service-drawer-footer">
          <Link
            to={summary.historyPath}
            className="button button--primary"
            onClick={onClose}
          >
            Ver histórico
            <Icon name="arrow" />
          </Link>
          <button
            type="button"
            className="button service-drawer-cancel"
            onClick={handleClose}
          >
            Fechar
          </button>
        </footer>
      </aside>
    </div>,
    document.body,
  );
}
