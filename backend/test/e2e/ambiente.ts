export const PORTA_APIS_SIMULADAS = 45999;

export const ADMIN_E2E = {
  email: "admin.e2e@greener.local",
  senha: "SenhaDoTesteE2E#2026",
};

export function urlDoBancoDeTeste(): string {
  const url = process.env.DATABASE_URL;
  if (!url || !new URL(url).pathname.endsWith("_e2e")) {
    throw new Error(
      "Os testes E2E apagam os dados do banco: defina DATABASE_URL apontando para um banco cujo nome termine em _e2e.",
    );
  }

  return url;
}

urlDoBancoDeTeste();

const apisSimuladas = `http://127.0.0.1:${PORTA_APIS_SIMULADAS}`;

Object.assign(process.env, {
  METRICS_API_URL: apisSimuladas,
  CARBON_API_URL: apisSimuladas,
  ADMIN_EMAIL: ADMIN_E2E.email,
  ADMIN_PASSWORD: ADMIN_E2E.senha,
  ADMIN_NOME: "Administrador E2E",
  JWT_SECRET: "segredo-dos-testes-e2e-com-mais-de-32-caracteres",
  JWT_EXPIRES_IN: "3600",
});
