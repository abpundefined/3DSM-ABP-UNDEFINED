import { Injectable } from "@nestjs/common";
import type { Usuario } from "../../generated/prisma/client";
import { PrismaService } from "../../database/prisma.service";

export interface NovoUsuario {
  nome: string;
  email: string;
  senhaHash: string;
}

@Injectable()
export class UsuariosRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmail(email: string): Promise<Usuario | null> {
    return this.prisma.usuario.findUnique({ where: { email } });
  }

  async create(data: NovoUsuario): Promise<Usuario> {
    return this.prisma.usuario.create({ data });
  }
}