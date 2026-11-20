import { useId } from 'react';
import type { EstadoDaMeta } from '../../hooks/useMetaCarbono';
import {
  calcularResumoMeta,
  formatarKgCo2e,
  formatarPercentualMeta,
} from '../../utils/metaCarbono';
import Icon from '../common/Icon';
import MethodologyLink from '../common/MethodologyLink';
import './meta-carbono.css';

type PainelMetaCarbonoProps = {
  estado: EstadoDaMeta;
  onRecarregar?: () => void;
  isDemo?: boolean;
};

export default function PainelMetaCarbono({
  estado,
  onRecarregar,
  isDemo = false,
}: PainelMetaCarbonoProps) {
  const tituloId = useId();

  if (estado.status !== 'pronto') {
    return (
      <section
        className="meta-carbono-painel"
        aria-labelledby={tituloId}
        aria-busy={estado.status === 'carregando' || undefined}
      >
        <div className="meta-carbono-cabecalho">
          <div>
            <p className="eyebrow">META MENSAL DE CARBONO</p>
            <h2 id={tituloId}>Projeção e meta do mês</h2>
          </div>
          <MethodologyLink />
        </div>
        {estado.status === 'carregando' ? (
          <p className="meta-carbono-aviso">
            Carregando a meta mensal e a projeção de emissões...
          </p>
        ) : (
          <div className="meta-carbono-erro">
            <p className="meta-carbono-aviso">
              Não foi possível carregar a meta mensal. {estado.mensagem}
            </p>
            {onRecarregar && (
              <button
                className="button button--primary"
                type="button"
                onClick={onRecarregar}
              >
                Recarregar a meta
              </button>
            )}
          </div>
        )}
      </section>
    );
  }

  const { dados } = estado;
  const resumo = calcularResumoMeta(dados);
  const diasTexto = `Dia ${dados.diasDecorridos} de ${dados.diasNoMes} do mês atual`;

  return (
    <section className="meta-carbono-painel" aria-labelledby={tituloId}>
      <div className="meta-carbono-cabecalho">
        <div>
          <p className="eyebrow">META MENSAL DE CARBONO</p>
          <h2 id={tituloId}>Projeção e meta do mês</h2>
          <p className="meta-carbono-subtitulo">{diasTexto}</p>
        </div>
        <MethodologyLink />
      </div>

      {resumo.temMeta &&
      dados.metaMensal !== null &&
      resumo.percentualConsumido !== null ? (
        <>
          <div className="meta-medidor-bloco">
            <div className="meta-medidor-legenda">
              <span>
                Consumido no mês:{' '}
                <strong>{formatarKgCo2e(dados.acumuladoMes)}</strong> de{' '}
                <strong>{formatarKgCo2e(dados.metaMensal)}</strong>
              </span>
              <strong className="meta-medidor-percentual">
                {formatarPercentualMeta(resumo.percentualConsumido)} da meta
              </strong>
            </div>
            <div
              className={`meta-medidor${
                resumo.ultrapassouMeta
                  ? ' meta-medidor--excedida'
                  : resumo.projecaoUltrapassaMeta
                    ? ' meta-medidor--atencao'
                    : ''
              }`}
              role="meter"
              aria-label="Consumo mensal em relação à meta de carbono"
              aria-valuemin={0}
              aria-valuemax={dados.metaMensal}
              aria-valuenow={dados.acumuladoMes}
              aria-valuetext={`${formatarKgCo2e(dados.acumuladoMes)} de ${formatarKgCo2e(dados.metaMensal)} (${formatarPercentualMeta(resumo.percentualConsumido)})`}
            >
              <div
                className="meta-medidor-preenchimento"
                style={{ width: `${resumo.percentualBarra}%` }}
              />
            </div>
          </div>

          <p className="meta-projecao-principal">{resumo.textoProjecao}</p>

          {resumo.ultrapassouMeta ? (
            <p className="meta-alerta meta-alerta--excedida" role="status">
              <Icon name="alert" />
              <span>
                Meta mensal ultrapassada: o acumulado já superou a meta de{' '}
                {formatarKgCo2e(dados.metaMensal)}. Projeção de{' '}
                {formatarKgCo2e(resumo.excessoProjetadoKg)} acima do limite.
              </span>
            </p>
          ) : resumo.projecaoUltrapassaMeta ? (
            <p className="meta-alerta meta-alerta--atencao" role="status">
              <Icon name="alert" />
              <span>
                Atenção: a projeção do mês ultrapassa a meta em{' '}
                {formatarKgCo2e(resumo.excessoProjetadoKg)}.
              </span>
            </p>
          ) : (
            <p className="meta-alerta meta-alerta--ok" role="status">
              <Icon name="check" />
              <span>
                No ritmo atual, a projeção permanece dentro da meta mensal.
              </span>
            </p>
          )}
        </>
      ) : (
        <div className="meta-sem-meta">
          <p className="meta-projecao-principal">{resumo.textoProjecao}</p>
          <p className="meta-carbono-aviso">
            Acumulado no mês:{' '}
            <strong>{formatarKgCo2e(dados.acumuladoMes)}</strong>. Nenhuma meta
            mensal definida no momento — administradores podem configurar um
            limite em Administração.
          </p>
        </div>
      )}

      {isDemo && (
        <p className="meta-carbono-rodape">
          Projeção e meta ilustrativas do modo demonstração.
        </p>
      )}
    </section>
  );
}
