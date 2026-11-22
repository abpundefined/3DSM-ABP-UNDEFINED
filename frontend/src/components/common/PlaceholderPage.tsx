import type { ReactNode } from 'react';
import Icon from './Icon';
import usePageTitle from '../../hooks/usePageTitle';

interface PlaceholderPageProps {
  eyebrow: string;
  title: string;
  description: string;
  issue: string;
  children?: ReactNode;
}

export default function PlaceholderPage({
  eyebrow,
  title,
  description,
  issue,
  children,
}: PlaceholderPageProps) {
  usePageTitle(title);

  return (
    <div className="placeholder-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
          <p className="page-subtitle">{description}</p>
        </div>
      </div>
      <section className="placeholder-notice" aria-label="Situação da página">
        <Icon name="info" />
        <p>
          Página em construção na Sprint 3 (issue {issue}). O conteúdo final
          substitui este aviso.
        </p>
      </section>
      {children}
    </div>
  );
}
