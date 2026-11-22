import { useState, type FormEvent } from 'react';
import type { ServicoNoMapa } from '../../types/mapa';
import {
  descreverResultadoSimulacaoMapa,
  formatarDiferencaGramas,
  formatarDiferencaPercentual,
  formatarGramasSimulacao,
  formatarIntensidadeAlvo,
  type RegiaoAlvoMapa,
  type SimulacaoRegiaoMapa,
} from '../../utils/simulacaoMapa';
import './simulacao-mapa.css';

type SimulacaoMapaPainelProps = {
  servicos: readonly ServicoNoMapa[];
  regioesAlvo: readonly RegiaoAlvoMapa[];
  simulacoes: ReadonlyMap<number, SimulacaoRegiaoMapa>;
  ultimoServicoSimuladoId: number | null;
  onSimular: (servicoId: number, regiaoDestinoCodigo: string) => void;
  onDesfazer: (servicoId: number) => void;
  onDesfazerTudo: () => void;
  onFechar: () => void;
};

function escolherRegiaoInicial(
  servico: ServicoNoMapa | undefined,
  regioesAlvo: readonly RegiaoAlvoMapa[],
) {
  if (!servico) {
    return regioesAlvo[0]?.codigo ?? '';
  }

  const outraComIntensidade = regioesAlvo.find(
    (regiao) =>
      regiao.codigo !== servico.regiaoCodigo &&
      regiao.intensidadeGCo2ePorKwh !== null,
  );
  const outraQualquer = regioesAlvo.find(
    (regiao) => regiao.codigo !== servico.regiaoCodigo,
  );

  return (
    outraComIntensidade?.codigo ?? outraQualquer?.codigo ?? servico.regiaoCodigo
  );
}

export default function SimulacaoMapaPainel({
  servicos,
  regioesAlvo,
  simulacoes,
  ultimoServicoSimuladoId,
  onSimular,
  onDesfazer,
  onDesfazerTudo,
  onFechar,
}: SimulacaoMapaPainelProps) {
  const [selecaoManual, setSelecaoManual] = useState<{
    simulacoesRef: ReadonlyMap<number, SimulacaoRegiaoMapa>;
    servicoId: number;
    regiaoCodigo: string;
  } | null>(null);

  const usarSelecaoManual =
    selecaoManual !== null && selecaoManual.simulacoesRef === simulacoes;

  const servicoAtual =
    (usarSelecaoManual
      ? servicos.find(({ servicoId }) => servicoId === selecaoManual.servicoId)
      : ultimoServicoSimuladoId !== null
        ? servicos.find(
            ({ servicoId }) => servicoId === ultimoServicoSimuladoId,
          )
        : undefined) ?? servicos[0];

  const regiaoSelecionadaCodigo = usarSelecaoManual
    ? selecaoManual.regiaoCodigo
    : (simulacoes.get(servicoAtual?.servicoId ?? -1)?.regiaoDestinoCodigo ??
      escolherRegiaoInicial(servicoAtual, regioesAlvo));

  const aoTrocarServico = (novoId: number) => {
    const simulacaoExistente = simulacoes.get(novoId);
    const proximo = servicos.find(({ servicoId }) => servicoId === novoId);
    const proximaRegiao =
      simulacaoExistente?.regiaoDestinoCodigo ??
      escolherRegiaoInicial(proximo, regioesAlvo);
    setSelecaoManual({
      simulacoesRef: simulacoes,
      servicoId: novoId,
      regiaoCodigo: proximaRegiao,
    });
  };

  const aoTrocarRegiao = (novaRegiaoCodigo: string) => {
    if (!servicoAtual) {
      return;
    }
    setSelecaoManual({
      simulacoesRef: simulacoes,
      servicoId: servicoAtual.servicoId,
      regiaoCodigo: novaRegiaoCodigo,
    });
  };

  const aoEnviar = (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    if (!servicoAtual || !regiaoSelecionadaCodigo) {
      return;
    }
    onSimular(servicoAtual.servicoId, regiaoSelecionadaCodigo);
  };

  const listaSimulacoes = [...simulacoes.values()];
  const semOutrasRegioes = regioesAlvo.length < 2;

  return (
    <section className="simulacao-mapa" aria-label="Modo simulação no mapa">
      <div className="simulacao-mapa-topo">
        <div className="simulacao-mapa-aviso">
          <span className="simulacao-mapa-selo">Simulação</span>
          <p className="simulacao-mapa-texto">
            Modo simulação ativo: nenhum dado real é alterado. Arraste um
            marcador no mapa até outra região monitorada ou escolha pela lista
            abaixo.
          </p>
        </div>
        <button
          type="button"
          className="simulacao-mapa-fechar"
          onClick={onFechar}
        >
          Sair da simulação
        </button>
      </div>

      {servicos.length > 0 && !semOutrasRegioes ? (
        <form
          className="simulacao-mapa-controles"
          onSubmit={aoEnviar}
          aria-label="Simular mudança de região por lista"
        >
          <label className="simulacao-mapa-campo" htmlFor="sim-mapa-servico">
            <span>Serviço</span>
            <select
              id="sim-mapa-servico"
              value={servicoAtual?.servicoId ?? ''}
              onChange={(evento) =>
                aoTrocarServico(Number(evento.target.value))
              }
            >
              {servicos.map((servico) => (
                <option key={servico.servicoId} value={servico.servicoId}>
                  {servico.nome} ({servico.local})
                </option>
              ))}
            </select>
          </label>

          <label className="simulacao-mapa-campo" htmlFor="sim-mapa-regiao">
            <span>Mover para região</span>
            <select
              id="sim-mapa-regiao"
              value={regiaoSelecionadaCodigo}
              onChange={(evento) => aoTrocarRegiao(evento.target.value)}
            >
              {regioesAlvo.map((regiao) => {
                const ehOriginal = servicoAtual?.regiaoCodigo === regiao.codigo;
                return (
                  <option key={regiao.codigo} value={regiao.codigo}>
                    {regiao.local} —{' '}
                    {formatarIntensidadeAlvo(regiao.intensidadeGCo2ePorKwh)}
                    {ehOriginal ? ' (atual)' : ''}
                  </option>
                );
              })}
            </select>
          </label>

          <button type="submit" className="simulacao-mapa-aplicar">
            Simular mudança
          </button>
        </form>
      ) : (
        <p className="simulacao-mapa-vazio">
          É necessário ter pelo menos duas regiões monitoradas no mapa para
          simular uma mudança de região.
        </p>
      )}

      <div
        className="simulacao-mapa-resultados"
        role="status"
        aria-live="polite"
      >
        {listaSimulacoes.length === 0 ? (
          <p className="simulacao-mapa-dica">
            Nenhuma mudança simulada ainda. Os cálculos usam a energia do
            serviço multiplicada pela intensidade de carbono da região de
            destino.
          </p>
        ) : (
          <>
            <div className="simulacao-mapa-resultados-cabecalho">
              <strong className="simulacao-mapa-resultados-titulo">
                {listaSimulacoes.length === 1
                  ? 'Resultado da simulação'
                  : `${listaSimulacoes.length} serviços em simulação`}
              </strong>
              {listaSimulacoes.length > 1 && (
                <button
                  type="button"
                  className="simulacao-mapa-desfazer"
                  onClick={onDesfazerTudo}
                >
                  Desfazer tudo
                </button>
              )}
            </div>
            <ul className="simulacao-mapa-lista">
              {listaSimulacoes.map((simulacao) => {
                const diffGramas = formatarDiferencaGramas(
                  simulacao.diferencaGCo2e,
                );
                const diffPct = formatarDiferencaPercentual(
                  simulacao.diferencaPercentual,
                );
                const variacaoClasse =
                  simulacao.diferencaGCo2e === null
                    ? 'neutro'
                    : simulacao.diferencaGCo2e < 0
                      ? 'reducao'
                      : simulacao.diferencaGCo2e > 0
                        ? 'aumento'
                        : 'neutro';

                return (
                  <li key={simulacao.servicoId} className="simulacao-mapa-item">
                    <div className="simulacao-mapa-item-info">
                      <div className="simulacao-mapa-item-linha">
                        <strong>{simulacao.servicoNome}</strong>
                        <span className="simulacao-mapa-rota">
                          {simulacao.regiaoOrigemLocal} →{' '}
                          {simulacao.regiaoDestinoLocal}
                        </span>
                      </div>

                      {simulacao.emissaoSimuladaGCo2e !== null && (
                        <div className="simulacao-mapa-metricas">
                          <span className="simulacao-mapa-comparacao">
                            {formatarGramasSimulacao(
                              simulacao.emissaoAtualGCo2e,
                            )}{' '}
                            →{' '}
                            <strong>
                              {formatarGramasSimulacao(
                                simulacao.emissaoSimuladaGCo2e,
                              )}
                            </strong>
                          </span>
                          {diffGramas && (
                            <span
                              className={`simulacao-mapa-delta simulacao-mapa-delta--${variacaoClasse}`}
                            >
                              {diffGramas}
                              {diffPct ? ` (${diffPct})` : ''}
                            </span>
                          )}
                        </div>
                      )}

                      <p className="simulacao-mapa-descricao">
                        {descreverResultadoSimulacaoMapa(simulacao)}
                      </p>
                    </div>

                    <button
                      type="button"
                      className="simulacao-mapa-desfazer"
                      onClick={() => onDesfazer(simulacao.servicoId)}
                      aria-label={
                        listaSimulacoes.length === 1
                          ? 'Desfazer'
                          : `Desfazer simulação de ${simulacao.servicoNome}`
                      }
                    >
                      Desfazer
                    </button>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>
    </section>
  );
}
