import { Component, type ReactNode } from 'react';
import FeedbackPanel from './FeedbackPanel';

export default class AppErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <FeedbackPanel
          kind="error"
          title="Não foi possível abrir esta página"
          description="Ocorreu uma falha inesperada. Recarregue a aplicação para tentar novamente."
        >
          <button
            type="button"
            className="button button--primary"
            onClick={() => window.location.reload()}
          >
            Recarregar aplicação
          </button>
        </FeedbackPanel>
      );
    }
    return this.props.children;
  }
}
