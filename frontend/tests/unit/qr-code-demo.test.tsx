import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import ModoTvBarra from '../../src/components/layout/ModoTvBarra';
import QrCodeDemo from '../../src/pages/QrCodeDemo';

describe('QR Code da demonstração online', () => {
  it('exibe o QR code e o link escrito embaixo na barra do modo TV', () => {
    render(<ModoTvBarra pathname="/" onSair={() => undefined} />);

    const qr = screen.getByRole('img', {
      name: /QR code para acessar a demonstração online/i,
    });
    expect(qr).toBeVisible();
    expect(
      screen.getByText('abpundefined.github.io/3DSM-ABP-UNDEFINED'),
    ).toBeVisible();
    expect(screen.getByText('Acesse no celular')).toBeVisible();
  });

  it('renderiza o cartaz para impressão com QR code, link legível e botão de imprimir', () => {
    render(
      <MemoryRouter initialEntries={['/qr-code']}>
        <QrCodeDemo />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole('heading', { name: 'QR Code da demonstração' }),
    ).toBeVisible();
    expect(
      screen.getByRole('img', {
        name: /QR code para acessar a demonstração online/i,
      }),
    ).toBeVisible();
    expect(
      screen.getByRole('link', {
        name: 'abpundefined.github.io/3DSM-ABP-UNDEFINED',
      }),
    ).toHaveAttribute(
      'href',
      'https://abpundefined.github.io/3DSM-ABP-UNDEFINED/',
    );
    expect(
      screen.getByRole('button', { name: 'Imprimir cartaz' }),
    ).toBeVisible();
  });
});
