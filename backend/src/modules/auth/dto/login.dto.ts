import { IsEmail, IsNotEmpty, IsString } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class LoginDto {
  @ApiProperty({ format: "email", example: "gestor@example.com" })
  @IsEmail({}, { message: "Informe um e-mail válido." })
  email!: string;

  @ApiProperty({ format: "password", writeOnly: true })
  @IsString()
  @IsNotEmpty({ message: "Informe a senha." })
  senha!: string;
}
