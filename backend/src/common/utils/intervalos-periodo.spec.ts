import {
  escolherGranularidade,
  gerarIntervalos,
  inicioDoIntervalo,
  parametrosDeTruncamento,
} from "./intervalos-periodo";

const iso = (datas: Date[]) => datas.map((data) => data.toISOString());

describe("intervalos do período", () => {
  describe("escolherGranularidade", () => {
    const inicio = new Date("2026-11-10T00:00:00.000Z");

    it("usa hora para períodos de até 48 horas, inclusive", () => {
      expect(
        escolherGranularidade(inicio, new Date("2026-11-11T00:00:00.000Z")),
      ).toBe("hora");
      expect(
        escolherGranularidade(inicio, new Date("2026-11-12T00:00:00.000Z")),
      ).toBe("hora");
    });

    it("usa dia acima de 48 horas", () => {
      expect(
        escolherGranularidade(inicio, new Date("2026-11-12T00:00:00.001Z")),
      ).toBe("dia");
    });
  });

  describe("parametrosDeTruncamento", () => {
    it("trunca horas em UTC e dias no fuso de São Paulo", () => {
      expect(parametrosDeTruncamento("hora")).toEqual({
        unidade: "hour",
        fuso: "UTC",
      });
      expect(parametrosDeTruncamento("dia")).toEqual({
        unidade: "day",
        fuso: "America/Sao_Paulo",
      });
    });
  });

  describe("inicioDoIntervalo", () => {
    it("arredonda para o início da hora", () => {
      expect(
        inicioDoIntervalo(new Date("2026-11-10T14:37:21.500Z"), "hora"),
      ).toEqual(new Date("2026-11-10T14:00:00.000Z"));
    });

    it("usa a meia-noite de São Paulo para o dia", () => {
      expect(
        inicioDoIntervalo(new Date("2026-11-10T14:37:00.000Z"), "dia"),
      ).toEqual(new Date("2026-11-10T03:00:00.000Z"));
    });

    it("usa o primeiro instante do dia quando a meia-noite local não existe", () => {
      expect(
        inicioDoIntervalo(new Date("2018-11-04T15:00:00.000Z"), "dia"),
      ).toEqual(new Date("2018-11-04T03:00:00.000Z"));
    });

    it("considera o dia local quando em UTC já é o dia seguinte", () => {
      expect(
        inicioDoIntervalo(new Date("2026-11-11T02:30:00.000Z"), "dia"),
      ).toEqual(new Date("2026-11-10T03:00:00.000Z"));
    });
  });

  describe("gerarIntervalos", () => {
    it("gera um intervalo por hora cobrindo início e fim inclusivos", () => {
      const intervalos = gerarIntervalos(
        new Date("2026-11-10T12:15:00.000Z"),
        new Date("2026-11-10T15:00:00.000Z"),
        "hora",
      );

      expect(iso(intervalos)).toEqual([
        "2026-11-10T12:00:00.000Z",
        "2026-11-10T13:00:00.000Z",
        "2026-11-10T14:00:00.000Z",
        "2026-11-10T15:00:00.000Z",
      ]);
    });

    it("gera 24 ou 25 intervalos para as últimas 24 horas", () => {
      const fim = new Date("2026-11-12T21:30:00.000Z");
      const inicio = new Date(fim.getTime() - 24 * 60 * 60 * 1000);
      const naHoraCheia = new Date("2026-11-12T21:00:00.000Z");

      expect(gerarIntervalos(inicio, fim, "hora")).toHaveLength(25);
      expect(
        gerarIntervalos(
          new Date(naHoraCheia.getTime() - 24 * 60 * 60 * 1000),
          new Date(naHoraCheia.getTime() - 1),
          "hora",
        ),
      ).toHaveLength(24);
    });

    it("gera dias de calendário no fuso de São Paulo", () => {
      const intervalos = gerarIntervalos(
        new Date("2026-10-01T03:00:00.000Z"),
        new Date("2026-11-01T02:59:59.999Z"),
        "dia",
      );

      expect(intervalos).toHaveLength(31);
      expect(intervalos[0]).toEqual(new Date("2026-10-01T03:00:00.000Z"));
      expect(intervalos[intervalos.length - 1]).toEqual(
        new Date("2026-10-31T03:00:00.000Z"),
      );
    });

    it("mantém a meia-noite local em dias com mudança de horário de verão", () => {
      const intervalos = gerarIntervalos(
        new Date("2018-11-03T03:00:00.000Z"),
        new Date("2018-11-05T12:00:00.000Z"),
        "dia",
      );

      expect(iso(intervalos)).toEqual([
        "2018-11-03T03:00:00.000Z",
        "2018-11-04T03:00:00.000Z",
        "2018-11-05T02:00:00.000Z",
      ]);
    });

    it("cobre o limite de 90 dias com 91 intervalos diários", () => {
      const inicio = new Date("2026-08-14T15:00:00.000Z");
      const fim = new Date(inicio.getTime() + 90 * 24 * 60 * 60 * 1000);

      expect(gerarIntervalos(inicio, fim, "dia")).toHaveLength(91);
    });
  });
});
