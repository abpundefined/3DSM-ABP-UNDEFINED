import { useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import FeedbackPanel from '../common/FeedbackPanel';
import Icon from '../common/Icon';
import useSimulacao, { type EstadoDaSimulacao } from '../../hooks/useSimulacao';
import usePeriod from '../../hooks/usePeriod';
import { simulacaoDemo } from '../../mocks/simulacao';
import type { RespostaSimulacao } from '../../types/simulacao';
import {
  formatEmission,
  formatEnergy,
  formatRegionName,
} from '../../utils/formatters';
import { ehModoDemo } from '../../utils/modoDemo';
import {
  descreverDiferenca,
  formatarIntensidade,
  regiaoSugerida,
} from '../../utils/simulacao';
import './simulador.css';

function ConteudoDoSimulador({
  dados,
  linkMetodologia,
}: {
  dados: RespostaSimulacao;
  linkMetodologia: string;
}) {
  const [escolhida, setEscolhida] = useState<string | null>(null);
  const codigoAtual = dados.servico.regiaoCodigo;
  const selecionada =
    dados.regioes.find(
      (regiao) =>
        regiao.codigo === escolhida && regiao.intensidadeGCo2ePorKwh !== null,
    ) ??
    dados.regioes.find((regiao) => regiao.codigo === regiaoSugerida(dados));

  return (
    <>
      <p className="simulador-resumo">
        Energia do serviço no período:{' '}
        <strong>{formatEnergy(dados.energiaKwh)}</strong> · Emissão estimada na
        região atual ({formatRegionName(codigoAtual)}):{' '}
        <strong>{formatEmission(dados.emissaoAtualGCo2e)}</strong>
      </p>
      {dados.energiaKwh === null && (
        <p className="simulador-sem-energia">
          Nenhuma coleta com cálculo concluído no período, então não há energia
          para simular. As intensidades de cada região continuam abaixo.
        </p>
      )}
      <fieldset className="simulador-regioes">
        <legend>Escolha uma região para comparar</legend>
        {dados.regioes.map((regiao) => {
          const semDados = regiao.intensidadeGCo2ePorKwh === null;

          return (
            <label
              key={regiao.codigo}
              className={`simulador-regiao${
                regiao.codigo === selecionada?.codigo
                  ? ' simulador-regiao--selecionada'
                  : ''
              }${semDados ? ' simulador-regiao--sem-dados' : ''}`}
            >
              <input
                type="radio"
                name="simulador-regiao"
                value={regiao.codigo}
                checked={regiao.codigo === selecionada?.codigo}
                disabled={semDados}
                onChange={() => setEscolhida(regiao.codigo)}
              />
              <span className="simulador-regiao-nome">
                {formatRegionName(regiao.codigo)}
              </span>
              <span className="simulador-regiao-intensidade">
                {formatarIntensidade(regiao.intensidadeGCo2ePorKwh)}
              </span>
              {regiao.atual && (
                <span className="simulador-tag">Região atual</span>
              )}
              {regiao.menorEmissao && (
                <span className="simulador-tag simulador-tag--melhor">
                  <Icon name="leaf" />
                  Menor emissão
                </span>
              )}
            </label>
          );
        })}
      </fieldset>
      <div className="simulador-resultado" aria-live="polite">
        {selecionada && dados.energiaKwh !== null && (
          <>
            <p>
              Emissão estimada em {formatRegionName(selecionada.codigo)}:{' '}
              <strong>
                {formatEmission(selecionada.emissaoEstimadaGCo2e)}
              </strong>
            </p>
            <p>{descreverDiferenca(selecionada, codigoAtual)}</p>
          </>
        )}
      </div>
      <p className="simulador-nota">
        <Icon name="info" />
        <span>
          Estimativa: usa a mesma energia do período em todas as regiões e a
          intensidade média de carbono de cada uma no mesmo período. Não
          considera latência, custo nem disponibilidade.{' '}
          <Link to={linkMetodologia}>Como calculamos</Link>
        </span>
      </p>
    </>
  );
}

export default function SimuladorRegiao({ servicoId }: { servicoId: number }) {
  const [searchParams] = useSearchParams();
  const isDemo = ehModoDemo(searchParams);
  const { apiQuery, linkSearch } = usePeriod();
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

  return (
    <section className="simulador" aria-labelledby="simulador-titulo">
      <h2 id="simulador-titulo">E se rodasse em outra região?</h2>
      {exibido.status === 'carregando' && (
        <FeedbackPanel
          kind="loading"
          title="Calculando a simulação"
          description="Buscando a energia do serviço e a intensidade de carbono das regiões."
        />
      )}
      {exibido.status === 'erro' && (
        <FeedbackPanel
          kind="error"
          title="Não foi possível simular as regiões"
          description={exibido.mensagem}
        >
          {idValido && !isDemo && (
            <button
              className="button button--primary"
              type="button"
              onClick={recarregar}
            >
              Tentar novamente
            </button>
          )}
        </FeedbackPanel>
      )}
      {exibido.status === 'pronto' && (
        <ConteudoDoSimulador
          dados={exibido.dados}
          linkMetodologia={`/metodologia${isDemo ? '?demo=1' : linkSearch}`}
        />
      )}
    </section>
  );
}
