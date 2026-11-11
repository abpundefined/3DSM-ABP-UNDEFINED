import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import type { Request } from "express";
import type { TokenPayload } from "../auth.service";

export type RequisicaoAutenticada = Request & { usuario?: TokenPayload };

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequisicaoAutenticada>();
    const [tipo, token] = request.headers.authorization?.split(" ") ?? [];

    if (tipo !== "Bearer" || !token) {
      throw new UnauthorizedException("Token de acesso ausente.");
    }

    try {
      request.usuario = await this.jwtService.verifyAsync<TokenPayload>(token);
    } catch {
      throw new UnauthorizedException("Token inválido ou expirado.");
    }

    return true;
  }
}
