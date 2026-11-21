import { useState } from 'react';
import { Link } from 'react-router';
import Icon from '../components/common/Icon';
import QrCodeSvg from '../components/common/QrCodeSvg';
import usePageTitle from '../hooks/usePageTitle';
import {
  formatarUrlLegivel,
  MODO_DEMO_ESTATICO,
  resolverUrlDemoPublica,
} from '../utils/modoDemo';
import './qr-code-demo.css';

export default function QrCodeDemo() {
  usePageTitle('QR Code da demonstração');
  const urlDemo = resolverUrlDemoPublica();
  const urlLegivel = formatarUrlLegivel(urlDemo);
  const [copiado, setCopiado] = useState(false);

  async function copiarLink() {
    try {
      await navigator.clipboard.writeText(urlDemo);
      setCopiado(true);
    } catch {
      setCopiado(false);
    }
  }

  return (
    <div className="qr-page">
      <header className="page-heading qr-page-acoes">
        <div>
          <p className="eyebrow">FEIRA E PORTFÓLIO</p>
          <h1>QR Code da demonstração</h1>
          <p className="page-subtitle">
            Versão pronta para imprimir em papel A4 ou exibir no estande.
          </p>
        </div>
        <div className="qr-page-botoes">
          <button
            type="button"
            className="button button--primary"
            onClick={() => window.print()}
          >
            <Icon name="printer" />
            Imprimir cartaz
          </button>
          <button
            type="button"
            className="button button--secondary"
            onClick={() => void copiarLink()}
          >
            {copiado ? 'Link copiado' : 'Copiar link'}
          </button>
          <Link
            to={MODO_DEMO_ESTATICO ? '/' : '/?demo=1'}
            className="button button--secondary"
          >
            <Icon name="back" />
            Voltar ao dashboard
          </Link>
        </div>
      </header>

      {copiado && (
        <p className="sr-only" role="status">
          Link da demonstração copiado para a área de transferência.
        </p>
      )}

      <section
        className="qr-cartaz"
        aria-label="Cartaz para impressão com QR code da demonstração online"
      >
        <div className="qr-cartaz-marca">
          <Icon name="leaf" />
          <span>GreenER</span>
        </div>
        <h2 className="qr-cartaz-titulo">Explore o GreenER no seu celular</h2>
        <p className="qr-cartaz-subtitulo">
          Aponte a câmera para testar o dashboard, o mapa interativo de emissões
          e o ranking em modo demonstração.
        </p>

        <div className="qr-cartaz-codigo">
          <QrCodeSvg
            valor={urlDemo}
            tamanhoPx={280}
            rotuloAcessivel={`QR code para acessar a demonstração online do GreenER em ${urlDemo}`}
            className="qr-cartaz-svg"
          />
        </div>

        <p className="qr-cartaz-link-rotulo">Ou acesse diretamente:</p>
        <a
          className="qr-cartaz-link"
          href={urlDemo}
          target="_blank"
          rel="noreferrer"
        >
          {urlLegivel}
        </a>
        <p className="qr-cartaz-nota">
          Demonstração estática com dados ilustrativos · Equipe Undefined ·
          FATEC Jacareí
        </p>
      </section>
    </div>
  );
}
