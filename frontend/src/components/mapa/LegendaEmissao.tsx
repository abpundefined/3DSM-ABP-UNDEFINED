import {
  criarLegendaEmissao,
  type EscalaEmissao,
} from '../../utils/mapaEscala';

type LegendaEmissaoProps = {
  escala: EscalaEmissao;
};

export default function LegendaEmissao({ escala }: LegendaEmissaoProps) {
  const faixas = criarLegendaEmissao(escala);

  return (
    <section className="mapa-lateral" aria-labelledby="mapa-legenda-titulo">
      <h2 id="mapa-legenda-titulo" className="mapa-lateral-titulo">
        Emissão no período
      </h2>
      {faixas.length === 0 ? (
        <p className="mapa-lateral-nota">
          Nenhuma emissão calculada no período.
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
          Sem dados no período
        </li>
      </ul>
      <p className="mapa-lateral-nota">
        O tamanho do círculo acompanha a emissão. Os números indicam serviços
        agrupados.
      </p>
    </section>
  );
}
