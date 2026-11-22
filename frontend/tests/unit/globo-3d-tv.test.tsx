import { render, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Globo3dModoTv from '../../src/components/mapa/Globo3dModoTv';
import { mapaDemo } from '../../src/mocks/mapa';
import { RAIOS_NO_GLOBO } from '../../src/utils/globo';
import { criarEscalaEmissao } from '../../src/utils/mapaEscala';

describe('Globo3dModoTv', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('aciona fallback automático para o mapa 2D quando WebGL não está disponível', async () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    const onFallback2d = vi.fn();
    const escala = criarEscalaEmissao(20, RAIOS_NO_GLOBO);

    render(
      <Globo3dModoTv
        servicos={mapaDemo.servicos}
        escala={escala}
        onFallback2d={onFallback2d}
      />,
    );

    await waitFor(() => {
      expect(onFallback2d).toHaveBeenCalledTimes(1);
    });
  });
});
