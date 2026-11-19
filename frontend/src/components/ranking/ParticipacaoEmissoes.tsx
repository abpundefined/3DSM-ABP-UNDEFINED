import { useId } from 'react';
import useMapa, { type EstadoDoMapa } from '../../hooks/useMapa';
import usePeriod from '../../hooks/usePeriod';
import { mapaDemo } from '../../mocks/mapa';
import {
  fraseDaRegiao,
  fraseDePareto,
  montarParticipacao,
} from '../../utils/participacao';
import LegendaParticipacao from './LegendaParticipacao';
import TabelaParticipacao from './TabelaParticipacao';
import TreemapParticipacao from './TreemapParticipacao';

export default function ParticipacaoEmissoes({ isDemo }: { isDemo: boolean }) {
  const tituloId = useId();
  const { apiQuery } = usePeriod();
  const { estado, recarregar } = useMapa(apiQuery, !isDemo);

  const exibido: EstadoDoMapa = isDemo
    ? { status: 'pronto', dados: mapaDemo }
    : estado;
  const participacao =
    exibido.status === 'pronto' ? montarParticipacao(exibido.dados) : null;

  return (
    <section className="ranking-bloco" aria-labelledby={tituloId}>
      <h2 id={tituloId}>Participação nas emissões</h2>
      {exibido.status === 'carregando' && (
        <p className="ranking-resumo" role="status">
          Carregando a participação por região...
        </p>
      )}
      {exibido.status === 'erro' && (
        <div className="treemap-erro" role="alert">
          <p>
            Não foi possível carregar a participação por região.{' '}
            {exibido.mensagem}
          </p>
          <button
            className="button button--primary"
            type="button"
            onClick={recarregar}
          >
            Tentar novamente
          </button>
        </div>
      )}
      {participacao?.regioes.length === 0 && (
        <p className="ranking-resumo">Nenhuma emissão registrada no período.</p>
      )}
      {participacao && participacao.regioes.length > 0 && (
        <>
          <p className="ranking-resumo">
            {fraseDePareto(participacao)} {fraseDaRegiao(participacao)}
          </p>
          <TreemapParticipacao participacao={participacao} />
          <LegendaParticipacao participacao={participacao} />
          <TabelaParticipacao participacao={participacao} />
        </>
      )}
    </section>
  );
}
