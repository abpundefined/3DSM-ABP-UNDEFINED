import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { MetricaRanking, RankingQueryDto } from "./ranking-query.dto";

describe("RankingQueryDto", () => {
  async function validar(value: Record<string, unknown>) {
    return validate(plainToInstance(RankingQueryDto, value));
  }

  it("usa limite padrão 10 quando omitido", async () => {
    const dto = plainToInstance(RankingQueryDto, {});

    expect(dto.limite).toBe(10);
    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it.each(Object.values(MetricaRanking))(
    "aceita a métrica %s",
    async (metrica) => {
      await expect(validar({ metrica })).resolves.toHaveLength(0);
    },
  );

  it("converte limite numérico de query string", async () => {
    const dto = plainToInstance(RankingQueryDto, { limite: "25" });

    expect(dto.limite).toBe(25);
    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it.each([0, 101])("rejeita limite fora de 1 a 100: %i", async (limite) => {
    const errors = await validar({ limite });

    expect(errors.map((error) => error.property)).toContain("limite");
  });

  it("rejeita limite fracionário", async () => {
    const errors = await validar({ limite: 1.5 });

    expect(errors.map((error) => error.property)).toContain("limite");
  });

  it("rejeita uma métrica desconhecida", async () => {
    const errors = await validar({ metrica: "agua" });

    expect(errors.map((error) => error.property)).toContain("metrica");
  });
});
