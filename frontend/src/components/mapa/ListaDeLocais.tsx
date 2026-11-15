import { useId } from 'react';
import type { LocalNoGlobo } from '../../utils/globo';
import { somarNoMomento } from '../../utils/linhaDoTempo';
import { formatarEmissao, type EscalaEmissao } from '../../utils/mapaEscala';

type ListaDeLocaisProps = {
  locais: LocalNoGlobo[];
  escala: EscalaEmissao;
  indice: number | null;
  aberta: boolean;
  onAlternar: () => void;
  onDestacar: (local: LocalNoGlobo | null, tempo: number) => void;
  onSelecionar: (local: LocalNoGlobo) => void;
};

export default function ListaDeLocais({
  locais,
  escala,
  indice,
  aberta,
  onAlternar,
  onDestacar,
  onSelecionar,
}: ListaDeLocaisProps) {
  const idDaLista = useId();

  return (
    <div className="globo-locais">
      <button
        type="button"
        className="globo-locais-alternar"
        aria-expanded={aberta}
        aria-controls={idDaLista}
        onClick={onAlternar}
      >
        Locais ({locais.length})
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <path d="M4 6l4 4 4-4" />
        </svg>
      </button>
      <ul id={idDaLista} className="globo-locais-lista" hidden={!aberta}>
        {locais.map((local) => {
          const emissao = somarNoMomento(local.servicos, indice);
          const faixa = escala.faixa(emissao);
          const quantidade = local.servicos.length;

          return (
            <li key={local.chave}>
              <button
                type="button"
                className="globo-locais-item"
                onClick={() => onSelecionar(local)}
                onPointerEnter={(evento) => onDestacar(local, evento.timeStamp)}
                onPointerLeave={(evento) => onDestacar(null, evento.timeStamp)}
                onFocus={(evento) => onDestacar(local, evento.timeStamp)}
                onBlur={(evento) => onDestacar(null, evento.timeStamp)}
              >
                <span
                  className={`globo-locais-cor ${faixa === null ? 'globo-locais-cor--sem-dados' : `globo-locais-cor--faixa-${faixa}`}`}
                  aria-hidden="true"
                />
                <span className="globo-locais-nome">{local.local}</span>
                <span className="globo-locais-dados">
                  {quantidade > 1 ? `${quantidade} serviços · ` : ''}
                  {emissao === null ? 'sem dados' : formatarEmissao(emissao)}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
