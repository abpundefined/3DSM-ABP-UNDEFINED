import { useRef, useState, type PointerEvent } from 'react';
import type { RespostaHorarios } from '../../types/horarios';
import {
  DIAS_NA_SEMANA,
  HORAS_NO_DIA,
  celulasDaJanela,
  criarLegendaDeIntensidade,
  descreverCelula,
  diaAbreviado,
  rotuloDaHora,
  temAmostras,
  type EscalaDeIntensidade,
} from '../../utils/horarios';

type GradeDeHorariosProps = {
  dados: RespostaHorarios;
  escala: EscalaDeIntensidade;
};

type CelulaAtiva = { dia: number; hora: number; x: number; y: number };

const INTERVALO_DOS_ROTULOS = 3;
const LARGURA_DA_DICA = 240;
const horas = Array.from({ length: HORAS_NO_DIA }, (_, hora) => hora);
const dias = Array.from({ length: DIAS_NA_SEMANA }, (_, dia) => dia);

export default function GradeDeHorarios({
  dados,
  escala,
}: GradeDeHorariosProps) {
  const grade = useRef<HTMLDivElement>(null);
  const [ativa, setAtiva] = useState<CelulaAtiva | null>(null);
  const { matriz, melhorJanela } = dados;
  const naJanela = new Set(
    melhorJanela
      ? celulasDaJanela(melhorJanela).map(
          ({ dia, hora }) => dia * HORAS_NO_DIA + hora,
        )
      : [],
  );

  const mostrar = (dia: number, hora: number, evento: PointerEvent) => {
    const area = grade.current?.getBoundingClientRect();
    const alvo = evento.currentTarget.getBoundingClientRect();
    if (!area) {
      return;
    }

    const metade = LARGURA_DA_DICA / 2;
    setAtiva({
      dia,
      hora,
      x: Math.min(
        Math.max(alvo.left - area.left + alvo.width / 2, metade),
        Math.max(area.width - metade, metade),
      ),
      y: alvo.top - area.top,
    });
  };

  return (
    <div className="horarios-visual">
      <div
        ref={grade}
        className="horarios-grade"
        role="img"
        aria-label="Mapa de calor da intensidade média de carbono por dia da semana e hora. Os mesmos valores estão na tabela abaixo."
        onPointerLeave={(evento) => {
          if (evento.pointerType === 'mouse') {
            setAtiva(null);
          }
        }}
      >
        <span aria-hidden="true" />
        {horas.map((hora) => (
          <span key={hora} className="horarios-hora" aria-hidden="true">
            {hora % INTERVALO_DOS_ROTULOS === 0 ? rotuloDaHora(hora) : ''}
          </span>
        ))}
        {dias.map((dia) => (
          <div key={dia} className="horarios-linha">
            <span className="horarios-dia" aria-hidden="true">
              {diaAbreviado(dia)}
            </span>
            {horas.map((hora) => {
              const celula = matriz[dia][hora];
              const faixa = temAmostras(celula)
                ? escala.faixa(celula.media)
                : null;
              const classes = [
                'horarios-celula',
                faixa === null
                  ? 'horarios-celula--sem-amostras'
                  : `horarios-celula--${faixa}`,
                naJanela.has(dia * HORAS_NO_DIA + hora)
                  ? 'horarios-celula--melhor'
                  : '',
              ];

              return (
                <span
                  key={hora}
                  className={classes.filter(Boolean).join(' ')}
                  onPointerEnter={(evento) => mostrar(dia, hora, evento)}
                  onPointerDown={(evento) => mostrar(dia, hora, evento)}
                />
              );
            })}
          </div>
        ))}
        {ativa && (
          <div
            className="horarios-dica"
            style={{ left: ativa.x, top: ativa.y }}
            aria-hidden="true"
          >
            {descreverCelula(
              ativa.dia,
              ativa.hora,
              matriz[ativa.dia][ativa.hora],
            )}
          </div>
        )}
      </div>
      <section
        className="horarios-legenda"
        aria-label="Legenda do mapa de calor"
      >
        <h3>Intensidade média (gCO₂e/kWh)</h3>
        <ul>
          {criarLegendaDeIntensidade(escala).map(({ faixa, rotulo }) => (
            <li key={faixa}>
              <span
                className={`horarios-amostra horarios-celula--${faixa}`}
                aria-hidden="true"
              />
              {rotulo}
            </li>
          ))}
          <li>
            <span
              className="horarios-amostra horarios-celula--sem-amostras"
              aria-hidden="true"
            />
            Sem amostras no período
          </li>
          {melhorJanela && (
            <li>
              <span
                className="horarios-amostra horarios-celula--melhor"
                aria-hidden="true"
              />
              Melhor janela de 3 horas
            </li>
          )}
        </ul>
      </section>
    </div>
  );
}
