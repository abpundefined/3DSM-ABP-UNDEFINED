type CsvRow = Record<string, unknown>;

const cabecalhosPersonalizados: Record<string, string> = {
  energiaKwh: 'energia_kwh',
  emissaoGCo2e: 'emissao_gco2e',
};

function converterCabecalho(chave: string): string {
  return (
    cabecalhosPersonalizados[chave] ??
    chave.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase()
  );
}

function formatarValor(valor: unknown): string {
  if (valor === null || valor === undefined) {
    return '';
  }

  const texto =
    typeof valor === 'number' ? String(valor).replace('.', ',') : String(valor);

  return /[;"\r\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
}

export function exportDataToCsv<T extends CsvRow>(
  data: T[],
  baseName: string,
  startDate: string,
  endDate: string,
): string {
  const chaves = data.length > 0 ? Object.keys(data[0]) : [];
  const cabecalho = chaves.map(converterCabecalho).join(';');
  const linhas = data.map((item) =>
    chaves.map((chave) => formatarValor(item[chave])).join(';'),
  );
  const csv = [cabecalho, ...linhas].join('\r\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${baseName}-${startDate}_a_${endDate}.csv`;
  link.style.display = 'none';
  link.click();

  return csv;
}
