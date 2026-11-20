import './loading-skeleton.css';

export type SkeletonVariant = 'cards' | 'chart' | 'table' | 'detail' | 'page';

type LoadingSkeletonProps = {
  variant?: SkeletonVariant;
  title?: string;
  description?: string;
  compact?: boolean;
};

const BAR_HEIGHTS = ['42%', '74%', '58%', '90%', '66%', '80%', '48%'];

function SkeletonCards() {
  return (
    <div className="skeleton-cards" aria-hidden="true">
      {[0, 1, 2].map((item) => (
        <div key={item} className="skeleton-card">
          <div className="skeleton-row-between">
            <span className="skeleton-block skeleton-line--short" />
            <span className="skeleton-block skeleton-pill" />
          </div>
          <span className="skeleton-block skeleton-metric" />
          <span className="skeleton-block skeleton-line" />
          <span className="skeleton-block skeleton-line--medium" />
        </div>
      ))}
    </div>
  );
}

function SkeletonChart() {
  return (
    <div className="skeleton-chart" aria-hidden="true">
      <div className="skeleton-chart-header">
        <span className="skeleton-block skeleton-line--medium" />
        <span className="skeleton-block skeleton-pill" />
      </div>
      <div className="skeleton-chart-bars">
        {BAR_HEIGHTS.map((height, index) => (
          <span
            key={index}
            className="skeleton-block skeleton-bar"
            style={{ height }}
          />
        ))}
      </div>
      <span className="skeleton-block skeleton-axis" />
    </div>
  );
}

function SkeletonTable() {
  return (
    <div className="skeleton-table" aria-hidden="true">
      <div className="skeleton-table-head">
        <span className="skeleton-block skeleton-line--medium" />
        <span className="skeleton-block skeleton-line--short" />
        <span className="skeleton-block skeleton-line--short" />
        <span className="skeleton-block skeleton-line--short" />
      </div>
      {[0, 1, 2, 3, 4].map((row) => (
        <div key={row} className="skeleton-table-row">
          <span className="skeleton-block skeleton-line--medium" />
          <span className="skeleton-block skeleton-line--short" />
          <span className="skeleton-block skeleton-line--short" />
          <span className="skeleton-block skeleton-line--short" />
        </div>
      ))}
    </div>
  );
}

function SkeletonDetail() {
  return (
    <div className="skeleton-detail" aria-hidden="true">
      <div className="skeleton-detail-totals">
        {[0, 1].map((card) => (
          <div key={card} className="skeleton-card">
            <span className="skeleton-block skeleton-line--short" />
            <span className="skeleton-block skeleton-metric" />
            <span className="skeleton-block skeleton-line--medium" />
          </div>
        ))}
      </div>
      <div className="skeleton-detail-charts">
        <SkeletonChart />
        <SkeletonChart />
      </div>
    </div>
  );
}

function SkeletonPage() {
  return (
    <div className="skeleton-page" aria-hidden="true">
      <div className="skeleton-page-header">
        <span className="skeleton-block skeleton-line--short" />
        <span className="skeleton-block skeleton-title" />
      </div>
      <SkeletonCards />
      <SkeletonChart />
    </div>
  );
}

export default function LoadingSkeleton({
  variant = 'page',
  title,
  description,
  compact = false,
}: LoadingSkeletonProps) {
  return (
    <div
      className={`loading-skeleton loading-skeleton--${variant}${compact ? ' loading-skeleton--compact' : ''}`}
      role="status"
      aria-busy="true"
    >
      {title && <h2 className="skeleton-sr-only">{title}</h2>}
      {description && <p className="skeleton-sr-only">{description}</p>}
      {variant === 'cards' && <SkeletonCards />}
      {variant === 'chart' && <SkeletonChart />}
      {variant === 'table' && <SkeletonTable />}
      {variant === 'detail' && <SkeletonDetail />}
      {variant === 'page' && <SkeletonPage />}
    </div>
  );
}
