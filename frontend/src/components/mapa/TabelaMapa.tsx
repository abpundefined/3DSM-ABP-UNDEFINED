import { Link } from 'react-router';
import usePeriod from '../../hooks/usePeriod';
import type { ServicoNoMapa, ServicoSemCoordenadas } from '../../types/mapa';
import {
  formatarEnergia,
  ordenarPorEmissao,
  rotuloEstado,
} from '../../utils/mapaDados';
import { formatarEmissao } from '../../utils/mapaEscala';

type TabelaMapaProps = {
  servicos: ServicoNoMapa[];
  semCoordenadas: ServicoSemCoordenadas[];
  referenciaEmissao: number;
};

export default function TabelaMapa({
  servicos,
  semCoordenadas,
  referenciaEmissao,
}: TabelaMapaProps) {
  const { linkSearch } = usePeriod();
  const linhas = ordenarPorEmissao([
    ...servicos,
    ...semCoordenadas.map((servico) => ({
      ...servico,
      local: 'Sem coordenadas',
    })),
  ]);

  return (
    <details className="mapa-tabela">
      <summary>Ver os dados do mapa em tabela</summary>
      <div
        className="mapa-tabela-rolagem"
        role="region"
        aria-label="Tabela dos serviços do mapa"
        tabIndex={0}
      >
        <table>
          <caption>
            Serviços, localização e impacto ambiental no período, do maior para
            o menor emissor
          </caption>
          <thead>
            <tr>
              <th scope="col">Serviço</th>
              <th scope="col">Local</th>
              <th scope="col">Estado</th>
              <th scope="col">Energia</th>
              <th scope="col">Emissão</th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((servico) => (
              <tr key={servico.servicoId}>
                <th scope="row">
                  <Link to={`/servicos/${servico.servicoId}${linkSearch}`}>
                    {servico.nome}
                  </Link>
                </th>
                <td>{servico.local}</td>
                <td>{rotuloEstado(servico.estado)}</td>
                <td>{formatarEnergia(servico.totais.energiaKwh)}</td>
                <td>
                  {servico.totais.emissaoGCo2e === null
                    ? 'Sem dados'
                    : formatarEmissao(
                        servico.totais.emissaoGCo2e,
                        referenciaEmissao,
                      )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
