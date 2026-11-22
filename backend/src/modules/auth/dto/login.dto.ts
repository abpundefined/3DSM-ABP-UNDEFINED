import { IsEmail, IsNotEmpty, IsString, MaxLength } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class LoginDto {
  @ApiProperty({ format: "email", example: "gestor@example.com" })
  @IsEmail({}, { message: "Informe um e-mail válido." })
  email!: string;

  @ApiProperty({ format: "password", writeOnly: true, maxLength: 128 })
  @IsString()
  @IsNotEmpty({ message: "Informe a senha." })
  @MaxLength(128, { message: "A senha deve ter no máximo 128 caracteres." })
  senha!: string;
}
