import { BadRequestException, Injectable, PipeTransform } from "@nestjs/common";

const MAIOR_INT_POSTGRES = 2_147_483_647;

@Injectable()
export class IdInteiroPipe implements PipeTransform<string, number> {
  transform(valor: string): number {
    const id = /^\d+$/.test(valor) ? Number(valor) : Number.NaN;

    if (!Number.isInteger(id) || id < 1 || id > MAIOR_INT_POSTGRES) {
      throw new BadRequestException(
        "ID inválido: use um número inteiro positivo.",
      );
    }

    return id;
  }
}
