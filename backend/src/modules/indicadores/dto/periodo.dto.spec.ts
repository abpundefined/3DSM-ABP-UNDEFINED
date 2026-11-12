import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { PeriodoDto, PeriodoPredefinido } from "./periodo.dto";

describe("PeriodoDto", () => {
  async function validar(value: Record<string, unknown>) {
    return validate(plainToInstance(PeriodoDto, value));
  }

  it("aceita a ausência de parâmetros", async () => {
    await expect(validar({})).resolves.toHaveLength(0);
  });

  it.each(Object.values(PeriodoPredefinido))(
    "aceita o período predefinido %s",
    async (periodo) => {
      await expect(validar({ periodo })).resolves.toHaveLength(0);
    },
  );

  it("rejeita um período predefinido desconhecido", async () => {
    const errors = await validar({ periodo: "365d" });

    expect(errors.map((error) => error.property)).toContain("periodo");
  });

  it.each([
    { periodo: "24h", inicio: "2026-01-01T00:00:00Z" },
    { periodo: "24h", fim: "2026-01-02T00:00:00Z" },
    {
      periodo: "24h",
      inicio: "2026-01-01T00:00:00Z",
      fim: "2026-01-02T00:00:00Z",
    },
  ])("rejeita periodo combinado com datas: %o", async (value) => {
    expect((await validar(value)).map((error) => error.property)).toContain(
      "fim",
    );
  });

  it.each([
    { inicio: "2026-01-01T00:00:00Z" },
    { fim: "2026-01-02T00:00:00Z" },
  ])("rejeita intervalo incompleto: %o", async (value) => {
    expect((await validar(value)).map((error) => error.property)).toContain(
      "fim",
    );
  });

  it.each([
    {
      inicio: "2026-02-30T00:00:00Z",
      fim: "2026-03-01T00:00:00Z",
    },
    {
      inicio: "2026-01-01T00:00:00",
      fim: "2026-01-02T00:00:00Z",
    },
    {
      inicio: "2026-01-01T00:00:00Z",
      fim: "2026-01-02T00:00:00+25:00",
    },
  ])("rejeita datas ISO inválidas ou sem timezone: %o", async (value) => {
    expect((await validar(value)).map((error) => error.property)).toContain(
      "fim",
    );
  });

  it("rejeita um inicio inválido", async () => {
    const errors = await validar({
      inicio: "não-é-data",
      fim: "2026-01-02T00:00:00Z",
    });

    expect(errors.map((error) => error.property)).toEqual(
      expect.arrayContaining(["inicio", "fim"]),
    );
  });

  it.each([
    ["2026-01-02T00:00:00Z", "2026-01-02T00:00:00Z"],
    ["2026-01-03T00:00:00Z", "2026-01-02T00:00:00Z"],
    ["2026-01-02T00:00:00-03:00", "2026-01-02T03:00:00Z"],
  ])("rejeita inicio >= fim (%s, %s)", async (inicio, fim) => {
    expect(
      (await validar({ inicio, fim })).map((error) => error.property),
    ).toContain("fim");
  });

  it("aceita datas com offsets diferentes comparando os instantes", async () => {
    await expect(
      validar({
        inicio: "2026-01-02T00:00:00-03:00",
        fim: "2026-01-02T04:00:00Z",
      }),
    ).resolves.toHaveLength(0);
  });

  it("aceita um intervalo de exatamente 90 dias", async () => {
    await expect(
      validar({
        inicio: "2026-01-01T00:00:00Z",
        fim: "2026-04-01T00:00:00Z",
      }),
    ).resolves.toHaveLength(0);
  });

  it("rejeita um intervalo superior a 90 dias por um milissegundo", async () => {
    const errors = await validar({
      inicio: "2026-01-01T00:00:00.000Z",
      fim: "2026-04-01T00:00:00.001Z",
    });

    expect(errors.map((error) => error.property)).toContain("fim");
  });
});
