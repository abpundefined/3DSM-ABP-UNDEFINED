import { useState } from 'react';
import { useSearchParams } from 'react-router';
import useSimulacao, { type EstadoDaSimulacao } from '../../hooks/useSimulacao';
import usePeriod from '../../hooks/usePeriod';
import { simulacaoDemo } from '../../mocks/simulacao';
import { formatRegionName } from '../../utils/formatters';
import MelhorHorario from './MelhorHorario';

export default function MelhorHorarioDoServico({
  servicoId,
}: {
  servicoId: number;
}) {
  const [searchParams] = useSearchParams();
  const isDemo = searchParams.get('demo') === '1';
  const { apiQuery, linkSearch } = usePeriod();
  const [escolhida, setEscolhida] = useState<string | null | undefined>();
  const idValido = Number.isInteger(servicoId) && servicoId > 0;
  const { estado, recarregar } = useSimulacao(
    servicoId,
    apiQuery,
    !isDemo && idValido,
  );

  const dadosDemo = isDemo ? simulacaoDemo(servicoId) : null;
  const exibido: EstadoDaSimulacao = !idValido
    ? { status: 'erro', mensagem: 'Identificador de serviço inválido.' }
    : isDemo
      ? dadosDemo
        ? { status: 'pronto', dados: dadosDemo }
        : { status: 'erro', mensagem: 'Serviço não encontrado.' }
      : estado;

  if (exibido.status !== 'pronto') {
    return (
      <section className="horarios" aria-labelledby="horarios-servico-titulo">
        <h2 id="horarios-servico-titulo">
          Melhor horário para executar processamentos pesados
        </h2>
        {exibido.status === 'carregando' ? (
          <p className="horarios-subtitulo">Buscando a região do serviço...</p>
        ) : (
          <>
            <p className="horarios-subtitulo">
              Não foi possível descobrir a região do serviço. {exibido.mensagem}
            </p>
            {idValido && !isDemo && (
              <button
                className="button button--primary"
                type="button"
                onClick={recarregar}
              >
                Tentar novamente
              </button>
            )}
          </>
        )}
      </section>
    );
  }

  const { dados } = exibido;

  return (
    <MelhorHorario
      regioes={dados.regioes.map(({ codigo }) => ({
        codigo,
        rotulo: formatRegionName(codigo),
      }))}
      regiao={escolhida === undefined ? dados.servico.regiaoCodigo : escolhida}
      onTrocarRegiao={setEscolhida}
      periodQuery={apiQuery}
      isDemo={isDemo}
      linkMetodologia={`/metodologia${isDemo ? '?demo=1' : linkSearch}`}
    />
  );
}
