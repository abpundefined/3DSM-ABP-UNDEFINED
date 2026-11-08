import { Injectable } from "@nestjs/common";
import type { Usuario } from "../../generated/prisma/client";
import { PrismaService } from "../../database/prisma.service";

@Injectable()
export class UsuariosRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmail(email: string): Promise<Usuario | null> {
    return this.prisma.usuario.findUnique({ where: { email } });
  }
}