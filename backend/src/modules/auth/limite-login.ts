import { ThrottlerModuleOptions } from "@nestjs/throttler";

export const OPCOES_LIMITE_LOGIN: ThrottlerModuleOptions = {
  throttlers: [{ ttl: 60_000, limit: 5 }],
  errorMessage:
    "Muitas tentativas de login. Aguarde um minuto e tente novamente.",
};
