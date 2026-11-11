import { comTimeout } from "./com-timeout";

describe("comTimeout", () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it("devolve o resultado quando a operação termina antes do limite", async () => {
    await expect(
      comTimeout(1000, "a API de teste", () => Promise.resolve("ok")),
    ).resolves.toBe("ok");
  });

  it("aborta a operação e informa o tempo limite excedido", async () => {
    jest.useFakeTimers();
    let sinalRecebido: AbortSignal | undefined;

    const resultado = comTimeout(5000, "a API de teste", (signal) => {
      sinalRecebido = signal;
      return new Promise<never>((_resolve, reject) => {
        signal.addEventListener(
          "abort",
          () => reject(new DOMException("Aborted", "AbortError")),
          { once: true },
        );
      });
    });
    const verificacao = expect(resultado).rejects.toThrow(
      "Tempo limite de 5000ms excedido ao consultar a API de teste.",
    );

    await jest.advanceTimersByTimeAsync(5000);
    await verificacao;
    expect(sinalRecebido?.aborted).toBe(true);
  });

  it("propaga erros que não são de tempo limite", async () => {
    await expect(
      comTimeout(1000, "a API de teste", () =>
        Promise.reject(new TypeError("fetch failed")),
      ),
    ).rejects.toThrow("fetch failed");
  });

  it("cancela o temporizador quando a operação termina", async () => {
    jest.useFakeTimers();

    await comTimeout(1000, "a API de teste", () => Promise.resolve("ok"));

    expect(jest.getTimerCount()).toBe(0);
  });
});
