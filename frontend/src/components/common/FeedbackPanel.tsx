import type { ReactNode } from 'react';
import Icon from './Icon';
import LoadingSkeleton, { type SkeletonVariant } from './LoadingSkeleton';

type FeedbackPanelProps = {
  kind: 'empty' | 'loading' | 'error';
  title: string;
  description: string;
  skeleton?: SkeletonVariant;
  children?: ReactNode;
};

export default function FeedbackPanel({
  kind,
  title,
  description,
  skeleton = 'page',
  children,
}: FeedbackPanelProps) {
  if (kind === 'loading') {
    return (
      <LoadingSkeleton
        variant={skeleton}
        title={title}
        description={description}
      />
    );
  }

  return (
    <div
      className={`feedback feedback--${kind}`}
      role={kind === 'error' ? 'alert' : undefined}
    >
      <span className="feedback-symbol">
        <Icon name={kind === 'error' ? 'alert' : 'server'} />
      </span>
      <h2>{title}</h2>
      <p>{description}</p>
      {children}
    </div>
  );
}
