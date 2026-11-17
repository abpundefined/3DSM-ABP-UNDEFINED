import { RegistroIntegracoesService } from "./registro-integracoes.service";

describe("RegistroIntegracoesService", () => {
  let registro: RegistroIntegracoesService;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-11-17T12:00:00.000Z"));
    registro = new RegistroIntegracoesService();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("não tem registro antes da primeira consulta", () => {
    expect(registro.obter("agregador")).toBeNull();
    expect(registro.obter("apiCarbono")).toBeNull();
  });

  it("registra uma consulta bem-sucedida e devolve o resultado", async () => {
    const resultado = await registro.medir("agregador", () => {
      jest.advanceTimersByTime(250);
      return Promise.resolve("ok");
    });

    expect(resultado).toBe("ok");
    expect(registro.obter("agregador")).toEqual({
      ultimaConsultaEm: new Date("2026-11-17T12:00:00.250Z"),
      sucesso: true,
      tempoRespostaMs: 250,
      mensagemErro: null,
      ultimoSucessoEm: new Date("2026-11-17T12:00:00.250Z"),
    });
  });

  it("registra a falha e repassa o erro original", async () => {
    const erro = new Error("HTTP Status 503");

    await expect(
      registro.medir("agregador", () => {
        jest.advanceTimersByTime(80);
        return Promise.reject(erro);
      }),
    ).rejects.toBe(erro);

    expect(registro.obter("agregador")).toEqual({
      ultimaConsultaEm: new Date("2026-11-17T12:00:00.080Z"),
      sucesso: false,
      tempoRespostaMs: 80,
      mensagemErro: "HTTP Status 503",
      ultimoSucessoEm: null,
    });
  });

  it("mantém o último sucesso quando a consulta seguinte falha", async () => {
    await registro.medir("apiCarbono", () => Promise.resolve(1));
    jest.advanceTimersByTime(60_000);

    await expect(
      registro.medir("apiCarbono", () =>
        Promise.reject(new Error("Tempo limite excedido")),
      ),
    ).rejects.toThrow();

    const atual = registro.obter("apiCarbono");
    expect(atual?.sucesso).toBe(false);
    expect(atual?.ultimaConsultaEm).toEqual(
      new Date("2026-11-17T12:01:00.000Z"),
    );
    expect(atual?.ultimoSucessoEm).toEqual(
      new Date("2026-11-17T12:00:00.000Z"),
    );
  });

  it("limpa a mensagem de erro quando a consulta volta a funcionar", async () => {
    await expect(
      registro.medir("agregador", () =>
        Promise.reject(new Error("fora do ar")),
      ),
    ).rejects.toThrow();
    await registro.medir("agregador", () => Promise.resolve(1));

    expect(registro.obter("agregador")?.mensagemErro).toBeNull();
    expect(registro.obter("agregador")?.sucesso).toBe(true);
  });

  it("usa uma mensagem padrão quando o erro não é uma instância de Error", async () => {
    const operacao = jest.fn().mockRejectedValue("texto solto");

    await expect(
      registro.medir("agregador", operacao as () => Promise<never>),
    ).rejects.toBe("texto solto");

    expect(registro.obter("agregador")?.mensagemErro).toBe("Erro desconhecido");
  });

  it("mantém as integrações independentes entre si", async () => {
    await registro.medir("agregador", () => Promise.resolve(1));

    expect(registro.obter("apiCarbono")).toBeNull();
  });
});
