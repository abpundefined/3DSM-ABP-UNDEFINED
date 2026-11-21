import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import PlanetaMetaCarbono from '../../src/components/dashboard/PlanetaMetaCarbono';

describe('PlanetaMetaCarbono', () => {
  it.each([
    [
      'abaixo',
      40,
      'Abaixo da meta',
      'Planeta florescendo: abaixo da meta de carbono (40,0% da meta utilizada).',
    ],
    [
      'perto',
      85,
      'Perto da meta',
      'Planeta em atenção: perto da meta de carbono (85,0% da meta utilizada).',
    ],
    [
      'acima',
      120,
      'Acima da meta',
      'Planeta murcho: acima da meta de carbono (120,0% da meta utilizada).',
    ],
  ] as const)(
    'renderiza estado %s com SVG acessível contendo estado e percentual',
    (estado, percentual, legenda, ariaLabel) => {
      render(
        <PlanetaMetaCarbono estado={estado} percentualConsumido={percentual} />,
      );

      expect(screen.getByTestId('planeta-meta-carbono')).toHaveAttribute(
        'data-estado-planeta',
        estado,
      );
      expect(screen.getByRole('img', { name: ariaLabel })).toBeVisible();
      expect(screen.getByText(legenda)).toBeVisible();
    },
  );
});
