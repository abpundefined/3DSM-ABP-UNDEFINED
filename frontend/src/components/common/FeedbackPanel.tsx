import type { ReactNode } from 'react';
import Icon from './Icon';

type FeedbackPanelProps = {
  kind: 'empty' | 'loading' | 'error';
  title: string;
  description: string;
  children?: ReactNode;
};

export default function FeedbackPanel({
  kind,
  title,
  description,
  children,
}: FeedbackPanelProps) {
  return (
    <div
      className={`feedback feedback--${kind}`}
      role={
        kind === 'error' ? 'alert' : kind === 'loading' ? 'status' : undefined
      }
      aria-busy={kind === 'loading' || undefined}
    >
      <span className="feedback-symbol">
        {kind === 'loading' ? (
          <span className="spinner" />
        ) : (
          <Icon name={kind === 'error' ? 'alert' : 'server'} />
        )}
      </span>
      <h2>{title}</h2>
      <p>{description}</p>
      {children}
    </div>
  );
}
