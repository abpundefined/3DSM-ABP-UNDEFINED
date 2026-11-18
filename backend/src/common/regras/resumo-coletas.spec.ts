import { resumirColetas } from "./resumo-coletas";

describe("resumirColetas", () => {
  it("devolve taxa nula quando não há coletas", () => {
    expect(resumirColetas([])).toEqual({
      total: 0,
      falhas: 0,
      taxaFalha: null,
    });
  });

  it("calcula a taxa de falha sobre o total de coletas", () => {
    expect(
      resumirColetas([
        { estado: "SUCESSO", quantidade: 6 },
        { estado: "SEM_METRICAS", quantidade: 2 },
        { estado: "FALHA", quantidade: 2 },
      ]),
    ).toEqual({ total: 10, falhas: 2, taxaFalha: 0.2 });
  });

  it("não conta coleta sem métricas como falha", () => {
    expect(resumirColetas([{ estado: "SEM_METRICAS", quantidade: 4 }])).toEqual(
      { total: 4, falhas: 0, taxaFalha: 0 },
    );
  });

  it("devolve taxa 1 quando todas as coletas falharam", () => {
    expect(resumirColetas([{ estado: "FALHA", quantidade: 3 }])).toEqual({
      total: 3,
      falhas: 3,
      taxaFalha: 1,
    });
  });

  it("arredonda a taxa para quatro casas decimais", () => {
    expect(
      resumirColetas([
        { estado: "SUCESSO", quantidade: 2 },
        { estado: "FALHA", quantidade: 1 },
      ]).taxaFalha,
    ).toBe(0.3333);
  });
});
