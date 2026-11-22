import { Link, useInRouterContext, useSearchParams } from 'react-router';
import { ehModoDemo, MODO_DEMO_ESTATICO } from '../../utils/modoDemo';

function MethodologyRouterLink({ className }: { className: string }) {
  const [searchParams] = useSearchParams();
  const to =
    !MODO_DEMO_ESTATICO && ehModoDemo(searchParams)
      ? '/metodologia?demo=1'
      : '/metodologia';

  return (
    <Link
      to={to}
      className={className}
      onClick={(event) => event.stopPropagation()}
    >
      Como calculamos?
    </Link>
  );
}

export default function MethodologyLink({
  className = '',
}: {
  className?: string;
}) {
  const inRouter = useInRouterContext();
  const combinedClassName = className
    ? `methodology-link ${className}`
    : 'methodology-link';

  if (!inRouter) {
    return (
      <a
        href="/metodologia"
        className={combinedClassName}
        onClick={(event) => event.stopPropagation()}
      >
        Como calculamos?
      </a>
    );
  }

  return <MethodologyRouterLink className={combinedClassName} />;
}
