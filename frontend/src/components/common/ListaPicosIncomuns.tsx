import Icon from './Icon';
import type { PicoIncomum } from '../../utils/picos';
import './picos-incomuns.css';

type ListaPicosIncomunsProps = {
  picos: readonly PicoIncomum[];
  limiar: number | null;
  unidade: string;
  rotulo: string;
  formatarValor?: (valor: number) => string;
};

const FORMATADOR_PADRAO = new Intl.NumberFormat('pt-BR', {
  maximumFractionDigits: 2,
});

const FORMATADOR_DESVIO = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

export default function ListaPicosIncomuns({
  picos,
  limiar,
  unidade,
  rotulo,
  formatarValor = (valor) => FORMATADOR_PADRAO.format(valor),
}: ListaPicosIncomunsProps) {
  if (picos.length === 0) {
    return null;
  }

  const titulo =
    picos.length === 1
      ? `1 pico incomum de ${rotulo.toLocaleLowerCase('pt-BR')}`
      : `${picos.length} picos incomuns de ${rotulo.toLocaleLowerCase('pt-BR')}`;

  return (
    <div
      className="picos-incomuns"
      role="region"
      aria-label={`Picos incomuns de ${rotulo.toLocaleLowerCase('pt-BR')}`}
    >
      <div className="picos-incomuns-cabecalho">
        <span className="picos-incomuns-titulo">
          <Icon name="alert" />
          <strong>{titulo}</strong>
        </span>
        {limiar !== null && (
          <span className="picos-incomuns-limiar">
            Acima de média + 3σ ({formatarValor(limiar)} {unidade})
          </span>
        )}
      </div>

      <ul
        className="picos-incomuns-lista"
        aria-label={`Lista de picos incomuns de ${rotulo.toLocaleLowerCase('pt-BR')}`}
      >
        {picos.map((pico) => (
          <li key={pico.inicio} className="picos-incomuns-item">
            <span className="picos-incomuns-anotacao">{pico.anotacao}</span>
            <span className="picos-incomuns-detalhe">
              {pico.horarioCompleto} ·{' '}
              <strong>
                {formatarValor(pico.valor)} {unidade}
              </strong>{' '}
              (+{FORMATADOR_DESVIO.format(pico.desviosAcimaDaMedia)}σ)
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
