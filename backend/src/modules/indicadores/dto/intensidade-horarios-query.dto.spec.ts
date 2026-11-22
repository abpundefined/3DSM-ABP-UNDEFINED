import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { IntensidadeHorariosQueryDto } from "./intensidade-horarios-query.dto";

describe("IntensidadeHorariosQueryDto", () => {
  async function validar(value: Record<string, unknown>) {
    return validate(plainToInstance(IntensidadeHorariosQueryDto, value));
  }

  it("permite omitir a região", async () => {
    await expect(validar({})).resolves.toHaveLength(0);
  });

  it("aceita uma região informada", async () => {
    await expect(validar({ regiao: "br-sudeste" })).resolves.toHaveLength(0);
  });

  it("rejeita região vazia com mensagem em português", async () => {
    const [erro] = await validar({ regiao: "" });

    expect(erro.property).toBe("regiao");
    expect(Object.values(erro.constraints ?? {})).toEqual([
      "Informe a região ou omita o parâmetro regiao.",
    ]);
  });
});
