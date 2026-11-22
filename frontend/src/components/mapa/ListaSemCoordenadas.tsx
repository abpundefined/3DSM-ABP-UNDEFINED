import { Link } from 'react-router';
import usePeriod from '../../hooks/usePeriod';
import type { ServicoSemCoordenadas } from '../../types/mapa';
import { ordenarPorEmissao, rotuloEstado } from '../../utils/mapaDados';
import { formatarEmissao } from '../../utils/mapaEscala';

type ListaSemCoordenadasProps = {
  servicos: ServicoSemCoordenadas[];
  referenciaEmissao: number;
};

export default function ListaSemCoordenadas({
  servicos,
  referenciaEmissao,
}: ListaSemCoordenadasProps) {
  const { linkSearch } = usePeriod();

  return (
    <section
      className="mapa-lateral"
      aria-labelledby="mapa-sem-coordenadas-titulo"
    >
      <h2 id="mapa-sem-coordenadas-titulo" className="mapa-lateral-titulo">
        Sem coordenadas ({servicos.length})
      </h2>
      {servicos.length === 0 ? (
        <p className="mapa-lateral-nota">Todos os serviços estão no mapa.</p>
      ) : (
        <>
          <p className="mapa-lateral-nota">
            A região destes serviços não tem latitude e longitude cadastradas.
          </p>
          <ul className="mapa-sem-coordenadas">
            {ordenarPorEmissao(servicos).map((servico) => (
              <li key={servico.servicoId}>
                <Link to={`/servicos/${servico.servicoId}${linkSearch}`}>
                  {servico.nome}
                </Link>
                <span>
                  {rotuloEstado(servico.estado)} ·{' '}
                  {servico.totais.emissaoGCo2e === null
                    ? 'Sem dados'
                    : formatarEmissao(
                        servico.totais.emissaoGCo2e,
                        referenciaEmissao,
                      )}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
