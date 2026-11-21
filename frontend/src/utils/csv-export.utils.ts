type CsvRow = Record<string, unknown>;

const cabecalhosPersonalizados: Record<string, string> = {
  energiaKwh: 'energia_kwh',
  emissaoGCo2e: 'emissao_gco2e',
};

export function dateForCsv(isoDate: string): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(isoDate));
  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  const day = parts.find((part) => part.type === 'day')?.value;

  if (!year || !month || !day) {
    throw new Error('Não foi possível determinar a data do histórico.');
  }

  return `${year}-${month}-${day}`;
}

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
  const periodo = `Período: ${startDate} a ${endDate}`;
  const csv = [periodo, cabecalho, ...linhas].join('\r\n');

  const blob = new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${baseName}-${startDate}_a_${endDate}.csv`;
  link.style.display = 'none';
  link.click();
  URL.revokeObjectURL(url);

  return csv;
}
