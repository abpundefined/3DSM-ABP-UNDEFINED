import { formatInTimeZone } from "date-fns-tz";
import {
  converterPeriodo,
  IntervaloIndicadores,
} from "./date-conversion.helper";
import { PeriodoDto, PeriodoPredefinido } from "./dto/periodo.dto";

describe("converterPeriodo", () => {
  const agora = new Date("2026-03-15T12:34:56.789Z");

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(agora);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  function converter(dto: PeriodoDto): IntervaloIndicadores {
    return converterPeriodo(dto);
  }

  it.each([
    [PeriodoPredefinido.ULTIMAS_24_HORAS, "2026-03-14T12:34:56.789Z"],
    [PeriodoPredefinido.ULTIMOS_7_DIAS, "2026-03-08T12:34:56.789Z"],
    [PeriodoPredefinido.ULTIMOS_30_DIAS, "2026-02-13T12:34:56.789Z"],
  ])("calcula o período %s como duração exata", (periodo, inicio) => {
    expect(converter({ periodo }).inicio).toEqual(new Date(inicio));
    expect(converter({ periodo }).fim).toEqual(agora);
  });

  it("usa as últimas 24 horas quando não há parâmetros", () => {
    expect(converter({})).toEqual({
      inicio: new Date("2026-03-14T12:34:56.789Z"),
      fim: agora,
    });
  });

  it("calcula o mês atual à meia-noite de São Paulo", () => {
    expect(converter({ periodo: PeriodoPredefinido.MES_ATUAL })).toEqual({
      inicio: new Date("2026-03-01T03:00:00.000Z"),
      fim: agora,
    });
  });

  it("calcula o mês anterior com limites locais em São Paulo", () => {
    expect(converter({ periodo: PeriodoPredefinido.MES_ANTERIOR })).toEqual({
      inicio: new Date("2026-02-01T03:00:00.000Z"),
      fim: new Date("2026-03-01T02:59:59.999Z"),
    });
  });

  it("trata a virada de ano ao calcular o mês anterior", () => {
    jest.setSystemTime(new Date("2026-01-15T12:00:00.000Z"));

    expect(converter({ periodo: PeriodoPredefinido.MES_ANTERIOR })).toEqual({
      inicio: new Date("2025-12-01T03:00:00.000Z"),
      fim: new Date("2026-01-01T02:59:59.999Z"),
    });
  });

  it("inclui o dia 29 de fevereiro no mês anterior de um ano bissexto", () => {
    jest.setSystemTime(new Date("2024-03-15T12:00:00.000Z"));

    const intervalo = converter({
      periodo: PeriodoPredefinido.MES_ANTERIOR,
    });

    expect(intervalo.inicio).toEqual(new Date("2024-02-01T03:00:00.000Z"));
    expect(
      formatInTimeZone(
        intervalo.fim,
        "America/Sao_Paulo",
        "yyyy-MM-dd'T'HH:mm:ss.SSS",
      ),
    ).toBe("2024-02-29T23:59:59.999");
  });

  it("determina o mês atual pelo fuso de São Paulo, não pelo UTC", () => {
    jest.setSystemTime(new Date("2026-03-01T01:00:00.000Z"));

    expect(converter({ periodo: PeriodoPredefinido.MES_ATUAL })).toEqual({
      inicio: new Date("2026-02-01T03:00:00.000Z"),
      fim: new Date("2026-03-01T01:00:00.000Z"),
    });
  });

  it("converte um intervalo customizado para instantes absolutos", () => {
    expect(
      converter({
        inicio: "2026-01-01T00:00:00-03:00",
        fim: "2026-01-02T04:00:00Z",
      }),
    ).toEqual({
      inicio: new Date("2026-01-01T03:00:00.000Z"),
      fim: new Date("2026-01-02T04:00:00.000Z"),
    });
  });

  it("rejeita intervalo customizado incompleto", () => {
    expect(() => converter({ inicio: "2026-01-01T00:00:00Z" })).toThrow(
      "Informe inicio e fim",
    );
  });

  it("rejeita data customizada inválida", () => {
    expect(() =>
      converter({
        inicio: "não-é-data",
        fim: "2026-01-02T00:00:00Z",
      }),
    ).toThrow("Inicio e fim devem ser datas válidas");
  });
});
