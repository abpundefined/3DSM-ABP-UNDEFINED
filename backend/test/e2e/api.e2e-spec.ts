import { INestApplication } from "@nestjs/common";
import { Server } from "node:http";
import * as request from "supertest";
import { ApisSimuladas, iniciarApisSimuladas } from "./apis-simuladas";
import { ADMIN_E2E } from "./ambiente";
import {
  criarAppE2E,
  executarCicloDeMonitoramento,
  limparBanco,
} from "./app-e2e";

interface ServicoListado {
  id: number;
  idExterno: string;
  nome: string;
  estadoAtual: string;
  regiaoCodigo: string;
}

const METRICAS_SP = {
  cpu_percent: 40,
  memory_gb: 4,
  disk_gb: 100,
  network_gb: 10,
};
const METRICAS_VA = {
  cpu_percent: 20,
  memory_gb: 2,
  disk_gb: 50,
  network_gb: 0,
};

const energiaKwh = (m: typeof METRICAS_SP) =>
  ((m.cpu_percent / 100) * 0.5 +
    m.memory_gb * 0.375 +
    m.disk_gb * 0.01 +
    m.network_gb * 0.02) /
  1000;

const ENERGIA_SP = energiaKwh(METRICAS_SP);
const ENERGIA_VA = energiaKwh(METRICAS_VA);
const EMISSAO_SP = ENERGIA_SP * 100;
const EMISSAO_VA = ENERGIA_VA * 400;

describe("API com PostgreSQL (e2e)", () => {
  let app: INestApplication;
  let apis: ApisSimuladas;
  let token: string;
  let servicos: Record<string, ServicoListado>;

  const http = () => request(app.getHttpServer() as Server);

  beforeAll(async () => {
    await limparBanco();
    apis = await iniciarApisSimuladas({
      intervaloColetaSegundos: 3600,
      servicos: [
        {
          id: "svc-sp",
          name: "api-pagamentos",
          location: {
            region_code: "br-sudeste",
            country: "Brasil",
            region: "Sudeste",
            city: "São Paulo",
            latitude: -23.55,
            longitude: -46.63,
          },
          metrics_path: "/metrics/svc-sp",
        },
        {
          id: "svc-va",
          name: "worker-relatorios",
          location: {
            region_code: "us-east",
            country: "Estados Unidos",
            region: "Virgínia",
            latitude: 38.03,
            longitude: -78.48,
          },
          metrics_path: "/metrics/svc-va",
        },
        {
          id: "svc-sem",
          name: "worker-email",
          location: {
            region_code: "eu-west",
            country: "Irlanda",
            region: "Leinster",
          },
          metrics_path: "/metrics/svc-sem",
        },
      ],
      metricas: { "svc-sp": METRICAS_SP, "svc-va": METRICAS_VA },
      intensidades: { "br-sudeste": 100, "us-east": 400, "eu-west": 300 },
    });
    app = await criarAppE2E();
  });

  afterAll(async () => {
    await app?.close();
    await apis?.fechar();
    jest.restoreAllMocks();
    await limparBanco();
  });

  it("sobe a aplicação com o banco migrado", async () => {
    await http().get("/").expect(200);
  });

  describe("autenticação", () => {
    it("faz login com o administrador criado no boot", async () => {
      const resposta = await http()
        .post("/auth/login")
        .send(ADMIN_E2E)
        .expect(200);

      token = (resposta.body as { accessToken: string }).accessToken;
      expect(token).toEqual(expect.any(String));
    });

    it("recusa senha errada e e-mail inexistente com a mesma resposta 401", async () => {
      const senhaErrada = await http()
        .post("/auth/login")
        .send({ email: ADMIN_E2E.email, senha: "senha-errada-123" })
        .expect(401);
      const emailInexistente = await http()
        .post("/auth/login")
        .send({ email: "ninguem@greener.local", senha: "senha-errada-123" })
        .expect(401);

      expect((emailInexistente.body as { mensagem: unknown }).mensagem).toEqual(
        (senhaErrada.body as { mensagem: unknown }).mensagem,
      );
    });

    it("valida o corpo do login com 400", async () => {
      await http()
        .post("/auth/login")
        .send({ email: "invalido", senha: "x" })
        .expect(400);
    });
  });

  describe("configuração", () => {
    it("começa com os intervalos padrão", async () => {
      const resposta = await http().get("/configuracao").expect(200);

      expect(resposta.body).toMatchObject({ padrao: true });
    });

    it("exige token para alterar", async () => {
      const novos = {
        intervaloDescobertaSegundos: 600,
        intervaloColetaSegundos: 60,
      };

      await http().put("/configuracao").send(novos).expect(401);
      await http()
        .put("/configuracao")
        .set("Authorization", "Bearer token-invalido")
        .send(novos)
        .expect(401);
    });

    it("altera com token e persiste no banco", async () => {
      await http()
        .put("/configuracao")
        .set("Authorization", `Bearer ${token}`)
        .send({ intervaloDescobertaSegundos: 600, intervaloColetaSegundos: 60 })
        .expect(200);

      const resposta = await http().get("/configuracao").expect(200);
      expect(resposta.body).toMatchObject({
        intervaloDescobertaSegundos: 600,
        intervaloColetaSegundos: 60,
        padrao: false,
      });
    });

    it("recusa valores fora dos limites com 400", async () => {
      await http()
        .put("/configuracao")
        .set("Authorization", `Bearer ${token}`)
        .send({ intervaloDescobertaSegundos: 5, intervaloColetaSegundos: 60 })
        .expect(400);
    });
  });

  describe("descoberta e coleta com as APIs externas simuladas", () => {
    it("exige token para sincronizar os serviços", async () => {
      await http().post("/servicos/sync").expect(401);
    });

    it("sincroniza os serviços da API de descoberta", async () => {
      await http()
        .post("/servicos/sync")
        .set("Authorization", `Bearer ${token}`)
        .expect(201);

      const resposta = await http().get("/servicos").expect(200);
      const lista = resposta.body as ServicoListado[];
      servicos = Object.fromEntries(lista.map((s) => [s.idExterno, s]));

      expect(Object.keys(servicos).sort()).toEqual([
        "svc-sem",
        "svc-sp",
        "svc-va",
      ]);
      expect(servicos["svc-sp"].regiaoCodigo).toBe("br-sudeste");
    });

    it("coleta as métricas, calcula a emissão e classifica os estados", async () => {
      await executarCicloDeMonitoramento(app);

      const resposta = await http().get("/servicos").expect(200);
      const estados = Object.fromEntries(
        (resposta.body as ServicoListado[]).map((s) => [
          s.idExterno,
          s.estadoAtual,
        ]),
      );

      expect(estados).toEqual({
        "svc-sp": "DISPONIVEL",
        "svc-va": "DISPONIVEL",
        "svc-sem": "SEM_METRICAS",
      });
      expect(apis.requisicoes).toEqual(
        expect.arrayContaining([
          "/services",
          "/metrics/svc-sp",
          "/regions/br-sudeste/carbon-intensity",
          "/regions/us-east/carbon-intensity",
        ]),
      );
    });

    it("guarda as coletas consultáveis pela API", async () => {
      const resposta = await http()
        .get(`/coletas/servico/${servicos["svc-sp"].id}/ultima-valida`)
        .expect(200);

      const coleta = (resposta.body as { dados: Record<string, unknown> })
        .dados;
      expect(coleta).toMatchObject({
        servicoId: servicos["svc-sp"].id,
        regiaoCodigoNaColeta: "br-sudeste",
        intervaloColetaSegundos: 3600,
        cpuPercent: 40,
      });
      expect(coleta.energiaKwh).toBeCloseTo(ENERGIA_SP, 10);
      expect(coleta.emissaoGCo2e).toBeCloseTo(EMISSAO_SP, 8);
    });
  });

  describe("análises do período", () => {
    it("GET /indicadores soma energia e emissão das coletas calculadas", async () => {
      const resposta = await http()
        .get("/indicadores")
        .query({ periodo: "24h" })
        .expect(200);
      const corpo = resposta.body as {
        energiaTotalKwh: number;
        emissaoTotalGCo2e: number;
        coletasCalculadas: number;
        servicos: Record<string, number>;
      };

      expect(corpo.coletasCalculadas).toBe(2);
      expect(corpo.energiaTotalKwh).toBeCloseTo(ENERGIA_SP + ENERGIA_VA, 10);
      expect(corpo.emissaoTotalGCo2e).toBeCloseTo(EMISSAO_SP + EMISSAO_VA, 8);
      expect(corpo.servicos).toMatchObject({
        monitorados: 3,
        disponiveis: 2,
        semMetricas: 1,
      });
    });

    it("GET /ranking ordena pela emissão e separa quem não tem dados", async () => {
      const resposta = await http()
        .get("/ranking")
        .query({ metrica: "emissao" })
        .expect(200);
      const corpo = resposta.body as {
        itens: { posicao: number; nome: string; emissaoGCo2e: number }[];
        semDados: { nome: string }[];
      };

      expect(corpo.itens.map((item) => item.nome)).toEqual([
        "worker-relatorios",
        "api-pagamentos",
      ]);
      expect(corpo.itens[0].emissaoGCo2e).toBeCloseTo(EMISSAO_VA, 8);
      expect(corpo.semDados.map((item) => item.nome)).toEqual(["worker-email"]);
    });

    it("GET /ranking recusa métrica inválida com 400", async () => {
      await http().get("/ranking").query({ metrica: "agua" }).expect(400);
    });

    it("GET /comparacao devolve os totais dos serviços no mesmo período", async () => {
      const ids = [servicos["svc-sp"].id, servicos["svc-va"].id];
      const resposta = await http()
        .get("/comparacao")
        .query({ servicos: ids.join(",") })
        .expect(200);
      const corpo = resposta.body as {
        servicos: {
          servicoId: number;
          totais: { emissaoGCo2e: number; coletasValidas: number };
        }[];
      };

      expect(corpo.servicos.map((s) => s.servicoId)).toEqual(ids);
      expect(corpo.servicos[0].totais.emissaoGCo2e).toBeCloseTo(EMISSAO_SP, 8);
      expect(corpo.servicos[1].totais.coletasValidas).toBe(1);
    });

    it("GET /comparacao recusa um único serviço com 400 e id inexistente com 404", async () => {
      await http()
        .get("/comparacao")
        .query({ servicos: String(servicos["svc-sp"].id) })
        .expect(400);
      await http()
        .get("/comparacao")
        .query({ servicos: `${servicos["svc-sp"].id},999` })
        .expect(404);
    });

    it("GET /mapa separa os serviços com e sem coordenadas", async () => {
      const resposta = await http().get("/mapa").expect(200);
      const corpo = resposta.body as {
        servicos: { nome: string; totais: { emissaoGCo2e: number } }[];
        semCoordenadas: { nome: string }[];
      };

      expect(corpo.servicos.map((s) => s.nome).sort()).toEqual([
        "api-pagamentos",
        "worker-relatorios",
      ]);
      expect(corpo.semCoordenadas.map((s) => s.nome)).toEqual(["worker-email"]);
    });

    it("recusa período inválido com 400 nas rotas de análise", async () => {
      for (const rota of ["/indicadores", "/ranking", "/mapa"]) {
        await http()
          .get(rota)
          .query({ periodo: "24h", inicio: "2026-11-01T00:00:00Z" })
          .expect(400);
      }
    });
  });
});
