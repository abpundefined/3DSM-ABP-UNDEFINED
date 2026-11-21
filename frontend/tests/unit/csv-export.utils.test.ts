import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { exportDataToCsv } from '../../src/utils/csv-export.utils';

const createObjectURLMock = vi.fn(() => 'blob:csv-export');
const revokeObjectURLMock = vi.fn();

class MockURL extends URL {
  static override createObjectURL = createObjectURLMock;
  static override revokeObjectURL = revokeObjectURLMock;
}

describe('exportDataToCsv', () => {
  let anchor: HTMLAnchorElement;
  let originalCreateElement: typeof document.createElement;

  beforeEach(() => {
    createObjectURLMock.mockReset().mockReturnValue('blob:csv-export');
    revokeObjectURLMock.mockReset();
    vi.stubGlobal('URL', MockURL);

    originalCreateElement = document.createElement.bind(document);
    anchor = originalCreateElement('a');
    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) =>
      tagName.toLowerCase() === 'a' ? anchor : originalCreateElement(tagName),
    );
    vi.spyOn(anchor, 'click').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('gera CSV separado por ponto e vírgula, com cabeçalho em unidades e decimais com vírgula', () => {
    const csv = exportDataToCsv(
      [
        {
          inicio: '2026-11-01T00:00:00.000Z',
          energiaKwh: 1.5,
          emissaoGCo2e: 12.34,
        },
      ],
      'servicos',
      '2026-11-01',
      '2026-11-07',
    );

    const linhas = csv.split(/\r?\n/);
    expect(linhas[0]).toBe('Período: 2026-11-01 a 2026-11-07');
    expect(linhas[1]).toBe('inicio;energia_kwh;emissao_gco2e');
    expect(csv.replaceAll('"', '')).toContain(
      '2026-11-01T00:00:00.000Z;1,5;12,34',
    );
  });

  it('retorna o CSV e baixa o arquivo com o período no nome', () => {
    const csv = exportDataToCsv(
      [
        {
          inicio: '2026-11-01T00:00:00.000Z',
          energiaKwh: 1.5,
          emissaoGCo2e: 12.34,
        },
      ],
      'relatorio-servicos',
      '2026-11-01',
      '2026-11-07',
    );

    expect(csv.split(/\r?\n/)[0]).toBe('Período: 2026-11-01 a 2026-11-07');
    expect(csv.split(/\r?\n/)[1]).toBe('inicio;energia_kwh;emissao_gco2e');
    expect(anchor.download).toBe(
      'relatorio-servicos-2026-11-01_a_2026-11-07.csv',
    );
    expect(anchor.href).toBe('blob:csv-export');
    expect(anchor.click).toHaveBeenCalledOnce();
    expect(createObjectURLMock).toHaveBeenCalledWith(expect.any(Blob));
    expect(revokeObjectURLMock).toHaveBeenCalledWith('blob:csv-export');
  });
});
