import {
  calcularVariacaoPercentual,
  periodoAnterior,
} from "./variacao-periodo";

describe("Comparação entre períodos", () => {
  it.each([
    [112, 100, 12],
    [95, 100, -5],
    [100, 100, 0],
    [0, 100, -100],
    [100, null, null],
    [100, 0, null],
    [0, 0, null],
  ])("compara %s com %s e retorna %s", (atual, anterior, esperado) => {
    expect(calcularVariacaoPercentual(atual, anterior)).toBe(esperado);
  });

  it.each([
    ["2026-11-01T00:00:00Z", "2026-11-08T00:00:00Z"],
    ["2026-10-01T03:00:00Z", "2026-11-01T02:59:59.999Z"],
    ["2026-03-01T15:22:00Z", "2026-03-02T18:35:12Z"],
  ])("gera janela inclusiva adjacente de mesma duração: %s", (a, b) => {
    const inicio = new Date(a);
    const fim = new Date(b);
    const anterior = periodoAnterior(inicio, fim);
    expect(anterior.fim.getTime()).toBe(inicio.getTime() - 1);
    expect(anterior.fim.getTime() - anterior.inicio.getTime()).toBe(
      fim.getTime() - inicio.getTime(),
    );
  });
});
