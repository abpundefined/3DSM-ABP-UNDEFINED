import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { SerieTemporalQueryDto } from "./serie-temporal-query.dto";

describe("SerieTemporalQueryDto", () => {
  async function validar(value: Record<string, unknown>) {
    return validate(plainToInstance(SerieTemporalQueryDto, value));
  }

  it.each([
    ["true", true],
    ["false", false],
  ])("converte porServico=%s para %s", async (entrada, esperado) => {
    const query = plainToInstance(SerieTemporalQueryDto, {
      porServico: entrada,
    });

    expect(query.porServico).toBe(esperado);
    await expect(validate(query)).resolves.toHaveLength(0);
  });

  it("permite omitir granularidade e porServico", async () => {
    await expect(validar({})).resolves.toHaveLength(0);
  });

  it("rejeita granularidade e valores booleanos inválidos", async () => {
    const errors = await validar({
      granularidade: "semana",
      porServico: "sim",
    });

    expect(errors.map((error) => error.property)).toEqual(
      expect.arrayContaining(["granularidade", "porServico"]),
    );
  });
});
