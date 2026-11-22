import {
  calcularAnelCpu,
  ESPESSURA_ANEL_CPU,
  RAIO_ANEL_CPU,
  TAMANHO_ANEL_CPU,
} from '../../utils/anelCpu';
import './anel-cpu.css';

type AnelCpuProps = {
  cpuPercent: number | string | null | undefined;
};

export default function AnelCpu({ cpuPercent }: AnelCpuProps) {
  const dados = calcularAnelCpu(cpuPercent);
  const centro = TAMANHO_ANEL_CPU / 2;
  const valorMeter =
    dados.percentual === null
      ? 0
      : Math.round(dados.percentualLimitado * 10) / 10;

  return (
    <div
      className={`anel-cpu anel-cpu--${dados.faixa}`}
      role="meter"
      aria-label="Uso de CPU"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={valorMeter}
      aria-valuetext={dados.textoAcessivel}
    >
      <div className="anel-cpu-grafico">
        <svg
          className="anel-cpu-svg"
          viewBox={`0 0 ${TAMANHO_ANEL_CPU} ${TAMANHO_ANEL_CPU}`}
          width={TAMANHO_ANEL_CPU}
          height={TAMANHO_ANEL_CPU}
          aria-hidden="true"
          focusable="false"
        >
          <circle
            className="anel-cpu-trilha"
            cx={centro}
            cy={centro}
            r={RAIO_ANEL_CPU}
            strokeWidth={ESPESSURA_ANEL_CPU}
          />
          <circle
            className="anel-cpu-progresso"
            cx={centro}
            cy={centro}
            r={RAIO_ANEL_CPU}
            strokeWidth={ESPESSURA_ANEL_CPU}
            strokeDasharray={dados.circunferencia}
            strokeDashoffset={dados.dashOffset}
          />
        </svg>
        <span className="anel-cpu-valor">{dados.textoCentro}</span>
      </div>
      <span className="anel-cpu-faixa">{dados.rotuloFaixa}</span>
    </div>
  );
}
