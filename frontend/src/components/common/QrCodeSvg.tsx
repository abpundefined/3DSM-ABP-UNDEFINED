import { useMemo } from 'react';
import { gerarMatrizQr, gerarPathQr } from '../../utils/qrCode';

type QrCodeSvgProps = {
  valor: string;
  tamanhoPx?: number;
  margemModulos?: number;
  rotuloAcessivel: string;
  className?: string;
};

export default function QrCodeSvg({
  valor,
  tamanhoPx = 180,
  margemModulos = 4,
  rotuloAcessivel,
  className,
}: QrCodeSvgProps) {
  const { viewBoxTamanho, path } = useMemo(() => {
    const matriz = gerarMatrizQr(valor);
    return {
      viewBoxTamanho: matriz.tamanho + margemModulos * 2,
      path: gerarPathQr(matriz, margemModulos),
    };
  }, [margemModulos, valor]);

  return (
    <svg
      className={className}
      width={tamanhoPx}
      height={tamanhoPx}
      viewBox={`0 0 ${viewBoxTamanho} ${viewBoxTamanho}`}
      role="img"
      aria-label={rotuloAcessivel}
      shapeRendering="crispEdges"
    >
      <rect width={viewBoxTamanho} height={viewBoxTamanho} fill="#ffffff" />
      <path d={path} fill="#000000" />
    </svg>
  );
}
