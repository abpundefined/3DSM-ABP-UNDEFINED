import { useEffect } from 'react';
import { useSearchParams } from 'react-router';
import useAuth from '../../hooks/useAuth';
import useSaude from '../../hooks/useSaude';
import { saudeDemo } from '../../mocks/saude';
import type { EstadoIntegracao, IntegracaoSaude } from '../../types/saude';
import {
  DESCRICAO_DO_ESTADO,
  ESTADOS_DE_SERVICO,
  ROTULOS_DE_SERVICO,
  descreverColetas,
  descreverHorario,
  formatarTempoDeResposta,
} from '../../utils/saude';
import Icon, { type IconName } from '../common/Icon';
import './saude.css';

const ICONE_DO_ESTADO: Record<EstadoIntegracao, IconName> = {
  OPERACIONAL: 'check',
  FALHA: 'alert',
  SEM_CONSULTA: 'clock',
};

function Horario({
  instante,
  referencia,
}: {
  instante: string | null;
  referencia: string;
}) {
  const texto = descreverHorario(instante, referencia);

  return instante === null ? (
    texto
  ) : (
    <time
      dateTime={instante}
      title={new Date(instante).toLocaleString('pt-BR')}
    >
      {texto}
    </time>
  );
}

function CartaoDaIntegracao({
  nome,
  integracao,
  referencia,
}: {
  nome: string;
  integracao: IntegracaoSaude;
  referencia: string;
}) {
  const { estado, mensagemErro } = integracao;

  return (
    <article className="saude-card">
      <div className="saude-card-header">
        <h3>{nome}</h3>
        <span className={`saude-badge saude-badge--${estado.toLowerCase()}`}>
          <Icon name={ICONE_DO_ESTADO[estado]} />
          {DESCRICAO_DO_ESTADO[estado]}
        </span>
      </div>
      <dl className="saude-lista">
        <div>
          <dt>Última consulta</dt>
          <dd>
            <Horario
              instante={integracao.ultimaConsultaEm}
              referencia={referencia}
            />
          </dd>
        </div>
        <div>
          <dt>Tempo de resposta</dt>
          <dd>{formatarTempoDeResposta(integracao.tempoRespostaMs)}</dd>
        </div>
        <div>
          <dt>Último sucesso</dt>
          <dd>
            <Horario
              instante={integracao.ultimoSucessoEm}
              referencia={referencia}
            />
          </dd>
        </div>
      </dl>
      {mensagemErro && <p className="saude-erro">{mensagemErro}</p>}
    </article>
  );
}

export default function SaudeIntegracoes() {
  const [searchParams] = useSearchParams();
  const isDemo = searchParams.get('demo') === '1';
  const { token, expireSession } = useAuth();
  const { estado, recarregar } = useSaude(token, !isDemo);
  const naoAutorizado = estado.status === 'erro' && estado.naoAutorizado;

  useEffect(() => {
    if (naoAutorizado) {
      expireSession(
        'Sua sessão expirou. Entre novamente para ver a saúde das integrações.',
      );
    }
  }, [naoAutorizado, expireSession]);

  const exibido = isDemo
    ? ({ status: 'pronto', dados: saudeDemo } as const)
    : estado;

  return (
    <section className="saude" aria-labelledby="saude-titulo">
      <div className="saude-cabecalho">
        <div>
          <h2 id="saude-titulo">Saúde das integrações</h2>
          <p className="saude-meta">
            {isDemo
              ? 'Modo demonstração · dados fictícios.'
              : 'Última consulta de cada integração desde que o backend iniciou. Atualiza a cada 30 segundos.'}
          </p>
        </div>
        {!isDemo && (
          <button
            className="button button--primary"
            type="button"
            onClick={recarregar}
            disabled={exibido.status === 'carregando'}
          >
            Atualizar agora
          </button>
        )}
      </div>

      {exibido.status === 'carregando' && (
        <p className="saude-aviso" aria-live="polite">
          Carregando a saúde das integrações...
        </p>
      )}

      {exibido.status === 'erro' && !exibido.naoAutorizado && (
        <div className="saude-aviso saude-aviso--erro">
          <p aria-live="polite">{exibido.mensagem}</p>
          <button
            className="button button--primary"
            type="button"
            onClick={recarregar}
          >
            Tentar novamente
          </button>
        </div>
      )}

      {exibido.status === 'pronto' && (
        <>
          <div className="saude-cartoes">
            <CartaoDaIntegracao
              nome="Agregador de métricas"
              integracao={exibido.dados.agregador}
              referencia={exibido.dados.geradoEm}
            />
            <CartaoDaIntegracao
              nome="API de carbono"
              integracao={exibido.dados.apiCarbono}
              referencia={exibido.dados.geradoEm}
            />
          </div>

          <dl className="saude-resumo">
            <div>
              <dt>Última descoberta de serviços</dt>
              <dd>
                <Horario
                  instante={exibido.dados.ultimaDescobertaEm}
                  referencia={exibido.dados.geradoEm}
                />
              </dd>
            </div>
            <div>
              <dt>Coletas</dt>
              <dd>{descreverColetas(exibido.dados.coletasUltimaHora)}</dd>
            </div>
          </dl>

          <h3 className="saude-subtitulo">Serviços por estado</h3>
          <ul className="saude-estados">
            {ESTADOS_DE_SERVICO.map((estadoDoServico) => (
              <li key={estadoDoServico}>
                <span>{ROTULOS_DE_SERVICO[estadoDoServico]}</span>
                <strong>
                  {exibido.dados.servicosPorEstado[estadoDoServico]}
                </strong>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
