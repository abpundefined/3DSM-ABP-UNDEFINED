import { Logger } from "@nestjs/common";
import { CarbonApiService } from "./carbon-api.service";

describe("CarbonApiService", () => {
  const originalApiUrl = process.env.CARBON_API_URL;
  let fetchMock: jest.SpiedFunction<typeof fetch>;

  beforeEach(() => {
    process.env.CARBON_API_URL = "https://carbon.unilaunch.org/";
    fetchMock = jest.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ carbon_intensity_gco2e_per_kwh: 85 }),
    } as Response);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
    if (originalApiUrl === undefined) {
      delete process.env.CARBON_API_URL;
    } else {
      process.env.CARBON_API_URL = originalApiUrl;
    }
  });

  it("requests the documented region intensity endpoint", async () => {
    const service = new CarbonApiService();

    await expect(service.obterIntensidadeCarbono("br-sudeste")).resolves.toBe(
      85,
    );

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(
      "https://carbon.unilaunch.org/regions/br-sudeste/carbon-intensity",
    );
    expect(init?.signal).toBeInstanceOf(AbortSignal);
  });

  it("codifica o código da região na URL", async () => {
    const service = new CarbonApiService();

    await service.obterIntensidadeCarbono("região/sul");

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(
      "https://carbon.unilaunch.org/regions/regi%C3%A3o%2Fsul/carbon-intensity",
    );
    expect(init?.signal).toBeInstanceOf(AbortSignal);
  });

  it("falha sem consultar a API quando CARBON_API_URL não está configurada", async () => {
    delete process.env.CARBON_API_URL;
    const service = new CarbonApiService();

    await expect(service.obterIntensidadeCarbono("br-sudeste")).rejects.toThrow(
      "Falha ao buscar intensidade de carbono para br-sudeste: CARBON_API_URL não configurada.",
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("falha quando a API responde com erro HTTP", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 503 } as Response);
    const service = new CarbonApiService();

    await expect(service.obterIntensidadeCarbono("br-sudeste")).rejects.toThrow(
      "Falha ao buscar intensidade de carbono para br-sudeste: HTTP Status 503",
    );
  });

  it.each([
    ["campo ausente", {}],
    ["valor negativo", { carbon_intensity_gco2e_per_kwh: -1 }],
    ["valor não numérico", { carbon_intensity_gco2e_per_kwh: "85" }],
  ])("rejeita resposta inválida da API: %s", async (_cenario, corpo) => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(corpo),
    } as Response);
    const service = new CarbonApiService();

    await expect(service.obterIntensidadeCarbono("br-sudeste")).rejects.toThrow(
      "Resposta inválida da API de intensidade de carbono.",
    );
  });

  it("falha quando a API está fora do ar", async () => {
    fetchMock.mockRejectedValue(new TypeError("fetch failed"));
    const service = new CarbonApiService();

    await expect(service.obterIntensidadeCarbono("br-sudeste")).rejects.toThrow(
      "Falha ao buscar intensidade de carbono para br-sudeste: fetch failed",
    );
  });

  it("usa uma mensagem genérica quando o erro não é uma instância de Error", async () => {
    fetchMock.mockRejectedValue("conexão recusada");
    const service = new CarbonApiService();

    await expect(service.obterIntensidadeCarbono("br-sudeste")).rejects.toThrow(
      "Falha ao buscar intensidade de carbono para br-sudeste: Erro desconhecido",
    );
  });

  it("aborta a consulta quando a API não responde no tempo limite", async () => {
    jest.useFakeTimers();
    jest.spyOn(Logger.prototype, "error").mockImplementation(() => undefined);
    fetchMock.mockImplementation(
      (_input, init) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener(
            "abort",
            () => reject(new DOMException("Aborted", "AbortError")),
            { once: true },
          );
        }),
    );
    const service = new CarbonApiService();

    const resultado = service.obterIntensidadeCarbono("br-sudeste");
    const verificacao = expect(resultado).rejects.toThrow(
      "Falha ao buscar intensidade de carbono para br-sudeste: Tempo limite de 8000ms excedido ao consultar a API de intensidade de carbono.",
    );

    await jest.advanceTimersByTimeAsync(8000);
    await verificacao;
  });
});
