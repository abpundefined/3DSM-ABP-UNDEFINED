import { useEffect, useState } from 'react';
import Icon from '../common/Icon';
import {
  INTERVALO_MODO_TV_MS,
  resolverTelaModoTv,
  TELAS_MODO_TV,
} from '../../utils/modoTv';
import './modo-tv.css';

type ModoTvBarraProps = {
  pathname: string;
  intervaloMs?: number;
  onSair: () => void;
};

export default function ModoTvBarra({
  pathname,
  intervaloMs = INTERVALO_MODO_TV_MS,
  onSair,
}: ModoTvBarraProps) {
  const totalSegundos = Math.max(1, Math.round(intervaloMs / 1000));
  const [segundosRestantes, setSegundosRestantes] = useState(totalSegundos);
  const { atual, proxima, indiceAtual, total } = resolverTelaModoTv(pathname);

  useEffect(() => {
    const inicio = Date.now();
    const timer = window.setInterval(() => {
      const decorrido = Math.floor((Date.now() - inicio) / 1000);
      setSegundosRestantes(Math.max(0, totalSegundos - decorrido));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [pathname, totalSegundos]);

  const progresso = Math.min(
    100,
    Math.max(0, ((totalSegundos - segundosRestantes) / totalSegundos) * 100),
  );

  return (
    <aside className="modo-tv-barra" aria-label="Status do modo TV">
      <div className="modo-tv-identidade">
        <span className="modo-tv-marca">
          <Icon name="leaf" />
          <strong>GreenER</strong>
          <span className="modo-tv-tag">Modo TV</span>
        </span>
        <ol className="modo-tv-telas" aria-label="Telas do ciclo no modo TV">
          {TELAS_MODO_TV.map((tela, indice) => (
            <li
              key={tela.rota}
              className={
                indice === indiceAtual
                  ? 'modo-tv-tela modo-tv-tela--ativa'
                  : 'modo-tv-tela'
              }
              aria-current={indice === indiceAtual ? 'step' : undefined}
            >
              {tela.rotulo}
            </li>
          ))}
        </ol>
      </div>

      <div className="modo-tv-proxima" role="status">
        <span>
          Tela {indiceAtual + 1} de {total}: <strong>{atual.rotulo}</strong> ·
          Próxima tela: <strong>{proxima.rotulo}</strong> em {segundosRestantes}
          s
        </span>
        <div className="modo-tv-progresso" aria-hidden="true">
          <span
            className="modo-tv-progresso-preenchimento"
            style={{ width: `${progresso}%` }}
          />
        </div>
      </div>

      <button
        type="button"
        className="modo-tv-sair"
        onClick={(event) => {
          event.stopPropagation();
          onSair();
        }}
      >
        Sair do modo TV (Esc ou clique)
      </button>
    </aside>
  );
}
