import { formatarEquivalenciasCo2e } from '../../utils/equivalencias';

export default function EmissionEquivalences({
  emissaoGCo2e,
}: {
  emissaoGCo2e: number | null | undefined;
}) {
  const equivalencias = formatarEquivalenciasCo2e(emissaoGCo2e);
  if (!equivalencias) {
    return null;
  }

  return (
    <ul
      className="emission-equivalences"
      aria-label="Equivalências aproximadas de CO₂e"
    >
      <li>{equivalencias.carro}</li>
      <li>{equivalencias.celular}</li>
    </ul>
  );
}
