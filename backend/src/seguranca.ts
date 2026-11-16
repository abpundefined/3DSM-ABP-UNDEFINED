import { INestApplication } from "@nestjs/common";
import helmet from "helmet";

const ORIGEM_PADRAO = "http://localhost:5173";

export function lerOrigensPermitidas(valor: string | undefined): string[] {
  const origens = (valor ?? "")
    .split(",")
    .map((origem) => origem.trim())
    .filter((origem) => origem.length > 0);

  return origens.length > 0 ? origens : [ORIGEM_PADRAO];
}

export function configurarSeguranca(
  app: INestApplication,
  origensPermitidas: string[],
): void {
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: { upgradeInsecureRequests: null },
      },
    }),
  );
  app.enableCors({ origin: origensPermitidas });
}
