import {
  criarLegendaEmissao,
  type EscalaEmissao,
} from '../../utils/mapaEscala';

type LegendaEmissaoProps = {
  escala: EscalaEmissao;
  porIntervalo?: boolean;
  porLocal?: boolean;
};

export default function LegendaEmissao({
  escala,
  porIntervalo = false,
  porLocal = false,
}: LegendaEmissaoProps) {
  const faixas = criarLegendaEmissao(escala);
  const recorte = porIntervalo ? 'no intervalo' : 'no período';

  return (
    <section
      className={`mapa-lateral${porLocal ? ' mapa-lateral--globo' : ''}`}
      aria-labelledby="mapa-legenda-titulo"
    >
      <h2 id="mapa-legenda-titulo" className="mapa-lateral-titulo">
        Emissão {recorte}
      </h2>
      {faixas.length === 0 ? (
        <p className="mapa-lateral-nota">
          Nenhuma emissão calculada{' '}
          {porIntervalo ? 'nos intervalos' : 'no período'}.
        </p>
      ) : (
        <ul className="mapa-legenda">
          {faixas.map(({ faixa, rotulo }) => (
            <li key={faixa}>
              <span
                className={`mapa-legenda-cor mapa-legenda-cor--${faixa}`}
                aria-hidden="true"
              />
              {rotulo}
            </li>
          ))}
        </ul>
      )}
      <ul className="mapa-legenda">
        <li>
          <span
            className="mapa-legenda-cor mapa-legenda-cor--sem-dados"
            aria-hidden="true"
          />
          Sem dados {recorte}
        </li>
      </ul>
      <p className="mapa-lateral-nota">
        {porLocal
          ? 'O tamanho do ponto acompanha a emissão somada dos serviços de cada local.'
          : 'O tamanho do círculo acompanha a emissão. Os números indicam serviços agrupados.'}
      </p>
    </section>
  );
}
