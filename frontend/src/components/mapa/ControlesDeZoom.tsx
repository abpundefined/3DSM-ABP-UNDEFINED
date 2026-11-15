import type { MouseEvent, ReactNode } from 'react';

type ControlesDeZoomProps = {
  onAproximar: (evento: MouseEvent<HTMLButtonElement>) => void;
  onAfastar: (evento: MouseEvent<HTMLButtonElement>) => void;
  aproximarDesabilitado?: boolean;
  afastarDesabilitado?: boolean;
  rotuloAfastar?: string;
  children?: ReactNode;
};

export default function ControlesDeZoom({
  onAproximar,
  onAfastar,
  aproximarDesabilitado = false,
  afastarDesabilitado = false,
  rotuloAfastar = 'Afastar',
  children,
}: ControlesDeZoomProps) {
  return (
    <div className="controles-zoom">
      <button
        type="button"
        aria-label="Aproximar"
        title="Aproximar"
        disabled={aproximarDesabilitado}
        onClick={onAproximar}
      >
        <span aria-hidden="true">+</span>
      </button>
      <button
        type="button"
        aria-label={rotuloAfastar}
        title={rotuloAfastar}
        disabled={afastarDesabilitado}
        onClick={onAfastar}
      >
        <span aria-hidden="true">−</span>
      </button>
      {children}
    </div>
  );
}
