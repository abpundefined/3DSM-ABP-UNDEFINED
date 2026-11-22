const url = process.env.DATABASE_URL ?? "";
let nomeDoBanco = "";

try {
  nomeDoBanco = new URL(url).pathname;
} catch {
  nomeDoBanco = "";
}

if (!nomeDoBanco.endsWith("_e2e")) {
  console.error(
    "Os testes E2E apagam os dados do banco: defina DATABASE_URL apontando para um banco cujo nome termine em _e2e.",
  );
  process.exit(1);
}
