const TAMANHO_MINIMO_JWT_SECRET = 32;
const TAMANHO_MINIMO_ADMIN_PASSWORD = 12;
const JWT_SECRET_EXEMPLO = "change-me-to-a-strong-secret";
const ADMIN_PASSWORD_EXEMPLO = "troque-esta-senha";

function validarJwtSecret(valor: unknown): string | null {
  if (typeof valor !== "string" || valor.length === 0) {
    return "JWT_SECRET não definido.";
  }
  if (valor === JWT_SECRET_EXEMPLO) {
    return "JWT_SECRET usa o valor de exemplo do .env.example.";
  }
  if (valor.length < TAMANHO_MINIMO_JWT_SECRET) {
    return `JWT_SECRET deve ter pelo menos ${TAMANHO_MINIMO_JWT_SECRET} caracteres.`;
  }
  return null;
}

function validarAdminPassword(valor: unknown): string | null {
  if (typeof valor !== "string" || valor.length === 0) {
    return null;
  }
  if (valor === ADMIN_PASSWORD_EXEMPLO) {
    return "ADMIN_PASSWORD usa o valor de exemplo do .env.example.";
  }
  if (valor.length < TAMANHO_MINIMO_ADMIN_PASSWORD) {
    return `ADMIN_PASSWORD deve ter pelo menos ${TAMANHO_MINIMO_ADMIN_PASSWORD} caracteres.`;
  }
  return null;
}

export function validarAmbiente(
  config: Record<string, unknown>,
): Record<string, unknown> {
  const problemas = [
    validarJwtSecret(config.JWT_SECRET),
    validarAdminPassword(config.ADMIN_PASSWORD),
  ].filter((problema): problema is string => problema !== null);

  if (problemas.length > 0) {
    throw new Error(
      `Configuração de ambiente inválida:\n- ${problemas.join("\n- ")}`,
    );
  }

  return config;
}
