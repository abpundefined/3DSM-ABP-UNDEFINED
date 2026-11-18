import { useId } from 'react';
import { Link } from 'react-router';
import useHorarios, { type EstadoDosHorarios } from '../../hooks/useHorarios';
import { horariosDemo } from '../../mocks/horarios';
import { consultaDosHorarios } from '../../services/horarios';
import type { RespostaHorarios } from '../../types/horarios';
import {
  DIAS_NA_SEMANA,
  HORAS_NO_DIA,
  contarSemAmostras,
  criarEscalaDeIntensidade,
  resumoDaMelhorJanela,
} from '../../utils/horarios';
import FeedbackPanel from '../common/FeedbackPanel';
import Icon from '../common/Icon';
import GradeDeHorarios from './GradeDeHorarios';
import TabelaDeHorarios from './TabelaDeHorarios';
import './horarios.css';

export type RegiaoDoHorario = { codigo: string; rotulo: string };

type MelhorHorarioProps = {
  regioes: RegiaoDoHorario[];
  regiao: string | null;
  onTrocarRegiao: (codigo: string | null) => void;
  periodQuery: string;
  isDemo: boolean;
  linkMetodologia: string;
};

function ConteudoDosHorarios({
  dados,
  nomeDaRegiao,
  atualizando,
  linkMetodologia,
}: {
  dados: RespostaHorarios;
  nomeDaRegiao: string | null;
  atualizando: boolean;
  linkMetodologia: string;
}) {
  const escala = criarEscalaDeIntensidade(dados.matriz);

  if (escala === null) {
    return (
      <FeedbackPanel
        kind="empty"
        title="Sem dados de intensidade no período"
        description={`Nenhuma coleta com intensidade de carbono calculada${nomeDaRegiao ? ` em ${nomeDaRegiao}` : ''} neste período. Escolha um período maior ou outra região.`}
      />
    );
  }

  const semAmostras = contarSemAmostras(dados.matriz);
  const resumo = resumoDaMelhorJanela(dados, nomeDaRegiao);

  return (
    <div className="horarios-conteudo" aria-busy={atualizando || undefined}>
      {resumo ? (
        <p className="horarios-resumo">{resumo}</p>
      ) : (
        <p className="horarios-aviso">
          <Icon name="alert" />
          <span>
            Dados insuficientes para indicar a melhor janela: nenhuma sequência
            de 3 horas seguidas tem coletas no período. Escolha um período maior
            ou outra região.
          </span>
        </p>
      )}
      {semAmostras > 0 && (
        <p className="horarios-aviso">
          <Icon name="info" />
          <span>
            {semAmostras} de {DIAS_NA_SEMANA * HORAS_NO_DIA} horários não têm
            coletas no período (hachurados) e ficam fora do cálculo.
          </span>
        </p>
      )}
      <GradeDeHorarios dados={dados} escala={escala} />
      <TabelaDeHorarios dados={dados} />
      <p className="horarios-nota">
        <Icon name="info" />
        <span>
          Horários no fuso {dados.fusoHorario}. Sem escolher uma região, a
          matriz mistura todas as regiões. Concentrar os processamentos que
          podem esperar nas horas de menor intensidade é o padrão de{' '}
          <em>time-shifting</em> da Green Software Foundation.{' '}
          <Link to={linkMetodologia}>Metodologia</Link>
        </span>
      </p>
    </div>
  );
}

export default function MelhorHorario({
  regioes,
  regiao,
  onTrocarRegiao,
  periodQuery,
  isDemo,
  linkMetodologia,
}: MelhorHorarioProps) {
  const tituloId = useId();
  const consulta = consultaDosHorarios(periodQuery, regiao);
  const { estado, recarregar } = useHorarios(consulta, !isDemo);
  const exibido: EstadoDosHorarios = isDemo
    ? {
        status: 'pronto',
        dados: horariosDemo(regiao),
        consulta,
        atualizando: false,
      }
    : estado;
  const regiaoExibida =
    exibido.status === 'pronto'
      ? new URLSearchParams(exibido.consulta).get('regiao')
      : null;
  const nomeDaRegiao =
    regioes.find(({ codigo }) => codigo === regiaoExibida)?.rotulo ?? null;
  const atualizando = exibido.status === 'pronto' && exibido.atualizando;

  return (
    <section className="horarios" aria-labelledby={tituloId}>
      <div className="horarios-cabecalho">
        <div>
          <h2 id={tituloId}>
            Melhor horário para executar processamentos pesados
          </h2>
          <p className="horarios-subtitulo">
            Intensidade média de carbono por dia da semana e hora.
          </p>
        </div>
        {regioes.length > 0 && (
          <label className="horarios-regiao">
            <span>Horários de</span>
            <select
              value={regiao ?? ''}
              onChange={(evento) =>
                onTrocarRegiao(
                  evento.target.value === '' ? null : evento.target.value,
                )
              }
            >
              <option value="">Todas as regiões</option>
              {regioes.map(({ codigo, rotulo }) => (
                <option key={codigo} value={codigo}>
                  {rotulo}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      <p className="horarios-atualizando" aria-live="polite">
        {atualizando ? 'Atualizando os horários...' : ''}
      </p>
      {exibido.status === 'carregando' && (
        <FeedbackPanel
          kind="loading"
          title="Carregando os horários"
          description="Calculando a intensidade média de carbono por hora."
        />
      )}
      {exibido.status === 'erro' && (
        <FeedbackPanel
          kind="error"
          title="Não foi possível carregar os horários"
          description={exibido.mensagem}
        >
          <button
            className="button button--primary"
            type="button"
            onClick={recarregar}
          >
            Tentar novamente
          </button>
        </FeedbackPanel>
      )}
      {exibido.status === 'pronto' && (
        <ConteudoDosHorarios
          dados={exibido.dados}
          nomeDaRegiao={nomeDaRegiao}
          atualizando={atualizando}
          linkMetodologia={linkMetodologia}
        />
      )}
    </section>
  );
}
