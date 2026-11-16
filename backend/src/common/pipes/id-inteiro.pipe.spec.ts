import { BadRequestException } from "@nestjs/common";
import { IdInteiroPipe } from "./id-inteiro.pipe";

describe("IdInteiroPipe", () => {
  const pipe = new IdInteiroPipe();

  it.each([
    ["1", 1],
    ["42", 42],
    ["2147483647", 2147483647],
  ])("aceita %s", (valor, esperado) => {
    expect(pipe.transform(valor)).toBe(esperado);
  });

  it.each([
    "0",
    "-1",
    "1.5",
    "abc",
    "",
    " 1",
    "1e3",
    "2147483648",
    "99999999999",
  ])("rejeita %p com 400", (valor) => {
    expect(() => pipe.transform(valor)).toThrow(
      new BadRequestException("ID inválido: use um número inteiro positivo."),
    );
  });
});
