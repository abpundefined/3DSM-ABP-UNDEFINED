import type { RespostaHorarios } from '../../types/horarios';
import {
  DIAS_NA_SEMANA,
  HORAS_NO_DIA,
  celulasDaJanela,
  diaAbreviado,
  formatarNumero,
  nomeDoDia,
  rotuloDaHora,
  temAmostras,
} from '../../utils/horarios';

const horas = Array.from({ length: HORAS_NO_DIA }, (_, hora) => hora);
const dias = Array.from({ length: DIAS_NA_SEMANA }, (_, dia) => dia);

export default function TabelaDeHorarios({
  dados,
}: {
  dados: RespostaHorarios;
}) {
  const { matriz, melhorJanela, fusoHorario } = dados;
  const naJanela = new Set(
    melhorJanela
      ? celulasDaJanela(melhorJanela).map(
          ({ dia, hora }) => dia * HORAS_NO_DIA + hora,
        )
      : [],
  );

  return (
    <details className="horarios-tabela">
      <summary>Ver os dados do mapa de calor em tabela</summary>
      <div
        className="horarios-tabela-rolagem"
        role="region"
        aria-label="Tabela da intensidade por hora e dia da semana"
        tabIndex={0}
      >
        <table>
          <caption>
            Intensidade média de carbono em gCO₂e/kWh por hora e dia da semana,
            no fuso {fusoHorario}. Entre parênteses, o número de amostras.
          </caption>
          <thead>
            <tr>
              <th scope="col">Hora</th>
              {dias.map((dia) => (
                <th key={dia} scope="col" abbr={nomeDoDia(dia)}>
                  {diaAbreviado(dia)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {horas.map((hora) => (
              <tr key={hora}>
                <th scope="row">{rotuloDaHora(hora)}</th>
                {dias.map((dia) => {
                  const celula = matriz[dia][hora];
                  const melhor = naJanela.has(dia * HORAS_NO_DIA + hora);

                  return (
                    <td
                      key={dia}
                      className={melhor ? 'horarios-tabela-melhor' : undefined}
                    >
                      {temAmostras(celula) ? (
                        `${formatarNumero(celula.media!)} (${celula.quantidadeAmostras})`
                      ) : (
                        <>
                          <span aria-hidden="true">—</span>
                          <span className="horarios-oculto">sem amostras</span>
                        </>
                      )}
                      {melhor && (
                        <span className="horarios-oculto">, melhor janela</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
