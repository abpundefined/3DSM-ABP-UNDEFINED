import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { HistoricoServicoQueryDto } from "./historico-servico-query.dto";

describe("HistoricoServicoQueryDto", () => {
  async function validar(value: Record<string, unknown>) {
    return validate(plainToInstance(HistoricoServicoQueryDto, value));
  }

  it.each(["hora", "dia"])("aceita granularidade %s", async (granularidade) => {
    await expect(validar({ granularidade })).resolves.toHaveLength(0);
  });

  it("permite granularidade omitida", async () => {
    await expect(validar({})).resolves.toHaveLength(0);
  });

  it("rejeita granularidade não suportada", async () => {
    const errors = await validar({ granularidade: "semana" });

    expect(errors.map((error) => error.property)).toContain("granularidade");
  });
});
